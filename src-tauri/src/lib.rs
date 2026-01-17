mod db;

use db::InventoryItem;
use rusqlite::Connection;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_inventory(app: tauri::AppHandle) -> Result<Vec<InventoryItem>, String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::get_all_inventory(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_item(app: tauri::AppHandle, item: InventoryItem) -> Result<(), String> {
    let db_path = db::get_db_path(&app);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    db::add_inventory_item(&conn, &item).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize Database
            match db::init_db(app.handle()) {
                Ok(_) => println!("Database initialized successfully"),
                Err(e) => eprintln!("Failed to initialize database: {}", e),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_inventory, add_item])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
