use crate::crypto;

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Manager;

const API_GATEWAY_URL: &str = "https://r1nyt6hcze.execute-api.ap-south-1.amazonaws.com/default/lfi_backuprestore_gateway";
const AUTH_HEADER: &str = "x-rhaegar-auth";
const NETWORK_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub key: String,
    pub last_modified: String,
}

#[derive(Serialize, Deserialize)]
pub struct EncryptedBackup {
    pub salt: String,
    pub nonce: String,
    pub data: String,
}

pub struct BackupState {
    pub _last_backup_check: Mutex<Option<String>>,
}

fn get_env_vars() -> (String, String, String) {
    let auth_secret = option_env!("BACKUP_AUTH_SECRETS")
        .map(|s| s.to_string())
        .unwrap_or_default();
    let region = option_env!("MY_AWS_REGION")
        .map(|s| s.to_string())
        .unwrap_or_else(|| "ap-south-1".to_string());
    let bucket = option_env!("AWS_S3_BUCKET")
        .map(|s| s.to_string())
        .unwrap_or_default();
    (auth_secret, region, bucket)
}

fn get_gateway_url() -> String {
    option_env!("API_GATEWAY_URL")
        .map(|s| s.to_string())
        .unwrap_or_else(|| API_GATEWAY_URL.to_string())
}

pub fn is_connected(_app_handle: &AppHandle) -> bool {
    let (auth_secret, _, _) = get_env_vars();
    !auth_secret.is_empty()
}

pub async fn vacuum_database(app_handle: &AppHandle) -> Result<()> {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    if !db_path.exists() {
        return Err(anyhow!("Database file not found at {:?}", db_path));
    }

    let conn = crate::db::open_db(app_handle).map_err(|e| anyhow!("Database connection failed: {}", e))?;
    
    conn.execute_batch("VACUUM").map_err(|e| {
        anyhow!("VACUUM failed - database may be locked or in use. Error: {}", e)
    })?;
    
    Ok(())
}

pub async fn upload_backup(app_handle: AppHandle, password: String) -> Result<String> {
    let (auth_secret, region, bucket) = get_env_vars();
    
    if auth_secret.is_empty() {
        return Err(anyhow!("Backup authentication not configured."));
    }

    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    if !db_path.exists() {
        return Err(anyhow!("Database file not found at {:?}", db_path));
    }

    vacuum_database(&app_handle).await?;

    // Read database file
    let file_content = fs::read(&db_path)?;
    
    // Encrypt with password using crypto module
    let encrypted_json = crypto::encrypt_to_string(&file_content, &password).map_err(|e| anyhow!("Encryption failed: {}", e))?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let file_name = format!("backups/littleflower_backup_{}.enc", timestamp);

    let client = Client::builder()
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

    let presigned_url = get_presigned_url(&client, &file_name, &auth_secret, &region, &bucket).await?;
    
    let response = client.put(&presigned_url)
        .header("Content-Type", "application/json")
        .body(encrypted_json)
        .send()
        .await
        .map_err(|e| anyhow!("Network error during S3 upload: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow!("S3 upload failed {}: {}", status, body));
    }

    Ok(format!("Backup encrypted and uploaded: {}", file_name))
}

async fn get_presigned_url(client: &Client, file_name: &str, auth_secret: &str, region: &str, bucket: &str) -> Result<String> {
    let gateway_url = get_gateway_url();
    
    let response = client.post(&gateway_url)
        .header("Content-Type", "application/json")
        .header(AUTH_HEADER, auth_secret)
        .json(&serde_json::json!({
            "action": "getUploadUrl",
            "fileName": file_name,
            "region": region,
            "bucket": bucket
        }))
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("Failed to connect to API gateway: {}", e))?;

    if response.status().as_u16() == 401 || response.status().as_u16() == 403 {
        return Err(anyhow!("Unauthorized: Invalid authentication credentials."));
    }

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow!("API gateway returned error {}: {}", status, body));
    }

    #[derive(serde::Deserialize)]
    struct PresignedResponse {
        #[serde(alias = "uploadUrl", alias = "upload_url")]
        upload_url: String,
    }

    let presigned: PresignedResponse = response.json()
        .await
        .map_err(|e| anyhow!("Failed to parse presigned URL response: {}", e))?;

    Ok(presigned.upload_url)
}

async fn get_download_url(client: &Client, file_name: &str, auth_secret: &str, region: &str, bucket: &str) -> Result<String> {
    let gateway_url = get_gateway_url();
    
    let response = client.post(&gateway_url)
        .header("Content-Type", "application/json")
        .header(AUTH_HEADER, auth_secret)
        .json(&serde_json::json!({
            "action": "getDownloadUrl",
            "fileName": file_name,
            "region": region,
            "bucket": bucket
        }))
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("Failed to get download URL: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("Failed to get download URL: {}", response.status()));
    }

    #[derive(serde::Deserialize)]
    struct DownloadResponse {
        #[serde(alias = "downloadUrl", alias = "download_url")]
        download_url: String,
    }

    let download: DownloadResponse = response.json()
        .await
        .map_err(|e| anyhow!("Failed to parse download URL response: {}", e))?;

    Ok(download.download_url)
}

pub async fn restore_backup(_app_handle: AppHandle) -> Result<String> {
    Ok("Please use the restore modal to select a backup.".to_string())
}

pub async fn restore_specific_backup(app_handle: AppHandle, file_name: String, password: String) -> Result<String> {
    let (auth_secret, region, bucket) = get_env_vars();
    
    if auth_secret.is_empty() {
        return Err(anyhow!("Backup authentication not configured."));
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

    let download_url = get_download_url(&client, &file_name, &auth_secret, &region, &bucket).await?;
    
    let response = client.get(&download_url)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to download backup: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("Backup not found: {}", response.status()));
    }

    let encrypted_json = response.text()
        .await
        .map_err(|e| anyhow!("Failed to read backup data: {}", e))?;

    // Decrypt using crypto module
    let plaintext = crypto::decrypt_from_string(&encrypted_json, &password).map_err(|e| anyhow!("Decryption failed: {}", e))?;

    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    // Backup current file
    let backup_local = app_dir.join("littleflower.db.backup");
    if db_path.exists() {
        let _ = fs::remove_file(&backup_local);
        fs::copy(&db_path, &backup_local)?;
    }

    // Write the restored database
    fs::write(&db_path, &plaintext).map_err(|e| anyhow!("Failed to write database: {}", e))?;

    Ok(format!("Restored '{}' successfully. Please restart the application.", file_name))
}

pub async fn list_backups() -> Result<Vec<BackupInfo>> {
    let (auth_secret, region, bucket) = get_env_vars();
    
    if auth_secret.is_empty() {
        return Err(anyhow!("Backup authentication not configured."));
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

    let gateway_url = get_gateway_url();
    
    let response = client.post(&gateway_url)
        .header("Content-Type", "application/json")
        .header(AUTH_HEADER, auth_secret)
        .json(&serde_json::json!({
            "action": "listBackups",
            "region": region,
            "bucket": bucket
        }))
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("Failed to get backup list: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("Failed to list backups: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct S3BackupItem {
        #[serde(rename = "Key", alias = "key")]
        key: Option<String>,
        #[serde(rename = "LastModified", alias = "last_modified")]
        last_modified: Option<String>,
    }

    let backups: Vec<S3BackupItem> = response.json()
        .await
        .map_err(|e| anyhow!("Failed to parse backup list: {}", e))?;

    let mut result: Vec<BackupInfo> = backups
        .into_iter()
        .filter(|b| b.key.as_ref().map(|k| k.contains("littleflower_backup")).unwrap_or(false))
        .map(|b| BackupInfo {
            key: b.key.unwrap_or_default(),
            last_modified: b.last_modified.unwrap_or_default(),
        })
        .collect();

    result.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(result)
}

pub async fn get_latest_backup_info() -> Result<String> {
    let backups = list_backups().await?;
    if let Some(latest) = backups.first() {
        Ok(latest.last_modified.clone())
    } else {
        Err(anyhow!("No backups found"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let password = "test_password_123";
        let data = b"Hello, World! This is a test message.";
        
        let encrypted = crypto::encrypt(data, password).unwrap();
        let decrypted = crypto::decrypt(&encrypted, password).unwrap();
        
        assert_eq!(data.to_vec(), decrypted);
    }

    #[test]
    fn test_wrong_password() {
        let password = "correct_password";
        let wrong_password = "wrong_password";
        let data = b"Secret data";
        
        let encrypted = crypto::encrypt(data, password).unwrap();
        let result = crypto::decrypt(&encrypted, wrong_password);
        
        assert!(result.is_err());
    }
}
