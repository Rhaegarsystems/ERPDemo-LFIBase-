use rusqlite::{Connection, Result};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

pub fn init_db(app_handle: &AppHandle) -> Result<Connection> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    }

    let db_path = app_dir.join("littleflower.db");
    let conn = Connection::open(db_path)?;

    // Inventory - Simplified (removed category, hsn, status from active use)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            stock INTEGER DEFAULT 0,
            price REAL DEFAULT 0.0,
            process TEXT
        )",
        [],
    )?;
    let _ = conn.execute("ALTER TABLE inventory ADD COLUMN process TEXT", []);

    // Customers - Added vendor_code
    conn.execute(
        "CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            contact TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            gstin TEXT,
            state TEXT,
            state_code TEXT,
            vendor_code TEXT,
            orders INTEGER DEFAULT 0,
            total_value REAL DEFAULT 0.0
        )",
        [],
    )?;
    let _ = conn.execute("ALTER TABLE customers ADD COLUMN vendor_code TEXT", []);
    let _ = conn.execute("ALTER TABLE customers ADD COLUMN address TEXT", []);
    let _ = conn.execute("ALTER TABLE customers ADD COLUMN gstin TEXT", []);
    let _ = conn.execute("ALTER TABLE customers ADD COLUMN state TEXT", []);
    let _ = conn.execute("ALTER TABLE customers ADD COLUMN state_code TEXT", []);

    // Invoices - Added vendor_code, invoice_type
    conn.execute(
        "CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            client_name TEXT,
            vendor_code TEXT,
            date TEXT,
            due_date TEXT,
            amount REAL,
            status TEXT,
            dc_no TEXT,
            dc_date TEXT,
            po_no TEXT,
            po_date TEXT,
            transport_mode TEXT,
            invoice_type TEXT,
            items_json TEXT
        )",
        [],
    )?;
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN client_name TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN vendor_code TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN transport_mode TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN invoice_type TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN items_json TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN dc_no TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN dc_date TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN po_no TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN po_date TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN due_date TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN hsn_code TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN sac_code TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN state TEXT", []);
    let _ = conn.execute("ALTER TABLE invoices ADD COLUMN state_code TEXT", []);

    // Activity Logs
    conn.execute(
        "CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY,
            action TEXT,
            entity_type TEXT,
            entity_name TEXT,
            details TEXT,
            timestamp TEXT
        )",
        [],
    )?;

    // Stock Logs
    conn.execute(
        "CREATE TABLE IF NOT EXISTS stock_logs (
            id INTEGER PRIMARY KEY,
            item_name TEXT,
            sku TEXT,
            type TEXT,
            quantity INTEGER,
            date TEXT,
            user TEXT
        )",
        [],
    )?;

    Ok(conn)
}

pub fn get_db_path(app_handle: &AppHandle) -> std::path::PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    app_dir.join("littleflower.db")
}

// --- Activity Logging ---
pub fn log_activity(
    conn: &Connection,
    action: &str,
    entity_type: &str,
    entity_name: &str,
    details: &str,
) -> Result<()> {
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO activity_logs (action, entity_type, entity_name, details, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        (action, entity_type, entity_name, details, timestamp),
    )?;
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ActivityLog {
    pub id: i64,
    pub action: String,
    pub entity_type: String,
    pub entity_name: String,
    pub details: String,
    pub timestamp: String,
}

pub fn get_activity_logs(conn: &Connection) -> Result<Vec<ActivityLog>> {
    let mut stmt = conn.prepare("SELECT id, action, entity_type, entity_name, details, timestamp FROM activity_logs ORDER BY id DESC LIMIT 50")?;
    let iter = stmt.query_map([], |row| {
        Ok(ActivityLog {
            id: row.get(0)?,
            action: row.get(1)?,
            entity_type: row.get(2)?,
            entity_name: row.get(3)?,
            details: row.get(4)?,
            timestamp: row.get(5)?,
        })
    })?;
    let mut logs = Vec::new();
    for l in iter {
        logs.push(l?);
    }
    Ok(logs)
}

// --- Dashboard Stats ---
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct DashboardStats {
    pub revenue: f64,
    pub customers: i32,
    pub total_invoices: i32,
    pub active_orders: i32,
}

pub fn get_dashboard_stats(conn: &Connection) -> Result<DashboardStats> {
    let revenue: f64 = conn
        .query_row("SELECT IFNULL(SUM(amount), 0) FROM invoices", [], |r| {
            r.get(0)
        })
        .unwrap_or(0.0);
    let customers: i32 = conn
        .query_row("SELECT COUNT(*) FROM customers", [], |r| r.get(0))
        .unwrap_or(0);
    let total_invoices: i32 = conn
        .query_row("SELECT COUNT(*) FROM invoices", [], |r| r.get(0))
        .unwrap_or(0);
    let active_orders: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM invoices WHERE status = 'Pending'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(DashboardStats {
        revenue,
        customers,
        total_invoices,
        active_orders,
    })
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct RevenuePoint {
    pub date: String,
    pub amount: f64,
}

pub fn get_revenue_history(conn: &Connection) -> Result<Vec<RevenuePoint>> {
    let mut stmt = conn.prepare("SELECT date, SUM(amount) FROM invoices WHERE date >= date('now', '-30 days') GROUP BY date ORDER BY date")?;
    let iter = stmt.query_map([], |row| {
        Ok(RevenuePoint {
            date: row.get(0)?,
            amount: row.get(1)?,
        })
    })?;
    let mut points = Vec::new();
    for p in iter {
        points.push(p?);
    }
    Ok(points)
}

// --- Inventory (Simplified) ---
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct InventoryItem {
    pub id: Option<i64>,
    pub name: String,
    pub sku: String,
    pub stock: i64,
    pub price: f64,
    pub process: String,
}

pub fn get_inventory(conn: &Connection) -> Result<Vec<InventoryItem>> {
    let mut stmt = conn.prepare("SELECT id, name, sku, stock, price, process FROM inventory")?;
    let item_iter = stmt.query_map([], |row| {
        Ok(InventoryItem {
            id: row.get(0)?,
            name: row.get(1)?,
            sku: row.get(2)?,
            stock: row.get(3)?,
            price: row.get(4)?,
            process: row.get(5).unwrap_or_default(),
        })
    })?;
    let mut items = Vec::new();
    for item in item_iter {
        items.push(item?);
    }
    Ok(items)
}

pub fn add_item(conn: &Connection, item: &InventoryItem) -> Result<()> {
    conn.execute(
        "INSERT INTO inventory (name, sku, stock, price, process) VALUES (?1, ?2, ?3, ?4, ?5)",
        (
            &item.name,
            &item.sku,
            &item.stock,
            &item.price,
            &item.process,
        ),
    )?;
    log_activity(
        conn,
        "Created",
        "Product",
        &item.name,
        &format!("Added SKU: {}", item.sku),
    )?;
    Ok(())
}

pub fn update_item(conn: &Connection, item: &InventoryItem) -> Result<()> {
    conn.execute(
        "UPDATE inventory SET name=?1, sku=?2, stock=?3, price=?4, process=?5 WHERE id=?6",
        (
            &item.name,
            &item.sku,
            &item.stock,
            &item.price,
            &item.process,
            &item.id,
        ),
    )?;
    log_activity(conn, "Updated", "Product", &item.name, "Updated details")?;
    Ok(())
}

pub fn delete_item(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM inventory WHERE id = ?1", [&id])?;
    log_activity(
        conn,
        "Deleted",
        "Product",
        &id.to_string(),
        "Deleted product",
    )?;
    Ok(())
}

// --- Stock Logs ---
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct StockLog {
    pub id: i64,
    pub item_name: String,
    pub sku: String,
    pub type_: String,
    pub quantity: i32,
    pub date: String,
    pub user: String,
}

pub fn get_stock_logs(conn: &Connection) -> Result<Vec<StockLog>> {
    let mut stmt = conn.prepare(
        "SELECT id, item_name, sku, type, quantity, date, user FROM stock_logs ORDER BY id DESC",
    )?;
    let iter = stmt.query_map([], |row| {
        Ok(StockLog {
            id: row.get(0)?,
            item_name: row.get(1)?,
            sku: row.get(2)?,
            type_: row.get(3)?,
            quantity: row.get(4)?,
            date: row.get(5)?,
            user: row.get(6)?,
        })
    })?;
    let mut logs = Vec::new();
    for l in iter {
        logs.push(l?);
    }
    Ok(logs)
}

// --- Customers ---
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Customer {
    pub id: Option<i64>,
    pub name: String,
    pub contact: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub state: Option<String>,
    pub state_code: Option<String>,
    pub vendor_code: Option<String>,
    pub orders: Option<i32>,
    pub total_value: Option<f64>,
}

pub fn get_customers(conn: &Connection) -> Result<Vec<Customer>> {
    let mut stmt = conn.prepare("SELECT id, name, contact, email, phone, address, gstin, state, state_code, vendor_code, orders, total_value FROM customers")?;
    let iter = stmt.query_map([], |row| {
        Ok(Customer {
            id: row.get(0)?,
            name: row.get(1)?,
            contact: row.get(2).unwrap_or(None),
            email: row.get(3).unwrap_or(None),
            phone: row.get(4).unwrap_or(None),
            address: row.get(5).unwrap_or(None),
            gstin: row.get(6).unwrap_or(None),
            state: row.get(7).unwrap_or(None),
            state_code: row.get(8).unwrap_or(None),
            vendor_code: row.get(9).unwrap_or(None),
            orders: row.get(10).unwrap_or(Some(0)),
            total_value: row.get(11).unwrap_or(Some(0.0)),
        })
    })?;
    let mut customers = Vec::new();
    for c in iter {
        customers.push(c?);
    }
    Ok(customers)
}

pub fn add_customer(conn: &Connection, customer: &Customer) -> Result<()> {
    conn.execute(
        "INSERT INTO customers (name, contact, email, phone, address, gstin, state, state_code, vendor_code, orders, total_value) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 0.0)",
        (&customer.name, &customer.contact, &customer.email, &customer.phone, &customer.address, &customer.gstin, &customer.state, &customer.state_code, &customer.vendor_code),
    )?;
    log_activity(
        conn,
        "Created",
        "Customer",
        &customer.name,
        "New customer added",
    )?;
    Ok(())
}

pub fn update_customer(conn: &Connection, customer: &Customer) -> Result<()> {
    conn.execute(
        "UPDATE customers SET name=?1, contact=?2, email=?3, phone=?4, address=?5, gstin=?6, state=?7, state_code=?8, vendor_code=?9 WHERE id=?10",
        (&customer.name, &customer.contact, &customer.email, &customer.phone, &customer.address, &customer.gstin, &customer.state, &customer.state_code, &customer.vendor_code, &customer.id),
    )?;
    log_activity(
        conn,
        "Updated",
        "Customer",
        &customer.name,
        "Updated customer details",
    )?;
    Ok(())
}

pub fn delete_customer(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM customers WHERE id = ?1", [&id])?;
    log_activity(
        conn,
        "Deleted",
        "Customer",
        &id.to_string(),
        "Deleted customer",
    )?;
    Ok(())
}

// --- Invoices ---
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Invoice {
    pub id: String,
    pub client_name: String,
    pub vendor_code: Option<String>,
    pub date: String,
    pub due_date: String,
    pub amount: f64,
    pub status: String,
    pub dc_no: Option<String>,
    pub dc_date: Option<String>,
    pub po_no: Option<String>,
    pub po_date: Option<String>,
    pub transport_mode: Option<String>,
    pub invoice_type: Option<String>,
    pub items_json: String,
    pub hsn_code: Option<String>,
    pub sac_code: Option<String>,
    pub state: Option<String>,
    pub state_code: Option<String>,
}

pub fn get_invoices(conn: &Connection) -> Result<Vec<Invoice>> {
    let mut stmt = conn.prepare("SELECT id, client_name, vendor_code, date, due_date, amount, status, dc_no, dc_date, po_no, po_date, transport_mode, invoice_type, items_json, hsn_code, sac_code, state, state_code FROM invoices")?;
    let iter = stmt.query_map([], |row| {
        Ok(Invoice {
            id: row.get(0)?,
            client_name: row.get(1)?,
            vendor_code: row.get(2).unwrap_or(None),
            date: row.get(3)?,
            due_date: row.get(4)?,
            amount: row.get(5)?,
            status: row.get(6)?,
            dc_no: row.get(7).unwrap_or(None),
            dc_date: row.get(8).unwrap_or(None),
            po_no: row.get(9).unwrap_or(None),
            po_date: row.get(10).unwrap_or(None),
            transport_mode: row.get(11).unwrap_or(None),
            invoice_type: row.get(12).unwrap_or(None),
            items_json: row.get(13)?,
            hsn_code: row.get(14).unwrap_or(None),
            sac_code: row.get(15).unwrap_or(None),
            state: row.get(16).unwrap_or(None),
            state_code: row.get(17).unwrap_or(None),
        })
    })?;
    let mut invoices = Vec::new();
    for i in iter {
        invoices.push(i?);
    }
    Ok(invoices)
}

pub fn save_invoice(conn: &Connection, invoice: &Invoice) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO invoices (id, client_name, vendor_code, date, due_date, amount, status, dc_no, dc_date, po_no, po_date, transport_mode, invoice_type, items_json, hsn_code, sac_code, state, state_code) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        rusqlite::params![&invoice.id, &invoice.client_name, &invoice.vendor_code, &invoice.date, &invoice.due_date, &invoice.amount, &invoice.status, &invoice.dc_no, &invoice.dc_date, &invoice.po_no, &invoice.po_date, &invoice.transport_mode, &invoice.invoice_type, &invoice.items_json, &invoice.hsn_code, &invoice.sac_code, &invoice.state, &invoice.state_code],
    )?;
    log_activity(
        conn,
        "Saved",
        "Invoice",
        &invoice.id,
        &format!("Saved invoice for {}", invoice.client_name),
    )?;
    Ok(())
}

pub fn get_invoice(conn: &Connection, id: &str) -> Result<Invoice> {
    let mut stmt = conn.prepare("SELECT id, client_name, vendor_code, date, amount, status, items_json, due_date, dc_no, dc_date, po_no, po_date, transport_mode, invoice_type, hsn_code, sac_code, state, state_code FROM invoices WHERE id = ?1")?;
    let invoice = stmt.query_row([id], |row| {
        Ok(Invoice {
            id: row.get(0)?,
            client_name: row.get(1)?,
            vendor_code: row.get(2).unwrap_or(None),
            date: row.get(3)?,
            amount: row.get(4)?,
            status: row.get(5)?,
            items_json: row.get(6)?,
            due_date: row.get(7).unwrap_or_default(),
            dc_no: row.get(8).unwrap_or_default(),
            dc_date: row.get(9).unwrap_or_default(),
            po_no: row.get(10).unwrap_or_default(),
            po_date: row.get(11).unwrap_or_default(),
            transport_mode: row.get(12).unwrap_or_default(),
            invoice_type: row.get(13).unwrap_or_default(),
            hsn_code: row.get(14).unwrap_or_default(),
            sac_code: row.get(15).unwrap_or_default(),
            state: row.get(16).unwrap_or_default(),
            state_code: row.get(17).unwrap_or_default(),
        })
    })?;
    Ok(invoice)
}

pub fn delete_invoice(conn: &Connection, id: String) -> Result<()> {
    conn.execute("DELETE FROM invoices WHERE id = ?1", [&id])?;
    log_activity(conn, "Deleted", "Invoice", &id, "Invoice deleted")?;
    Ok(())
}

pub fn update_invoice_status(conn: &Connection, id: &str, status: &str) -> Result<()> {
    conn.execute(
        "UPDATE invoices SET status = ?1 WHERE id = ?2",
        [status, id],
    )?;
    log_activity(
        conn,
        "Updated",
        "Invoice",
        id,
        &format!("Status changed to {}", status),
    )?;
    Ok(())
}
