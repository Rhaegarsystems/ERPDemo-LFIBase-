mod db;
mod backup;
mod crypto;

use db::{ActivityLog, Customer, DashboardStats, InventoryItem, Invoice, InvoiceWithCustomer, RevenuePoint};
use backup::BackupState;
use std::sync::Mutex;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted by Rust!", name)
}

// --- Backup Commands ---

#[tauri::command]
fn is_google_drive_connected(app: tauri::AppHandle) -> bool {
    backup::is_connected(&app)
}

static BACKUP_PASSWORD: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

#[tauri::command]
async fn set_backup_password(password: String) -> Result<(), String> {
    let mut pw = BACKUP_PASSWORD.lock().map_err(|e| e.to_string())?;
    *pw = Some(password);
    Ok(())
}

#[tauri::command]
fn get_backup_password() -> Option<String> {
    BACKUP_PASSWORD.lock().ok().and_then(|pw| pw.clone())
}

#[tauri::command]
async fn backup_now(app: tauri::AppHandle) -> Result<String, String> {
    let password = BACKUP_PASSWORD.lock().map_err(|e| e.to_string())?
        .clone()
        .ok_or("Please set backup password first")?;
    backup::upload_backup(app, password).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn restore_now(app: tauri::AppHandle) -> Result<String, String> {
    backup::restore_backup(app).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn restore_backup_file(app: tauri::AppHandle, file_name: String) -> Result<String, String> {
    let password = BACKUP_PASSWORD.lock().map_err(|e| e.to_string())?
        .clone()
        .ok_or("Please set backup password first")?;
    backup::restore_specific_backup(app, file_name, password).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_latest_backup_info() -> Result<String, String> {
    backup::get_latest_backup_info().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_cloud_backups() -> Result<Vec<backup::BackupInfo>, String> {
    backup::list_backups().await.map_err(|e| e.to_string())
}

// --- Database Commands ---

#[tauri::command]
fn get_revenue_history(app: tauri::AppHandle) -> Result<Vec<RevenuePoint>, String> {
    let conn = db::open_db(&app)?;
    db::get_revenue_history(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_invoice(app: tauri::AppHandle, id: String) -> Result<Invoice, String> {
    let conn = db::open_db(&app)?;
    db::get_invoice(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_invoice_with_customer(app: tauri::AppHandle, id: String) -> Result<InvoiceWithCustomer, String> {
    let conn = db::open_db(&app)?;
    db::get_invoice_with_customer(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_inventory(app: tauri::AppHandle) -> Result<Vec<InventoryItem>, String> {
    let conn = db::open_db(&app)?;
    db::get_inventory(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_item(app: tauri::AppHandle, item: InventoryItem) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::add_item(&conn, &item).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customers(app: tauri::AppHandle) -> Result<Vec<Customer>, String> {
    let conn = db::open_db(&app)?;
    db::get_customers(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_customer(app: tauri::AppHandle, customer: Customer) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::add_customer(&conn, &customer).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_invoices(app: tauri::AppHandle) -> Result<Vec<Invoice>, String> {
    let conn = db::open_db(&app)?;
    db::get_invoices(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_latest_invoice_id(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let conn = db::open_db(&app)?;
    db::get_latest_invoice_id(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_invoice(app: tauri::AppHandle, invoice: Invoice) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::save_invoice(&conn, &invoice).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_dashboard_stats(app: tauri::AppHandle) -> Result<DashboardStats, String> {
    let conn = db::open_db(&app)?;
    db::get_dashboard_stats(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_activity_logs(app: tauri::AppHandle) -> Result<Vec<ActivityLog>, String> {
    let conn = db::open_db(&app)?;
    db::get_activity_logs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_item(app: tauri::AppHandle, item: InventoryItem) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::update_item(&conn, &item).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_item(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::delete_item(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_customer(app: tauri::AppHandle, customer: Customer) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::update_customer(&conn, &customer).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_customer(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::delete_customer(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_invoice(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::delete_invoice(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_db(app: tauri::AppHandle, path: String) -> Result<(), String> {
    db::export_db(&app, std::path::Path::new(&path))
}

#[tauri::command]
fn import_db(app: tauri::AppHandle, path: String) -> Result<(), String> {
    db::import_db(&app, std::path::Path::new(&path))
}

#[tauri::command]
fn reset_database(app: tauri::AppHandle) -> Result<(), String> {
    db::reset_database(&app)
}

#[tauri::command]
fn update_invoice_status(app: tauri::AppHandle, id: String, status: String) -> Result<(), String> {
    let conn = db::open_db(&app)?;
    db::update_invoice_status(&conn, &id, &status).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_database_key(_app: tauri::AppHandle) -> Result<String, String> {
    Ok("Database is now unencrypted - no key needed".to_string())
}

#[tauri::command]
fn get_dev_pin() -> Result<String, String> {
    dotenvy::dotenv().ok();
    std::env::var("DEV_PIN").map_err(|_| "DEV_PIN not found in .env".to_string())
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        // Fallback for other OS if needed, but focuses on the user's current win32 env
        #[cfg(target_os = "macos")]
        std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
        #[cfg(target_os = "linux")]
        std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .manage(BackupState { _last_backup_check: Mutex::new(None) })
        .setup(|app| {
            let _ = db::init_db(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_inventory,
            add_item,
            get_customers,
            add_customer,
            get_invoices,
            get_latest_invoice_id,
            save_invoice,
            get_dashboard_stats,
            get_activity_logs,
            update_item,
            delete_item,
            update_customer,
            delete_customer,
            delete_invoice,
            update_invoice_status,
            is_google_drive_connected,
            backup_now,
            restore_now,
            get_latest_backup_info,
            list_cloud_backups,
            restore_backup_file,
            set_backup_password,
            get_backup_password,
            export_db,
            import_db,
            reset_database,
            get_revenue_history,
            get_invoice,
            get_invoice_with_customer,
            get_database_key,
            get_dev_pin,
            open_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
