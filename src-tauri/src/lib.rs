mod db;

use db::{ActivityLog, Customer, DashboardStats, InventoryItem, Invoice, RevenuePoint, StockLog};
use rusqlite::Connection;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_revenue_history(app: tauri::AppHandle) -> Result<Vec<RevenuePoint>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_revenue_history(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_invoice(app: tauri::AppHandle, id: String) -> Result<Invoice, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_invoice(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_inventory(app: tauri::AppHandle) -> Result<Vec<InventoryItem>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_inventory(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_item(app: tauri::AppHandle, item: InventoryItem) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::add_item(&conn, &item).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customers(app: tauri::AppHandle) -> Result<Vec<Customer>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_customers(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_customer(app: tauri::AppHandle, customer: Customer) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::add_customer(&conn, &customer).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_invoices(app: tauri::AppHandle) -> Result<Vec<Invoice>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_invoices(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_invoice(app: tauri::AppHandle, invoice: Invoice) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::save_invoice(&conn, &invoice).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_dashboard_stats(app: tauri::AppHandle) -> Result<DashboardStats, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_dashboard_stats(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_stock_logs(app: tauri::AppHandle) -> Result<Vec<StockLog>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_stock_logs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_activity_logs(app: tauri::AppHandle) -> Result<Vec<ActivityLog>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_activity_logs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_item(app: tauri::AppHandle, item: InventoryItem) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::update_item(&conn, &item).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_item(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::delete_item(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_customer(app: tauri::AppHandle, customer: Customer) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::update_customer(&conn, &customer).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_customer(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::delete_customer(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_invoice(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::delete_invoice(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_invoice_status(app: tauri::AppHandle, id: String, status: String) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::update_invoice_status(&conn, &id, &status).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            match db::init_db(app.handle()) {
                Ok(_) => println!("Database initialized successfully"),
                Err(e) => eprintln!("Failed to initialize database: {}", e),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_inventory,
            add_item,
            get_customers,
            add_customer,
            get_invoices,
            save_invoice,
            get_dashboard_stats,
            get_stock_logs,
            get_activity_logs,
            update_item,
            delete_item,
            update_customer,
            delete_customer,
            delete_invoice,
            update_invoice_status,
            get_revenue_history,
            get_invoice
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
