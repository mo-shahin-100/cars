import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from './db';
import { runSuppliersMigration } from './migrate_suppliers';

export function seedDatabase() {
  initDatabase();
  runSuppliersMigration();

  const workshopCount = db.prepare('SELECT COUNT(*) as count FROM workshops').get() as { count: number };
  if (workshopCount.count > 0) {
    console.log('Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('Seeding initial workshop, roles, permissions, users, and DTC library...');

  const workshopId = 'ws_default_01';
  db.prepare(`
    INSERT INTO workshops (id, name, commercial_reg, tax_number, phone, email, address, currency, tax_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workshopId,
    'مركز النخبة المتقدم لصيانة وبرمجة السيارات',
    '1010987654',
    '300987654300003',
    '+966501234567',
    'info@elitemech.sa',
    'الرياض — الصناعية القديمة — طريق الخرج',
    'EGP',
    15.0
  );

  // 1. Roles
  const roles = [
    { id: 'role_owner', name: 'owner', display_name: 'صاحب الورشة (Owner)', description: 'صلاحيات كاملة وغير مقيدة على كافة أقسام النظام والماليات والنسخ الاحتياطي' },
    { id: 'role_manager', name: 'manager', display_name: 'المدير (Manager)', description: 'إدارة تشغيلية وتوزيع المهام على الفنيين ومتابعة أوامر العمل والمخزون' },
    { id: 'role_reception', name: 'reception', display_name: 'موظف الاستقبال (Reception)', description: 'استقبال العملاء، تسجيل السيارات، فتح الزيارات، وإصدار أولي لأوامر العمل' },
    { id: 'role_mechanic', name: 'mechanic', display_name: 'الميكانيكي / الفني (Mechanic)', description: 'استعراض المهام المسندة، تحديث حالة الإنجاز، رفع صور الفحص، وإدخال أكواد DTC' },
    { id: 'role_accountant', name: 'accountant', display_name: 'المحاسب (Accountant)', description: 'إدارة الفواتير، سندات القبض، المدفوعات الجزئية، المصروفات، والتقارير المالية' }
  ];

  const insertRole = db.prepare('INSERT INTO roles (id, name, display_name, description) VALUES (?, ?, ?, ?)');
  for (const r of roles) {
    insertRole.run(r.id, r.name, r.display_name, r.description);
  }

  // 2. Permissions
  const permissions = [
    // Settings & System
    { id: 'p_settings_manage', code: 'settings.manage', category: 'الإعدادات', description: 'إدارة إعدادات الورشة والنسخ الاحتياطي' },
    { id: 'p_users_manage', code: 'users.manage', category: 'المستخدمين', description: 'إدارة حسابات المستخدمين وتعيين الصلاحيات' },
    { id: 'p_users_view', code: 'users.view', category: 'المستخدمين', description: 'عرض قائمة الموظفين والفنيين' },
    
    // Customers & Vehicles
    { id: 'p_customers_view', code: 'customers.view', category: 'العملاء', description: 'عرض بيانات وسجلات العملاء' },
    { id: 'p_customers_create', code: 'customers.create', category: 'العملاء', description: 'إضافة عميل جديد' },
    { id: 'p_customers_update', code: 'customers.update', category: 'العملاء', description: 'تعديل بيانات العميل' },
    { id: 'p_vehicles_view', code: 'vehicles.view', category: 'السيارات', description: 'عرض السيارات والتايم لاين التاريخي' },
    { id: 'p_vehicles_create', code: 'vehicles.create', category: 'السيارات', description: 'تسجيل سيارة جديدة' },
    { id: 'p_vehicles_update', code: 'vehicles.update', category: 'السيارات', description: 'تعديل بيانات السيارة ونقل الملكية' },
    
    // Visits & Work Orders
    { id: 'p_visits_view', code: 'visits.view', category: 'الزيارات', description: 'عرض زيارات الورشة' },
    { id: 'p_visits_create', code: 'visits.create', category: 'الزيارات', description: 'تسجيل دخول سيارة جديدة' },
    { id: 'p_visits_update', code: 'visits.update', category: 'الزيارات', description: 'تحديث حالة الزيارة والتسليم' },
    { id: 'p_work_orders_view', code: 'work_orders.view', category: 'أوامر العمل', description: 'عرض أوامر الإصلاح والمهام' },
    { id: 'p_work_orders_create', code: 'work_orders.create', category: 'أوامر العمل', description: 'إنشاء أمر إصلاح وتحديد التكلفة' },
    { id: 'p_work_orders_update', code: 'work_orders.update', category: 'أوامر العمل', description: 'إسناد المهام وتعديل أوامر العمل' },
    { id: 'p_tasks_update', code: 'tasks.update', category: 'المهام', description: 'تحديث حالة المهمة ووقت العمل' },

    // Diagnostics & Fluids
    { id: 'p_diagnostics_view', code: 'diagnostics.view', category: 'التشخيص', description: 'عرض تقارير الفحص وأكواد DTC' },
    { id: 'p_diagnostics_create', code: 'diagnostics.create', category: 'التشخيص', description: 'تسجيل فحص كمبيوتر وإدخال الأكواد' },
    { id: 'p_fluids_view', code: 'fluids.view', category: 'الزيوت', description: 'عرض سجلات وتنبيهات الزيوت والصيانة' },
    { id: 'p_fluids_create', code: 'fluids.create', category: 'الزيوت', description: 'تسجيل تغيير زيت وحساب موعد الصيانة' },

    // Inventory & Parts
    { id: 'p_inventory_view', code: 'inventory.view', category: 'المخزون', description: 'عرض دليل قطع الغيار والرصيد' },
    { id: 'p_inventory_manage', code: 'inventory.manage', category: 'المخزون', description: 'إضافة أصناف والتوريد والتسوية المخزنية' },
    { id: 'p_parts_consume', code: 'parts.consume', category: 'المخزون', description: 'صرف قطع غيار لأمر عمل' },

    // Invoices & Financials
    { id: 'p_invoices_view', code: 'invoices.view', category: 'الماليات', description: 'عرض الفواتير وسندات القبض' },
    { id: 'p_invoices_create', code: 'invoices.create', category: 'الماليات', description: 'إصدار وتعديل الفواتير' },
    { id: 'p_payments_create', code: 'payments.create', category: 'الماليات', description: 'تسجيل دفعات وإصدار إيصالات' },
    { id: 'p_expenses_view', code: 'expenses.view', category: 'الماليات', description: 'عرض سجل المصروفات' },
    { id: 'p_expenses_create', code: 'expenses.create', category: 'الماليات', description: 'تسجيل مصروفات الورشة' },
    { id: 'p_reports_financial', code: 'reports.financial', category: 'التقارير', description: 'الاطلاع على تقارير الأرباح والمبيعات' },
    { id: 'p_reports_manage', code: 'reports.manage', category: 'التقارير', description: 'تقارير الإنتاجية وساعات الفنيين' }
  ];

  const insertPerm = db.prepare('INSERT INTO permissions (id, code, category, description) VALUES (?, ?, ?, ?)');
  for (const p of permissions) {
    insertPerm.run(p.id, p.code, p.category, p.description);
  }

  // 3. Map Role Permissions
  const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

  // Owner gets ALL permissions
  for (const p of permissions) {
    insertRolePerm.run('role_owner', p.id);
  }

  // Manager permissions
  const managerPermCodes = [
    'customers.view', 'customers.create', 'customers.update',
    'vehicles.view', 'vehicles.create', 'vehicles.update',
    'visits.view', 'visits.create', 'visits.update',
    'work_orders.view', 'work_orders.create', 'work_orders.update', 'tasks.update',
    'diagnostics.view', 'diagnostics.create',
    'fluids.view', 'fluids.create',
    'inventory.view', 'inventory.manage', 'parts.consume',
    'invoices.view', 'invoices.create', 'payments.create',
    'expenses.view', 'expenses.create',
    'reports.financial', 'reports.manage', 'users.view'
  ];
  for (const code of managerPermCodes) {
    const p = permissions.find(x => x.code === code);
    if (p) insertRolePerm.run('role_manager', p.id);
  }

  // Reception permissions
  const receptionPermCodes = [
    'customers.view', 'customers.create', 'customers.update',
    'vehicles.view', 'vehicles.create', 'vehicles.update',
    'visits.view', 'visits.create', 'visits.update',
    'work_orders.view', 'work_orders.create',
    'diagnostics.view', 'fluids.view', 'inventory.view',
    'invoices.view', 'users.view'
  ];
  for (const code of receptionPermCodes) {
    const p = permissions.find(x => x.code === code);
    if (p) insertRolePerm.run('role_reception', p.id);
  }

  // Mechanic permissions
  const mechanicPermCodes = [
    'customers.view', 'vehicles.view', 'visits.view',
    'work_orders.view', 'tasks.update',
    'diagnostics.view', 'diagnostics.create',
    'fluids.view', 'fluids.create',
    'parts.consume', 'inventory.view'
  ];
  for (const code of mechanicPermCodes) {
    const p = permissions.find(x => x.code === code);
    if (p) insertRolePerm.run('role_mechanic', p.id);
  }

  // Accountant permissions
  const accountantPermCodes = [
    'customers.view', 'vehicles.view', 'visits.view',
    'invoices.view', 'invoices.create', 'payments.create',
    'expenses.view', 'expenses.create',
    'reports.financial', 'inventory.view'
  ];
  for (const code of accountantPermCodes) {
    const p = permissions.find(x => x.code === code);
    if (p) insertRolePerm.run('role_accountant', p.id);
  }

  // 4. Initial Users
  const salt = bcrypt.genSaltSync(10);
  const users = [
    {
      id: 'usr_admin',
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', salt),
      fullName: 'م. عبد الله الشمري (المالك والمدير العام)',
      phone: '+966500000001',
      email: 'admin@elitemech.sa',
      roleId: 'role_owner',
      specialty: 'إدارة هندسية وجودة'
    },
    {
      id: 'usr_manager',
      username: 'manager',
      passwordHash: bcrypt.hashSync('manager123', salt),
      fullName: 'خالد السالم (مدير العمليات)',
      phone: '+966500000002',
      email: 'manager@elitemech.sa',
      roleId: 'role_manager',
      specialty: 'تخطيط العمليات وتوزيع المهام'
    },
    {
      id: 'usr_reception',
      username: 'reception',
      passwordHash: bcrypt.hashSync('reception123', salt),
      fullName: 'فهد العتيبي (مسؤول الاستقبال)',
      phone: '+966500000003',
      email: 'reception@elitemech.sa',
      roleId: 'role_reception',
      specialty: 'استقبال وفحص أولي'
    },
    {
      id: 'usr_mech_ahmed',
      username: 'ahmed',
      passwordHash: bcrypt.hashSync('ahmed123', salt),
      fullName: 'أحمد محمود (كبير الميكانيكيين)',
      phone: '+966500000004',
      email: 'ahmed@elitemech.sa',
      roleId: 'role_mechanic',
      specialty: 'ميكانيكا محركات وجيربكس'
    },
    {
      id: 'usr_mech_mahmoud',
      username: 'mahmoud',
      passwordHash: bcrypt.hashSync('mahmoud123', salt),
      fullName: 'محمود عبد العزيز (أخصائي كشف وتشخيص)',
      phone: '+966500000005',
      email: 'mahmoud@elitemech.sa',
      roleId: 'role_mechanic',
      specialty: 'كهرباء وبرمجة وتشخيص كمبيوتر'
    },
    {
      id: 'usr_accountant',
      username: 'accountant',
      passwordHash: bcrypt.hashSync('accountant123', salt),
      fullName: 'ياسر المنصور (محاسب الورشة)',
      phone: '+966500000006',
      email: 'finance@elitemech.sa',
      roleId: 'role_accountant',
      specialty: 'محاسبة تكاليف وفواتير'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, workshop_id, username, password_hash, full_name, phone, email, role_id, specialty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, workshopId, u.username, u.passwordHash, u.fullName, u.phone, u.email, u.roleId, u.specialty);
  }

  // 5. Initial Spare Parts Catalog (Standard consumables with real part numbers)
  const initialParts = [
    { id: 'part_01', pn: '04152-YZZA6', name: 'فلتر زيت تويوتا أصلي', cat: 'فلاتر', brand: 'Toyota Genuine', type: 'Original', cost: 22.0, sale: 35.0, stock: 45, min: 10, loc: 'رف A-1' },
    { id: 'part_02', pn: '17801-21050', name: 'فلتر هواء محرك تويوتا', cat: 'فلاتر', brand: 'Toyota Genuine', type: 'Original', cost: 45.0, sale: 70.0, stock: 20, min: 5, loc: 'رف A-2' },
    { id: 'part_03', pn: '04465-02220', name: 'طقم أقمشة فرامل أمامية (تيل فرامل)', cat: 'فرامل', brand: 'Advics / OEM', type: 'Original', cost: 140.0, sale: 220.0, stock: 12, min: 3, loc: 'رف B-1' },
    { id: 'part_04', pn: '04466-02180', name: 'طقم أقمشة فرامل خلفية', cat: 'فرامل', brand: 'Advics / OEM', type: 'Original', cost: 110.0, sale: 180.0, stock: 10, min: 3, loc: 'رف B-2' },
    { id: 'part_05', pn: 'ILKAR7B11', name: 'طقم بواجي إيريديوم ليزر (4 حبات)', cat: 'كهرباء', brand: 'NGK Laser Iridium', type: 'Original', cost: 160.0, sale: 260.0, stock: 15, min: 4, loc: 'رف C-1' },
    { id: 'part_06', pn: '11428570590', name: 'فلتر زيت محرك BMW N20/N26/B48', cat: 'فلاتر', brand: 'Mann-Filter', type: 'OEM', cost: 35.0, sale: 60.0, stock: 18, min: 5, loc: 'رف A-3' },
    { id: 'part_07', pn: '34116850885', name: 'تيل فرامل أمامي سيراميك BMW 320', cat: 'فرامل', brand: 'Brembo', type: 'Aftermarket', cost: 210.0, sale: 340.0, stock: 6, min: 2, loc: 'رف B-3' },
    { id: 'part_08', pn: 'MOB-5W30-1L', name: 'زيت محرك تخليقي بالكامل 5W-30 (1 لتر)', cat: 'زيوت', brand: 'Mobil 1 ESP', type: 'Original', cost: 32.0, sale: 48.0, stock: 120, min: 24, loc: 'مستودع السوائل' },
    { id: 'part_09', pn: 'CAS-5W30-EDGE', name: 'زيت كاسترول إيدج تيتانيوم 5W-30 (1 لتر)', cat: 'زيوت', brand: 'Castrol Edge', type: 'Original', cost: 30.0, sale: 45.0, stock: 95, min: 20, loc: 'مستودع السوائل' },
    { id: 'part_10', pn: 'TOY-ATF-WS', name: 'زيت قير تويوتا أوتوماتيك ATF WS (4 لتر)', cat: 'زيوت', brand: 'Toyota Genuine', type: 'Original', cost: 150.0, sale: 220.0, stock: 14, min: 4, loc: 'مستودع السوائل' }
  ];

  const insertPart = db.prepare(`
    INSERT INTO parts (id, workshop_id, part_number, name, category, brand, type, cost_price, sale_price, stock_quantity, min_stock_alert, storage_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of initialParts) {
    insertPart.run(p.id, workshopId, p.pn, p.name, p.cat, p.brand, p.type, p.cost, p.sale, p.stock, p.min, p.loc);
  }

  console.log('Seeding finished successfully.');
}

if (require.main === module) {
  seedDatabase();
}
