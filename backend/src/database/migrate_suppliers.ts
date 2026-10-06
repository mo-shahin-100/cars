import db from './db';
import { v4 as uuidv4 } from 'uuid';

export function runSuppliersMigration() {
  console.log('Running suppliers & purchases migration...');
  
  // Create suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      workshop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      tax_number TEXT,
      address TEXT,
      category TEXT DEFAULT 'قطع غيار',
      payment_terms TEXT DEFAULT 'cash',
      notes TEXT,
      deleted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_workshop ON suppliers(workshop_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
  `);

  // Ensure supplier_id column in purchase_invoices
  try {
    const cols = db.prepare(`PRAGMA table_info(purchase_invoices)`).all() as any[];
    const hasSupplierId = cols.some(c => c.name === 'supplier_id');
    if (!hasSupplierId) {
      db.exec(`ALTER TABLE purchase_invoices ADD COLUMN supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL;`);
      console.log('Added supplier_id column to purchase_invoices table.');
    }
    const hasImageUrl = cols.some(c => c.name === 'invoice_image_url');
    if (!hasImageUrl) {
      db.exec(`ALTER TABLE purchase_invoices ADD COLUMN invoice_image_url TEXT;`);
      console.log('Added invoice_image_url column to purchase_invoices table.');
    }
  } catch (err) {
    console.error('Column check error:', err);
  }

  // Check if we should seed default suppliers if none exist
  const workshopId = 'ws_default_01';
  const supplierCount = db.prepare('SELECT COUNT(*) as cnt FROM suppliers WHERE workshop_id = ? AND deleted_at IS NULL').get(workshopId) as any;
  
  if (supplierCount.cnt === 0) {
    console.log('Seeding initial suppliers...');
    const defaultSuppliers = [
      {
        id: 'sup_petromin',
        name: 'شركة بترومين للزيوت والشحوم',
        contact_person: 'أحمد السعيد',
        phone: '0501122334',
        email: 'sales@petromin.sa',
        tax_number: '300123456700003',
        address: 'الرياض - المنطقة الصناعية',
        category: 'زيوت ومواد تشحيم',
        payment_terms: 'credit_30',
        notes: 'المورد الرئيسي لزيوت بترومين وموبيل وشل وفلاتر الزيت'
      },
      {
        id: 'sup_bosch_sa',
        name: 'مؤسسة الرواد - وكيل بوش المعتمد',
        contact_person: 'م. سامي الحربي',
        phone: '0559988776',
        email: 'info@alruwad-bosch.sa',
        tax_number: '300987654300003',
        address: 'الرياض - شارع الغرابي',
        category: 'كهرباء ولمبات',
        payment_terms: 'cash',
        notes: 'توريد لمبات أصلية، بواجي، حساسات، وبطاريات بوش'
      },
      {
        id: 'sup_toyota_parts',
        name: 'مجموعة النجم الساطع لقطع غيار تويوتا وهيونداي',
        contact_person: 'عبدالرحمن العتيبي',
        phone: '0543322110',
        email: 'starparts@gmail.com',
        tax_number: '300456789000003',
        address: 'الرياض - صناعية الشفاء',
        category: 'قطع غيار',
        payment_terms: 'credit_15',
        notes: 'موزع معتمد لأقمشة الفرامل، الفلاتر الأصلية، والسيور'
      }
    ];

    const insertSup = db.prepare(`
      INSERT OR IGNORE INTO suppliers (
        id, workshop_id, name, contact_person, phone, email, tax_number, address, category, payment_terms, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sup of defaultSuppliers) {
      insertSup.run(
        sup.id,
        workshopId,
        sup.name,
        sup.contact_person,
        sup.phone,
        sup.email,
        sup.tax_number,
        sup.address,
        sup.category,
        sup.payment_terms,
        sup.notes
      );
    }

    console.log('Seeded 3 default suppliers.');
  }

  console.log('Migration completed successfully.');
}

if (require.main === module) {
  runSuppliersMigration();
}
