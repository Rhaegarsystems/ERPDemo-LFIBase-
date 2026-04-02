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

    let conn = crate::db::open_encrypted_conn(app_handle).map_err(|e| anyhow!("Database connection failed: {}", e))?;
    
    conn.execute_batch("VACUUM").map_err(|e| {
        anyhow!("VACUUM failed - database may be locked or in use. Close any other connections and try again. Error: {}", e)
    })?;
    
    Ok(())
}

pub async fn upload_backup(app_handle: AppHandle) -> Result<String> {
    let (auth_secret, region, bucket) = get_env_vars();
    
    if auth_secret.is_empty() {
        return Err(anyhow!("Backup authentication not configured. Please set BACKUP_AUTH_SECRETS in environment."));
    }

    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    let key_path = app_dir.join("secret.key");
    
    if !db_path.exists() {
        return Err(anyhow!("Database file not found at {:?}", db_path));
    }

    vacuum_database(&app_handle).await?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let file_name = format!("backups/littleflower_backup_{}.db", timestamp);

    let client = Client::builder()
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

    let presigned_url = get_presigned_url(&client, &file_name, &auth_secret, &region, &bucket).await?;
    
    let file_content = fs::read(&db_path)?;
    
    let response = client.put(&presigned_url)
        .header("Content-Type", "application/octet-stream")
        .body(file_content)
        .send()
        .await
        .map_err(|e| anyhow!("Network timeout or error during S3 upload: {}. Please check your internet connection.", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow!("S3 upload failed with status {}: {}. Contact administrator if this persists.", status, body));
    }

    if key_path.exists() {
        let key_presigned_url = get_key_presigned_url(&client, &auth_secret, &region, &bucket).await?;
        let key_content = fs::read(&key_path)?;
        
        let response = client.put(&key_presigned_url)
            .header("Content-Type", "application/octet-stream")
            .body(key_content)
            .send()
            .await;
        
        if let Err(e) = response {
            log::warn!("Failed to upload encryption key: {}", e);
        }
    }

    let latest_presigned_url = get_presigned_url(&client, "backups/littleflower_backup_latest.db", &auth_secret, &region, &bucket).await?;
    let file_content_latest = fs::read(&db_path)?;
    
    let response = client.put(&latest_presigned_url)
        .header("Content-Type", "application/octet-stream")
        .body(file_content_latest)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to upload latest backup: {}", e))?;

    if !response.status().is_success() {
        log::warn!("Failed to update latest backup: {}", response.status());
    }

    Ok(format!("Backup uploaded successfully: {}", file_name))
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
        .map_err(|e| anyhow!("Failed to connect to API gateway (timeout or network error): {}", e))?;

    if response.status().as_u16() == 401 || response.status().as_u16() == 403 {
        return Err(anyhow!("Unauthorized: Invalid authentication credentials. Please check BACKUP_AUTH_SECRETS."));
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

async fn get_key_presigned_url(client: &Client, auth_secret: &str, region: &str, bucket: &str) -> Result<String> {
    let gateway_url = get_gateway_url();
    
    let response = client.post(&gateway_url)
        .header("Content-Type", "application/json")
        .header(AUTH_HEADER, auth_secret)
        .json(&serde_json::json!({
            "action": "getUploadUrl",
            "fileName": "secret.key",
            "region": region,
            "bucket": bucket
        }))
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("Failed to get key presigned URL from API gateway: {}", e))?;

    if response.status().as_u16() == 401 || response.status().as_u16() == 403 {
        return Err(anyhow!("Unauthorized: Invalid authentication credentials for key."));
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
        .map_err(|e| anyhow!("Failed to parse key presigned URL response: {}", e))?;

    Ok(presigned.upload_url)
}

pub async fn restore_backup(app_handle: AppHandle) -> Result<String> {
    let (auth_secret, region, bucket) = get_env_vars();
    
    if auth_secret.is_empty() {
        return Err(anyhow!("Backup authentication not configured. Please set BACKUP_AUTH_SECRETS in environment."));
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;
    
    let key_download_url = get_key_download_url(&client, &auth_secret, &region, &bucket).await?;
    
    if let Ok(response) = client.get(&key_download_url).send().await {
        if response.status().is_success() {
            if let Ok(key_data) = response.bytes().await {
                let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
                let key_path = app_dir.join("secret.key");
                fs::write(&key_path, key_data).ok();
                
                crate::db::clear_cached_key();
            }
        }
    }

    let download_url = get_download_url(&client, "backups/littleflower_backup_latest.db", &auth_secret, &region, &bucket).await?;
    
    let response = client.get(&download_url)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to download backup: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("No backup found in Cloud storage: {}", response.status()));
    }

    let data = response.bytes()
        .await
        .map_err(|e| anyhow!("Failed to read backup data: {}", e))?;

    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    let backup_local = app_dir.join("littleflower.db.old");
    if db_path.exists() {
        fs::copy(&db_path, &backup_local)?;
    }

    fs::write(&db_path, data)?;

    Ok("Data restored successfully from Cloud storage. Please restart the application for changes to take effect.".to_string())
}

pub async fn restore_specific_backup(app_handle: AppHandle, file_name: String) -> Result<String> {
    let (auth_secret, region, bucket) = get_env_vars();
    
    if auth_secret.is_empty() {
        return Err(anyhow!("Backup authentication not configured. Please set BACKUP_AUTH_SECRETS in environment."));
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

    // Download key first
    let key_download_url = get_key_download_url(&client, &auth_secret, &region, &bucket).await?;
    
    if let Ok(response) = client.get(&key_download_url).send().await {
        if response.status().is_success() {
            if let Ok(key_data) = response.bytes().await {
                let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
                let key_path = app_dir.join("secret.key");
                fs::write(&key_path, key_data).ok();
                crate::db::clear_cached_key();
            }
        }
    }

    // Download specific backup
    let download_url = get_download_url(&client, &file_name, &auth_secret, &region, &bucket).await?;
    
    let response = client.get(&download_url)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to download backup: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("Backup not found: {}", response.status()));
    }

    let data = response.bytes()
        .await
        .map_err(|e| anyhow!("Failed to read backup data: {}", e))?;

    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    let backup_local = app_dir.join("littleflower.db.old");
    if db_path.exists() {
        fs::copy(&db_path, &backup_local)?;
    }

    fs::write(&db_path, data)?;

    Ok(format!("Restored '{}' successfully. Please restart the application.", file_name))
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
        .map_err(|e| anyhow!("Failed to get download URL from API gateway: {}", e))?;

    if response.status().as_u16() == 401 || response.status().as_u16() == 403 {
        return Err(anyhow!("Unauthorized: Invalid authentication credentials."));
    }

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow!("API gateway returned error {}: {}", status, body));
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

async fn get_key_download_url(client: &Client, auth_secret: &str, region: &str, bucket: &str) -> Result<String> {
    let gateway_url = get_gateway_url();
    
    let response = client.post(&gateway_url)
        .header("Content-Type", "application/json")
        .header(AUTH_HEADER, auth_secret)
        .json(&serde_json::json!({
            "action": "getDownloadUrl",
            "fileName": "secret.key",
            "region": region,
            "bucket": bucket
        }))
        .timeout(Duration::from_secs(NETWORK_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("Failed to get key download URL from API gateway: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("Failed to get key download URL: {}", response.status()));
    }

    #[derive(serde::Deserialize)]
    struct DownloadResponse {
        #[serde(alias = "downloadUrl", alias = "download_url")]
        download_url: String,
    }

    let download: DownloadResponse = response.json()
        .await
        .map_err(|e| anyhow!("Failed to parse key download URL response: {}", e))?;

    Ok(download.download_url)
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
    fn test_env_vars() {
        let (auth, region, bucket) = get_env_vars();
        println!("Auth: {}, Region: {}, Bucket: {}", auth, region, bucket);
    }
}
