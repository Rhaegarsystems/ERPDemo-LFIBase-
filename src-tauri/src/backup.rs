use anyhow::{anyhow, Result};
use aws_config::BehaviorVersion;
use aws_sdk_s3::{Client, primitives::ByteStream};
use std::fs;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use std::env;

// --- Cloud Configuration ---

fn get_cloud_config() -> Result<(String, String, String, String)> {
    // In production, these should be baked in at compile time
    // In dev, they are picked up from the environment or .env
    
    // Check if we have compile-time variables (baked in during cargo build)
    let access_key = option_env!("AWS_ACCESS_KEY_ID");
    let secret_key = option_env!("AWS_SECRET_ACCESS_KEY");
    let region = option_env!("AWS_REGION");
    let bucket = option_env!("AWS_S3_BUCKET");

    if let (Some(ak), Some(sk), Some(reg), Some(buck)) = (access_key, secret_key, region, bucket) {
        return Ok((ak.to_string(), sk.to_string(), reg.to_string(), buck.to_string()));
    }

    // Fallback to runtime environment (for development)
    dotenvy::dotenv().ok();
    dotenvy::from_filename(".env.local").ok();
    
    let access_key = env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| anyhow!("Cloud Access Key not found. Please set AWS_ACCESS_KEY_ID at compile time or in .env"))?;
    let secret_key = env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| anyhow!("Cloud Secret Key not found. Please set AWS_SECRET_ACCESS_KEY at compile time or in .env"))?;
    let region = env::var("AWS_REGION")
        .map_err(|_| anyhow!("Cloud Region not found. Please set AWS_REGION at compile time or in .env"))?;
    let bucket = env::var("AWS_S3_BUCKET")
        .map_err(|_| anyhow!("Cloud Storage Identifier not found. Please set AWS_S3_BUCKET at compile time or in .env"))?;
    Ok((access_key, secret_key, region, bucket))
}

async fn get_cloud_client() -> Result<(Client, String)> {
    let (_, _, region, bucket) = get_cloud_config()?;
    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_sdk_s3::config::Region::new(region))
        .load()
        .await;
    let client = Client::new(&config);
    Ok((client, bucket))
}

// Global state
pub struct BackupState {
    pub _last_backup_check: Mutex<Option<String>>,
}

// --- Backup Operations ---

pub fn is_connected(_app_handle: &AppHandle) -> bool {
    get_cloud_config().is_ok()
}

pub async fn upload_backup(app_handle: AppHandle) -> Result<String> {
    let (client, bucket) = get_cloud_client().await?;

    // Get DB path
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    let key_path = app_dir.join("secret.key");
    
    if !db_path.exists() {
        return Err(anyhow!("Database file not found at {:?}", db_path));
    }

    let file_content = fs::read(&db_path)?;
    
    // Time-based file name: littleflower_backup_YYYYMMDD_HHMMSS.db
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let file_name = format!("littleflower_backup_{}.db", timestamp);

    let body = ByteStream::from(file_content);

    client.put_object()
        .bucket(&bucket)
        .key(&file_name)
        .body(body)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to upload to Cloud storage: {}", e))?;

    // Also upload the encryption key if it exists
    if key_path.exists() {
        let key_content = fs::read(&key_path)?;
        client.put_object()
            .bucket(&bucket)
            .key("secret.key")
            .body(ByteStream::from(key_content))
            .send()
            .await
            .ok();
    }

    // Also update a "latest" pointer or just keep the latest for easy restore
    let body_latest = ByteStream::from(fs::read(&db_path)?);
    client.put_object()
        .bucket(&bucket)
        .key("littleflower_backup_latest.db")
        .body(body_latest)
        .send()
        .await
        .ok(); 

    Ok(format!("Backup uploaded successfully: {}", file_name))
}

pub async fn restore_backup(app_handle: AppHandle) -> Result<String> {
    let (client, bucket) = get_cloud_client().await?;
    
    // 1. Restore the key first
    if let Ok(res) = client.get_object().bucket(&bucket).key("secret.key").send().await {
        if let Ok(data) = res.body.collect().await {
            let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
            let key_path = app_dir.join("secret.key");
            fs::write(&key_path, data.into_bytes()).ok();
            
            // CRITICAL: Clear the cached key in memory so the app reads the new one
            crate::db::clear_cached_key();
        }
    }

    // 2. Restore the database
    let file_name = "littleflower_backup_latest.db";

    let res = client.get_object()
        .bucket(&bucket)
        .key(file_name)
        .send()
        .await
        .map_err(|e| anyhow!("No backup found in Cloud storage: {}", e))?;

    let data = res.body.collect().await
        .map_err(|e| anyhow!("Failed to download backup data: {}", e))?
        .into_bytes();

    // Save to local path (overwrite)
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    let db_path = app_dir.join("littleflower.db");
    
    // Backup the current local file just in case
    let backup_local = app_dir.join("littleflower.db.old");
    if db_path.exists() {
        fs::copy(&db_path, &backup_local)?;
    }

    fs::write(&db_path, data)?;

    Ok("Data restored successfully from Cloud storage. Please restart the application for changes to take effect.".to_string())
}

pub async fn get_latest_backup_info() -> Result<String> {
    let (client, bucket) = get_cloud_client().await?;
    
    let res = client.head_object()
        .bucket(&bucket)
        .key("littleflower_backup_latest.db")
        .send()
        .await
        .map_err(|e| anyhow!("No backup found: {}", e))?;

    if let Some(last_modified) = res.last_modified() {
        let secs = last_modified.secs();
        let datetime = chrono::DateTime::from_timestamp(secs, 0)
            .ok_or_else(|| anyhow!("Invalid timestamp"))?;
        let local_time: chrono::DateTime<chrono::Local> = datetime.into();
        Ok(local_time.format("%Y-%m-%d %H:%M:%S").to_string())
    } else {
        Err(anyhow!("Last modified time not available"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cloud_reachability() {
        let (client, bucket) = get_cloud_client().await.expect("Failed to get Cloud client");
        println!("Checking Cloud storage: {}", bucket);
        match client.head_bucket().bucket(&bucket).send().await {
            Ok(_) => println!("Cloud storage reachable!"),
            Err(e) => panic!("Cloud storage not reachable: {:?}", e),
        }
    }
}
