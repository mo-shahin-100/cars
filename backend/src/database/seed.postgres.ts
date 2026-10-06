import bcrypt from 'bcryptjs';
import { pgDb, initPostgresDatabase, testPostgresConnection } from './pg';

export async function seedPostgresDatabase() {
  const isConnected = await testPostgresConnection();
  if (!isConnected) {
    console.error('[PostgreSQL Seed] Cannot connect to PostgreSQL database. Check DATABASE_URL in .env');
    return;
  }

  await initPostgresDatabase();

  const countRow = await pgDb.get<{ count: string | number }>('SELECT COUNT(*) as count FROM workshops');
  const count = Number(countRow?.count || 0);
  if (count > 0) {
    console.log('[PostgreSQL Seed] Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('[PostgreSQL Seed] Seeding initial workshop, roles, permissions, users, and suppliers...');

  const workshopId = 'ws_default_01';
  await pgDb.run(`
    INSERT INTO workshops (id, name, commercial_reg, tax_number, phone, email, address, currency, tax_rate)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    workshopId,
    'مركز النخبة المتقدم لصيانة وبرمجة السيارات',
    '1010987654',
    '300987654300003',
    '+966501234567',
    'info@elitemech.sa',
    'الرياض — الصناعية القديمة — طريق الخرج',
    'EGP',
    15.0
  ]);

  // 1. Roles
  const roles = [
    { id: 'role_owner', name: 'owner', display_name: 'صاحب الورشة (Owner)', description: 'صلاحيات كاملة وغير مقيدة على كافة أقسام النظام والماليات والنسخ الاحتياطي' },
    { id: 'role_manager', name: 'manager', display_name: 'المدير (Manager)', description: 'إدارة تشغيلية وتوزيع المهام على الفنيين ومتابعة أوامر العمل والمخزون' },
    { id: 'role_reception', name: 'reception', display_name: 'موظف الاستقبال (Reception)', description: 'استقبال العملاء، تسجيل السيارات، فتح الزيارات، وإصدار أولي لأوامر العمل' },
    { id: 'role_mechanic', name: 'mechanic', display_name: 'الميكانيكي / الفني (Mechanic)', description: 'استعراض المهام المسندة، تحديث حالة الإنجاز، رفع صور الفحص، وإدخال أكواد DTC' },
    { id: 'role_accountant', name: 'accountant', display_name: 'المحاسب (Accountant)', description: 'إدارة الفواتير، سندات القبض، المدفوعات الجزئية، المصروفات، والتقارير المالية' }
  ];

  for (const r of roles) {
    await pgDb.run('INSERT INTO roles (id, name, display_name, description) VALUES ($1, $2, $3, $4)', [r.id, r.name, r.display_name, r.description]);
  }

  // 2. Permissions
  const permissions = [
    { id: 'p_settings_manage', code: 'settings.manage', category: 'الإعدادات', description: 'إدارة إعدادات الورشة والنسخ الاحتياطي' },
    { id: 'p_users_manage', code: 'users.manage', category: 'المستخدمين', description: 'إدارة حسابات المستخدمين وتعيين الصلاحيات' },
    { id: 'p_users_view', code: 'users.view', category: 'المستخدمين', description: 'عرض قائمة الموظفين والفنيين' },
    { id: 'p_customers_view', code: 'customers.view', category: 'العملاء', description: 'عرض بيانات وسجلات العملاء' },
    { id: 'p_customers_create', code: 'customers.create', category: 'العملاء', description: 'إضافة عميل جديد' },
    { id: 'p_customers_update', code: 'customers.update', category: 'العملاء', description: 'تعديل بيانات العميل' },
    { id: 'p_vehicles_view', code: 'vehicles.view', category: 'السيارات', description: 'عرض السيارات والتايم لاين التاريخي' },
    { id: 'p_vehicles_create', code: 'vehicles.create', category: 'السيارات', description: 'تسجيل سيارة جديدة' },
    { id: 'p_vehicles_update', code: 'vehicles.update', category: 'السيارات', description: 'تعديل بيانات السيارة ونقل الملكية' },
    { id: 'p_visits_view', code: 'visits.view', category: 'الزيارات', description: 'عرض زيارات الورشة' },
    { id: 'p_visits_create', code: 'visits.create', category: 'الزيارات', description: 'تسجيل دخول سيارة جديدة' },
    { id: 'p_visits_update', code: 'visits.update', category: 'الزيارات', description: 'تحديث حالة الزيارة والتسليم' },
    { id: 'p_work_orders_view', code: 'work_orders.view', category: 'أوامر العمل', description: 'عرض أوامر الإصلاح والمهام' },
    { id: 'p_work_orders_create', code: 'work_orders.create', category: 'أوامر العمل', description: 'إنشاء أمر إصلاح وتحديد التكلفة' },
    { id: 'p_work_orders_update', code: 'work_orders.update', category: 'أوامر العمل', description: 'إسناد المهام وتعديل أوامر العمل' },
    { id: 'p_tasks_update', code: 'tasks.update', category: 'المهام', description: 'تحديث حالة المهمة ووقت العمل' },
    { id: 'p_diagnostics_view', code: 'diagnostics.view', category: 'التشخيص', description: 'عرض تقارير الفحص وأكواد DTC' },
    { id: 'p_diagnostics_create', code: 'diagnostics.create', category: 'التشخيص', description: 'تسجيل فحص كمبيوتر وإدخال الأكواد' },
    { id: 'p_fluids_view', code: 'fluids.view', category: 'الزيوت', description: 'عرض سجلات وتنبيهات الزيوت والصيانة' },
    { id: 'p_fluids_create', code: 'fluids.create', category: 'الزيوت', description: 'تسجيل تغيير زيت وحساب موعد الصيانة' },
    { id: 'p_inventory_view', code: 'inventory.view', category: 'المخزون', description: 'عرض دليل قطع الغيار والرصيد' },
    { id: 'p_inventory_manage', code: 'inventory.manage', category: 'المخزون', description: 'إضافة أصناف والتوريد والتسوية المخزنية' },
    { id: 'p_parts_consume', code: 'parts.consume', category: 'المخزون', description: 'صرف قطع غيار لأمر عمل' },
    { id: 'p_invoices_view', code: 'invoices.view', category: 'الماليات', description: 'عرض الفواتير وسندات القبض' },
    { id: 'p_invoices_create', code: 'invoices.create', category: 'الماليات', description: 'إصدار وتعديل الفواتير' },
    { id: 'p_payments_create', code: 'payments.create', category: 'الماليات', description: 'تسجيل دفعات وإصدار إيصالات' },
    { id: 'p_expenses_view', code: 'expenses.view', category: 'الماليات', description: 'عرض سجل المصروفات' },
    { id: 'p_expenses_create', code: 'expenses.create', category: 'الماليات', description: 'تسجيل مصروفات الورشة' },
    { id: 'p_reports_financial', code: 'reports.financial', category: 'التقارير', description: 'الاطلاع على تقارير الأرباح والمبيعات' },
    { id: 'p_reports_manage', code: 'reports.manage', category: 'التقارير', description: 'تقارير الإنتاجية وساعات الفنيين' }
  ];

  for (const p of permissions) {
    await pgDb.run('INSERT INTO permissions (id, code, category, description) VALUES ($1, $2, $3, $4)', [p.id, p.code, p.category, p.description]);
  }

  // 3. Role Permissions
  for (const p of permissions) {
    await pgDb.run('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', ['role_owner', p.id]);
  }

  // 4. Initial Users
  const salt = bcrypt.genSaltSync(10);
  const users = [
    { id: 'u_owner_01', u: 'admin', p: 'admin123', name: 'م. محمد عاطف', phone: '+966500000001', role: 'role_owner', spec: 'إدارة وهندسة تشخيص' },
    { id: 'u_mgr_01', u: 'manager', p: 'manager123', name: 'أ. طارق عبد العزيز', phone: '+966500000002', role: 'role_manager', spec: 'إشراف عام وصيانة' },
    { id: 'u_rec_01', u: 'reception', p: 'reception123', name: 'سارة إبراهيم', phone: '+966500000003', role: 'role_reception', spec: 'خدمة عملاء واستقبال' },
    { id: 'u_mech_01', u: 'ahmed', p: 'ahmed123', name: 'أحمد محمود', phone: '+966500000004', role: 'role_mechanic', spec: 'محركات وناقل حركة' },
    { id: 'u_mech_02', u: 'mahmoud', p: 'mahmoud123', name: 'محمود السيد', phone: '+966500000005', role: 'role_mechanic', spec: 'فحص كهرباء وبرمجة' },
    { id: 'u_acc_01', u: 'accountant', p: 'accountant123', name: 'حسام فؤاد', phone: '+966500000006', role: 'role_accountant', spec: 'حسابات ومشتريات' }
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u.p, salt);
    await pgDb.run(`
      INSERT INTO users (id, workshop_id, username, password_hash, full_name, phone, role_id, specialty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [u.id, workshopId, u.u, hash, u.name, u.phone, u.role, u.spec]);
  }

  // 5. Initial Demo Parts
  const demoParts = [
    { id: 'part_img_01', pn: 'FZ-001', name: 'فلتر زيت تويوتا كورولا', cat: 'فلاتر', brand: 'تويوتا', cost: 120, sale: 180, stock: 50, min: 10, loc: 'رف A-1', sup: 'تويوتا الوكالة', desc: 'فلتر زيت أصلي للمحرك' },
    { id: 'part_img_02', pn: 'FA-002', name: 'فلتر هواء محرك', cat: 'فلاتر', brand: 'تويوتا', cost: 150, sale: 220, stock: 30, min: 10, loc: 'رف A-2', sup: 'تويوتا الوكالة', desc: 'فلتر هواء تنقية السحب' },
    { id: 'part_img_03', pn: 'PL-003', name: 'بوجيهات إيريديوم ليزر', cat: 'إشعال', brand: 'NGK', cost: 240, sale: 350, stock: 20, min: 5, loc: 'رف C-1', sup: 'المنصور للسيارات', desc: 'طقم شمعات احتراق إيريديوم' },
    { id: 'part_img_04', pn: 'O-004', name: 'زيت محرك تخليقي 5W30', cat: 'زيوت', brand: 'موبيل', cost: 380, sale: 520, stock: 15, min: 5, loc: 'مستودع الزيوت', sup: 'موبيل مصر', desc: 'زيت محرك تخليقي عالي الأداء' },
    { id: 'part_img_05', pn: 'BR-005', name: 'فحمات فرامل أمامية سيراميك', cat: 'فرامل', brand: 'بريمبو', cost: 680, sale: 950, stock: 12, min: 5, loc: 'رف B-1', sup: 'بوش الوكيل المعتمد', desc: 'طقم تيل فرامل أمامي سيراميك' }
  ];

  for (const p of demoParts) {
    await pgDb.run(`
      INSERT INTO parts (id, workshop_id, part_number, name, category, brand, cost_price, sale_price, stock_quantity, min_stock_alert, storage_location, supplier_name, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [p.id, workshopId, p.pn, p.name, p.cat, p.brand, p.cost, p.sale, p.stock, p.min, p.loc, p.sup, p.desc]);
  }

  console.log('[PostgreSQL Seed] PostgreSQL database seeded successfully!');
}

if (require.main === module) {
  seedPostgresDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
