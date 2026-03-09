use anyhow::{anyhow, Result};
use aws_config::BehaviorVersion;
use aws_sdk_s3::{Client, primitives::ByteStream};
use std::fs;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use dotenvy::dotenv;
use std::env;

// --- Cloud Configuration ---

fn get_cloud_config() -> Result<(String, String, String, String)> {
    // Try both .env and .env.local
    dotenvy::dotenv().ok();
    dotenvy::from_filename(".env.local").ok();
    
    let access_key = env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| anyhow!("Cloud Access Key not found in .env or .env.local"))?;
    let secret_key = env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| anyhow!("Cloud Secret Key not found in .env or .env.local"))?;
    let region = env::var("AWS_REGION")
        .map_err(|_| anyhow!("Cloud Region not found in .env or .env.local"))?;
    let bucket = env::var("AWS_S3_BUCKET")
        .map_err(|_| anyhow!("Cloud Storage Identifier not found in .env or .env.local"))?;
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

// Global state (kept to maintain compatibility with lib.rs for now)
pub struct BackupState {
    pub access_token: Mutex<Option<String>>,
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

    // Also update a "latest" pointer or just keep the latest for easy restore
    // For simplicity, we can also upload it as "littleflower_backup_latest.db"
    let body_latest = ByteStream::from(fs::read(&db_path)?);
    client.put_object()
        .bucket(&bucket)
        .key("littleflower_backup_latest.db")
        .body(body_latest)
        .send()
        .await
        .ok(); // Ignore failure for latest pointer

    Ok(format!("Backup uploaded successfully: {}", file_name))
}

pub async fn restore_backup(app_handle: AppHandle) -> Result<String> {
    let (client, bucket) = get_cloud_client().await?;
    
    // We'll try to restore the "latest" one first
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
