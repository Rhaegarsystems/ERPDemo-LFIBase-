use rusqlite::{Connection, Result};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

pub fn init_db(app_handle: &AppHandle) -> Result<Connection> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    // Ensure the directory exists
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    }

    let db_path = app_dir.join("littleflower.db");

    let conn = Connection::open(db_path)?;

    // Create Tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            category TEXT,
            stock INTEGER DEFAULT 0,
            price REAL DEFAULT 0.0,
            status TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            contact TEXT,
            email TEXT,
            phone TEXT,
            orders INTEGER DEFAULT 0,
            total_value REAL DEFAULT 0.0
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            client_id INTEGER,
            date TEXT,
            due_date TEXT,
            amount REAL,
            status TEXT,
            FOREIGN KEY(client_id) REFERENCES customers(id)
        )",
        [],
    )?;

    Ok(conn)
}

// Helper to get connection easily in commands
pub fn get_db_path(app_handle: &AppHandle) -> std::path::PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    app_dir.join("littleflower.db")
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct InventoryItem {
    pub id: Option<i64>,
    pub name: String,
    pub sku: String,
    pub category: String,
    pub stock: i32,
    pub price: f64,
    pub status: String,
}

pub fn get_all_inventory(conn: &Connection) -> Result<Vec<InventoryItem>> {
    let mut stmt =
        conn.prepare("SELECT id, name, sku, category, stock, price, status FROM inventory")?;
    let item_iter = stmt.query_map([], |row| {
        Ok(InventoryItem {
            id: row.get(0)?,
            name: row.get(1)?,
            sku: row.get(2)?,
            category: row.get(3)?,
            stock: row.get(4)?,
            price: row.get(5)?,
            status: row.get(6)?,
        })
    })?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item?);
    }
    Ok(items)
}

pub fn add_inventory_item(conn: &Connection, item: &InventoryItem) -> Result<()> {
    conn.execute(
        "INSERT INTO inventory (name, sku, category, stock, price, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &item.name,
            &item.sku,
            &item.category,
            &item.stock,
            &item.price,
            &item.status,
        ),
    )?;
    Ok(())
}
