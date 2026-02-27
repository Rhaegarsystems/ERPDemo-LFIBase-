use anyhow::{anyhow, Result};
use keyring::Entry;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use tiny_http::{Response, Server};
use url::Url;
use dotenvy::dotenv;
use std::env;

// --- OAuth Configuration ---
const REDIRECT_PORT: u16 = 8080;
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE: &str = "https://www.googleapis.com/auth/drive.file";

fn get_oauth_config() -> Result<(String, String)> {
    dotenv().ok();
    let client_id = env::var("GOOGLE_CLIENT_ID")
        .map_err(|_| anyhow!("GOOGLE_CLIENT_ID not found in .env"))?;
    let client_secret = env::var("GOOGLE_CLIENT_SECRET")
        .map_err(|_| anyhow!("GOOGLE_CLIENT_SECRET not found in .env"))?;
    Ok((client_id, client_secret))
}

// --- Secure Storage ---
const SERVICE_NAME: &str = "LittleFlowerIndustries-Backup";
const REFRESH_TOKEN_ACCOUNT: &str = "google_drive_refresh_token";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
}

// Global state to store the access token in memory
pub struct BackupState {
    pub access_token: Mutex<Option<String>>,
}

// --- OAuth Flow ---

pub fn start_oauth_flow(app_handle: AppHandle) -> Result<String> {
    let (client_id, _) = get_oauth_config()?;
    let redirect_uri = format!("http://localhost:{}", REDIRECT_PORT);
    
    // 1. Start the local server
    let server = Server::http(format!("127.0.0.1:{}", REDIRECT_PORT))
        .map_err(|e| anyhow!("Could not start local server: {}", e))?;

    // 2. Build the Auth URL
    let auth_url = Url::parse_with_params(AUTH_URL, &[
        ("client_id", client_id.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("response_type", "code"),
        ("scope", DRIVE_SCOPE),
        ("access_type", "offline"),
        ("prompt", "consent"),
    ])?;

    // 3. Open the browser
    webbrowser::open(auth_url.as_str())?;

    // 4. Wait for the code
    if let Some(request) = server.recv_timeout(std::time::Duration::from_secs(120))? {
        let url = Url::parse(&format!("http://localhost{}", request.url()))?;
        let code = url.query_pairs()
            .find(|(key, _)| key == "code")
            .map(|(_, value)| value.to_string())
            .ok_or_else(|| anyhow!("No authorization code found in redirect"))?;

        // Send a success response to the browser
        let response = Response::from_string("<html><body style='font-family: sans-serif; text-align: center; padding: 50px;'><h1>Successfully Connected!</h1><p>You can close this tab and return to the application.</p></body></html>")
            .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap());
        request.respond(response)?;

        // 5. Exchange code for tokens
        let tokens = exchange_code_for_tokens(&code, &redirect_uri)?;
        
        // 6. Store refresh token securely
        let refresh_token = tokens.refresh_token.ok_or_else(|| {
            anyhow!("No refresh token received. Please disconnect this app in your Google Account security settings and try again.")
        })?;
        
        store_token(&app_handle, &refresh_token)?;

        // Store access token in state
        let state = app_handle.state::<BackupState>();
        let mut access_token_lock = state.access_token.lock().unwrap();
        *access_token_lock = Some(tokens.access_token);

        return Ok("Successfully connected to Google Drive".to_string());
    }

    Err(anyhow!("Authentication timed out"))
}

fn exchange_code_for_tokens(code: &str, redirect_uri: &str) -> Result<OAuthTokens> {
    let (client_id, client_secret) = get_oauth_config()?;
    let client = Client::new();
    let res = client.post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri),
        ])
        .send()?;

    if !res.status().is_success() {
        let err_text = res.text()?;
        return Err(anyhow!("Token exchange failed: {}", err_text));
    }

    let tokens: OAuthTokens = res.json()?;
    Ok(tokens)
}

// --- Token Management ---

fn store_token(app_handle: &AppHandle, refresh_token: &str) -> Result<()> {
    // 1. Try OS Keyring
    let entry = Entry::new(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT)?;
    let _ = entry.set_password(refresh_token);

    // 2. Always save to fallback file for stability on Linux
    let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
    fs::write(app_dir.join("refresh_token.bin"), refresh_token)?;
    
    Ok(())
}

fn get_stored_refresh_token(app_handle: &AppHandle) -> Result<String> {
    // 1. Try OS Keyring
    let entry = Entry::new(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT)?;
    if let Ok(token) = entry.get_password() {
        return Ok(token);
    }

    // 2. Try Fallback File
    let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
    let token_file = app_dir.join("refresh_token.bin");
    if token_file.exists() {
        return Ok(fs::read_to_string(token_file)?);
    }

    Err(anyhow!("No refresh token found"))
}

pub fn delete_stored_token(app_handle: &AppHandle) -> Result<()> {
    // Clear memory
    let state = app_handle.state::<BackupState>();
    let mut access_token_lock = state.access_token.lock().unwrap();
    *access_token_lock = None;

    // Clear Keyring
    let entry = Entry::new(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT)?;
    let _ = entry.delete_credential();

    // Clear Fallback File
    let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
    let _ = fs::remove_file(app_dir.join("refresh_token.bin"));

    Ok(())
}

pub fn is_connected(app_handle: &AppHandle) -> bool {
    // Check memory first
    let state = app_handle.state::<BackupState>();
    if state.access_token.lock().unwrap().is_some() {
        return true;
    }
    
    // Then check storage
    get_stored_refresh_token(app_handle).is_ok()
}

fn get_refreshed_access_token(app_handle: &AppHandle) -> Result<String> {
    let (client_id, client_secret) = get_oauth_config()?;
    let refresh_token = get_stored_refresh_token(app_handle)?;
    let client = Client::new();
    let res = client.post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("refresh_token", refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()?;

    if !res.status().is_success() {
        let err_text = res.text()?;
        return Err(anyhow!("Token refresh failed: {}", err_text));
    }

    let tokens: OAuthTokens = res.json()?;
    Ok(tokens.access_token)
}

pub fn get_valid_access_token(app_handle: &AppHandle) -> Result<String> {
    let state = app_handle.state::<BackupState>();
    
    // 1. First check if we already have it in memory and use it
    {
        let access_token_lock = state.access_token.lock().unwrap();
        if let Some(token) = &*access_token_lock {
            return Ok(token.clone());
        }
    }

    // 2. If not in memory, we must refresh it using the stored refresh token
    let token = get_refreshed_access_token(app_handle)?;
    
    // Store it in memory for subsequent calls
    let mut access_token_lock = state.access_token.lock().unwrap();
    *access_token_lock = Some(token.clone());
    
    Ok(token)
}

// --- Drive Operations ---

pub fn upload_backup(app_handle: AppHandle) -> Result<String> {
    let access_token = get_valid_access_token(&app_handle)?;
    let client = Client::new();
    
    // 1. Get/Create the backup folder
    let folder_name = "LFI Backup";
    let folder_id = get_or_create_folder(&client, &access_token, folder_name)?;

    // 2. Get DB path
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    if !db_path.exists() {
        return Err(anyhow!("Database file not found at {:?}", db_path));
    }

    let file_content = fs::read(&db_path)?;
    let file_name = "littleflower_backup.db";

    // 3. Check if file already exists inside the backup folder
    let existing_id = find_file_in_folder(&client, &access_token, file_name, &folder_id)?;

    if let Some(file_id) = existing_id {
        // Update existing file
        let url = format!("https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media", file_id);
        let res = client.patch(&url)
            .bearer_auth(&access_token)
            .body(file_content)
            .send()?;
        
        if !res.status().is_success() {
            return Err(anyhow!("Failed to update backup file: {}", res.text()?));
        }
    } else {
        // Create new file with parent folder
        let metadata = serde_json::json!({
            "name": file_name,
            "description": "Backup for Little Flower Industries",
            "parents": [folder_id]
        });

        let form = reqwest::blocking::multipart::Form::new()
            .part("metadata", reqwest::blocking::multipart::Part::text(metadata.to_string())
                .mime_str("application/json")?)
            .part("media", reqwest::blocking::multipart::Part::bytes(file_content)
                .mime_str("application/x-sqlite3")?);

        let res = client.post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            .bearer_auth(&access_token)
            .multipart(form)
            .send()?;

        if !res.status().is_success() {
            return Err(anyhow!("Failed to upload backup file: {}", res.text()?));
        }
    }

    Ok("Backup uploaded successfully to 'LFI Backup' folder on Google Drive".to_string())
}

pub fn restore_backup(app_handle: AppHandle) -> Result<String> {
    let access_token = get_valid_access_token(&app_handle)?;
    let client = Client::new();
    let folder_name = "LFI Backup";
    let file_name = "littleflower_backup.db";

    // 1. Find the backup folder
    let folder_id = find_item_on_drive(&client, &access_token, folder_name, true)?
        .ok_or_else(|| anyhow!("No backup folder found on Google Drive"))?;

    // 2. Find file inside the folder
    let file_id = find_file_in_folder(&client, &access_token, file_name, &folder_id)?
        .ok_or_else(|| anyhow!("No backup file found in 'LFI Backup' folder"))?;

    // 3. Download file
    let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", file_id);
    let mut res = client.get(&url)
        .bearer_auth(&access_token)
        .send()?;

    if !res.status().is_success() {
        return Err(anyhow!("Failed to download backup: {}", res.text()?));
    }

    let mut buffer = Vec::new();
    res.read_to_end(&mut buffer)?;

    // 4. Save to local path (overwrite)
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    // Backup the current local file just in case
    let backup_local = app_dir.join("littleflower.db.old");
    if db_path.exists() {
        fs::copy(&db_path, &backup_local)?;
    }

    fs::write(&db_path, buffer)?;

    Ok("Data restored successfully. Please restart the application for changes to take effect.".to_string())
}

fn get_or_create_folder(client: &Client, access_token: &str, name: &str) -> Result<String> {
    if let Some(id) = find_item_on_drive(client, access_token, name, true)? {
        return Ok(id);
    }

    // Create folder
    let metadata = serde_json::json!({
        "name": name,
        "mimeType": "application/vnd.google-apps.folder"
    });

    let res = client.post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .json(&metadata)
        .send()?;

    if !res.status().is_success() {
        return Err(anyhow!("Failed to create folder: {}", res.text()?));
    }

    let json: serde_json::Value = res.json()?;
    json["id"].as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| anyhow!("Failed to get created folder ID"))
}

fn find_file_in_folder(client: &Client, access_token: &str, name: &str, folder_id: &str) -> Result<Option<String>> {
    let url = "https://www.googleapis.com/drive/v3/files";
    let q = format!("name = '{}' and '{}' in parents and trashed = false", name, folder_id);
    
    let res = client.get(url)
        .bearer_auth(access_token)
        .query(&[("q", q.as_str()), ("fields", "files(id, name)")])
        .send()?;

    if !res.status().is_success() {
        return Err(anyhow!("Failed to search Drive: {}", res.text()?));
    }

    let json: serde_json::Value = res.json()?;
    let files = json["files"].as_array().ok_or_else(|| anyhow!("Invalid response from Drive API"))?;
    
    if files.is_empty() {
        Ok(None)
    } else {
        Ok(files[0]["id"].as_str().map(|s| s.to_string()))
    }
}

fn find_item_on_drive(client: &Client, access_token: &str, name: &str, is_folder: bool) -> Result<Option<String>> {
    let url = "https://www.googleapis.com/drive/v3/files";
    let mut q = format!("name = '{}' and trashed = false", name);
    if is_folder {
        q.push_str(" and mimeType = 'application/vnd.google-apps.folder'");
    }
    
    let res = client.get(url)
        .bearer_auth(access_token)
        .query(&[("q", q.as_str()), ("fields", "files(id, name)")])
        .send()?;

    if !res.status().is_success() {
        return Err(anyhow!("Failed to search Drive: {}", res.text()?));
    }

    let json: serde_json::Value = res.json()?;
    let files = json["files"].as_array().ok_or_else(|| anyhow!("Invalid response from Drive API"))?;
    
    if files.is_empty() {
        Ok(None)
    } else {
        Ok(files[0]["id"].as_str().map(|s| s.to_string()))
    }
}
