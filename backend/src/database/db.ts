import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_FILE || path.join(__dirname, '../../data/workshop.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open SQLite database with optimized parameters
export const db = new Database(dbPath, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});

// Configure SQLite for high concurrency and relational safety
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Runtime column migrations
  try { db.exec('ALTER TABLE tasks ADD COLUMN price REAL DEFAULT 0.0'); } catch (e) {}
  try { db.exec('ALTER TABLE visits ADD COLUMN odometer_out INTEGER NULL'); } catch (e) {}
  try { db.exec("ALTER TABLE work_orders ADD COLUMN category TEXT DEFAULT 'repair'"); } catch (e) {}
  try { db.exec('ALTER TABLE vehicle_ownership_history ADD COLUMN notes TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE parts ADD COLUMN description TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE parts ADD COLUMN image_url TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE stock_movements ADD COLUMN customer_id TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE stock_movements ADD COLUMN customer_name TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE suppliers ADD COLUMN phone_secondary TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE purchase_invoices ADD COLUMN discount_amount REAL DEFAULT 0.0'); } catch (e) {}
  try { db.exec('ALTER TABLE purchase_invoice_items ADD COLUMN discount REAL DEFAULT 0.0'); } catch (e) {}
  try { db.exec('ALTER TABLE purchase_invoice_items ADD COLUMN sku TEXT NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE vehicles ADD COLUMN last_maintenance_km INTEGER NULL'); } catch (e) {}
  try { db.exec('ALTER TABLE vehicles ADD COLUMN next_maintenance_notes TEXT NULL'); } catch (e) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id TEXT PRIMARY KEY,
        workshop_id TEXT NOT NULL,
        payment_number TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        purchase_invoice_id TEXT,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        reference_number TEXT,
        payment_date DATE DEFAULT (DATE('now')),
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_sup ON supplier_payments(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_inv ON supplier_payments(purchase_invoice_id);
    `);
  } catch (e) {}

  // Seed screenshot demo parts if not existing
  try {
    const hasFZ = db.prepare('SELECT id FROM parts WHERE part_number = ?').get('FZ-001');
    if (!hasFZ) {
      const demoParts = [
        { id: 'part_img_01', pn: 'FZ-001', name: 'فلتر زيت', cat: 'فلاتر', brand: 'تويوتا', cost: 120, sale: 180, stock: 50, min: 10, loc: 'رف A-1', sup: 'تويوتا الوكالة', desc: 'فلتر زيت أصلي للمحرك' },
        { id: 'part_img_02', pn: 'FA-002', name: 'فلتر هواء', cat: 'فلاتر', brand: 'تويوتا', cost: 150, sale: 220, stock: 30, min: 10, loc: 'رف A-2', sup: 'تويوتا الوكالة', desc: 'فلتر هواء تنقية السحب' },
        { id: 'part_img_03', pn: 'PL-003', name: 'بوجيهات', cat: 'إشعال', brand: 'NGK', cost: 240, sale: 350, stock: 20, min: 5, loc: 'رف C-1', sup: 'المنصور للسيارات', desc: 'طقم شمعات احتراق إيريديوم' },
        { id: 'part_img_04', pn: 'O-004', name: 'زيت محرك 5W30', cat: 'زيوت', brand: 'موبيل', cost: 380, sale: 520, stock: 15, min: 5, loc: 'مستودع الزيوت', sup: 'موبيل مصر', desc: 'زيت محرك تخليقي عالي الأداء' },
        { id: 'part_img_05', pn: 'BR-005', name: 'فحمات أمامية', cat: 'فرامل', brand: 'بريمبو', cost: 680, sale: 950, stock: 12, min: 5, loc: 'رف B-1', sup: 'بوش الوكيل المعتمد', desc: 'طقم تيل فرامل أمامي سيراميك' },
        { id: 'part_img_06', pn: 'BR-006', name: 'فحمات خلفية', cat: 'فرامل', brand: 'بريمبو', cost: 580, sale: 820, stock: 10, min: 5, loc: 'رف B-2', sup: 'بوش الوكيل المعتمد', desc: 'طقم تيل فرامل خلفي' },
        { id: 'part_img_07', pn: 'SH-007', name: 'مساعدين أمامي', cat: 'مساعدات', brand: 'KYB', cost: 900, sale: 1250, stock: 8, min: 3, loc: 'رف D-1', sup: 'شركة النيل لقطع الغيار', desc: 'مساعد هيدروليك ياباني أمامي' },
        { id: 'part_img_08', pn: 'TB-008', name: 'سير كاتينة', cat: 'محرك', brand: 'تويوتا', cost: 1300, sale: 1800, stock: 5, min: 2, loc: 'رف D-2', sup: 'تويوتا الوكالة', desc: 'سير توقيت الصمامات الأصلي' },
        { id: 'part_img_09', pn: 'CL-009', name: 'سائل تبريد', cat: 'تبريد', brand: 'Total', cost: 190, sale: 280, stock: 18, min: 5, loc: 'مستودع السوائل', sup: 'شركة النيل لقطع الغيار', desc: 'ماء ردياتير أحمر عضوي مانع للتجمد' },
        { id: 'part_img_10', pn: 'PL-010', name: 'بلاستيكات متنوعة', cat: 'قطع غيار', brand: 'أصلي', cost: 95, sale: 150, stock: 25, min: 10, loc: 'رف E-1', sup: 'مستورد مباشر', desc: 'كلبسات وتثبيتات صدامات وصاجات' }
      ];
      const stmt = db.prepare(`
        INSERT INTO parts (id, workshop_id, part_number, name, category, brand, cost_price, sale_price, stock_quantity, min_stock_alert, storage_location, supplier_name, description)
        VALUES (?, 'ws_default_01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of demoParts) {
        stmt.run(p.id, p.pn, p.name, p.cat, p.brand, p.cost, p.sale, p.stock, p.min, p.loc, p.sup, p.desc);
      }
    }
  } catch (e) {
    console.error('Error seeding screenshot demo parts:', e);
  }

  // Round floating point inaccuracies in invoices and customers
  try {
    db.prepare('UPDATE invoices SET balance_due = ROUND(balance_due, 2), grand_total = ROUND(grand_total, 2), paid_amount = ROUND(paid_amount, 2)').run();
    db.prepare('UPDATE customers SET total_balance_due = ROUND(total_balance_due, 2)').run();
  } catch (e) {
    // ignore
  }

  console.log('Database initialized successfully with foreign keys and WAL mode.');
}

export function executeTransaction<T>(fn: (dbInstance: Database.Database) => T): T {
  const runTx = db.transaction(() => {
    return fn(db);
  });
  return runTx();
}

export default db;
