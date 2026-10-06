-- ============================================================
-- نظام إدارة ورشة ميكانيكا السيارات — Workshop Management Schema
-- المحرك: SQLite Relational Database Engine (WAL Mode)
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. الورش والفروع (Workshops)
CREATE TABLE IF NOT EXISTS workshops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    commercial_reg TEXT,
    tax_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    currency TEXT DEFAULT 'EGP',
    tax_rate REAL DEFAULT 15.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. الأدوار والصلاحيات (Roles & Permissions)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 3. المستخدمون والفنيون (Users & Technicians)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role_id TEXT NOT NULL,
    specialty TEXT, -- e.g., 'ميكانيكا عامة', 'كهرباء وتشخيص', 'تكييف', 'عفشة وهيدروليك'
    hourly_rate REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 4. العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    customer_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_secondary TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    total_balance_due REAL DEFAULT 0.0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- 5. السيارات (Vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    vin TEXT UNIQUE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    color TEXT,
    engine_number TEXT,
    engine_capacity TEXT,
    fuel_type TEXT DEFAULT 'بنزين', -- بنزين, ديزل, هايبرد, كهرباء
    transmission_type TEXT DEFAULT 'أوتوماتيك', -- أوتوماتيك, مانيوال, CVT, دبل كلاتش
    current_odometer INTEGER DEFAULT 0,
    current_owner_id TEXT NOT NULL,
    notes TEXT,
    first_visit_at TIMESTAMP NULL,
    last_visit_at TIMESTAMP NULL,
    total_spent REAL DEFAULT 0.0,
    next_maintenance_date DATE NULL,
    next_maintenance_km INTEGER NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (current_owner_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(current_owner_id);

-- 6. تاريخ انتقال الملكية (Vehicle Ownership History)
CREATE TABLE IF NOT EXISTS vehicle_ownership_history (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    previous_owner_id TEXT NOT NULL,
    new_owner_id TEXT NOT NULL,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transfer_odometer INTEGER,
    reason TEXT,
    transferred_by TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_owner_id) REFERENCES customers(id),
    FOREIGN KEY (new_owner_id) REFERENCES customers(id),
    FOREIGN KEY (transferred_by) REFERENCES users(id)
);

-- 7. زيارات الورشة (Work Visits)
CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    visit_number TEXT NOT NULL UNIQUE,
    vehicle_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    entry_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_datetime TIMESTAMP NULL,
    odometer_in INTEGER NOT NULL,
    odometer_out INTEGER,
    fuel_level TEXT, -- فارغ, ربع, نصف, ثلاثة أرباع, ممتلئ
    customer_complaint TEXT NOT NULL,
    intake_condition TEXT,
    initial_inspection TEXT,
    status TEXT DEFAULT 'received', -- 'received' (استلام), 'diagnosing' (قيد الفحص), 'in_repair' (قيد الإصلاح), 'waiting_parts' (انتظار قطع), 'ready' (جاهزة للتسليم), 'delivered' (تم التسليم), 'cancelled' (ملغية)
    notes TEXT,
    received_by TEXT NOT NULL,
    delivered_by TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    FOREIGN KEY (delivered_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_visits_vehicle ON visits(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- 8. أوامر الإصلاح (Work Orders)
CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    visit_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    description TEXT NOT NULL,
    inspection_result TEXT,
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    status TEXT DEFAULT 'new', -- new, diagnosing, customer_approval, in_progress, waiting_parts, paused, completed, ready, delivered, cancelled
    estimated_cost REAL DEFAULT 0.0,
    actual_cost REAL DEFAULT 0.0,
    estimated_hours REAL DEFAULT 0.0,
    actual_hours REAL DEFAULT 0.0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_workorders_visit ON work_orders(visit_id);

-- 9. المهام التشغيلية وأعمال الصيانة (Tasks & Maintenance Services)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0.0,
    lead_mechanic_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, paused, cancelled
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_mechanic_id) REFERENCES users(id)
);

-- 10. إسناد المهام للميكانيكيين (Task Assignments)
CREATE TABLE IF NOT EXISTS task_assignments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_in_task TEXT DEFAULT 'lead', -- lead, assistant, inspector
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    hours_worked REAL DEFAULT 0.0,
    notes TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. تشخيص الأعطال وتقارير الأجهزة (Diagnostics)
CREATE TABLE IF NOT EXISTS diagnostics (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    scanner_manufacturer TEXT, -- e.g. Autel, Launch, Bosch, Snap-on, Topdon
    scanner_model TEXT,
    test_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    system_tested TEXT NOT NULL, -- e.g. Engine, Transmission, ABS/ESP, Airbag, BCM, AC
    freeze_frame_json TEXT, -- Freezed sensor values
    live_data_json TEXT, -- Live parameters during test
    technician_notes TEXT,
    technician_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- 12. أكواد الأعطال (Diagnostic DTC Codes)
CREATE TABLE IF NOT EXISTS diagnostic_codes (
    id TEXT PRIMARY KEY,
    diagnostic_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    dtc_code TEXT NOT NULL, -- e.g. P0301, P0420, C0035, U0100
    description TEXT NOT NULL,
    system TEXT, -- Engine, Powertrain, Chassis, Body, Network
    status_at_test TEXT DEFAULT 'Current', -- Current, Pending, History, Permanent
    is_confirmed_by_tech INTEGER DEFAULT 0,
    resolution_status TEXT DEFAULT 'detected', -- detected, repairing, resolved_verified, persisted
    repair_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diagnostic_id) REFERENCES diagnostics(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);
CREATE INDEX IF NOT EXISTS idx_dtc_code ON diagnostic_codes(dtc_code);
CREATE INDEX IF NOT EXISTS idx_dtc_vehicle ON diagnostic_codes(vehicle_id);

-- 13. دليل قطع الغيار والمخزون (Parts & Inventory)
CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT, -- فرامل, محرك, تبريد, كهرباء, عفشة, فلاتر, زيوت
    brand TEXT, -- Bosch, Denso, NGK, OEM, Febi, etc.
    type TEXT DEFAULT 'Original', -- Original, Aftermarket, Rebuilt
    supplier_name TEXT,
    cost_price REAL NOT NULL DEFAULT 0.0,
    sale_price REAL NOT NULL DEFAULT 0.0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 2,
    storage_location TEXT, -- e.g. 'رف A-3'
    warranty_months INTEGER DEFAULT 0,
    description TEXT,
    image_url TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);
CREATE INDEX IF NOT EXISTS idx_parts_number ON parts(part_number);

-- 14. حركات المخزون مع مفتاح عدم التكرار (Stock Movements & Idempotency)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    part_id TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- 'purchase' (شراء), 'consumption' (صرف لأمر عمل), 'adjustment' (تسوية), 'return' (مرتجع)
    quantity INTEGER NOT NULL, -- موجب للتوريد، سالب للصرف
    unit_cost REAL NOT NULL,
    unit_price REAL DEFAULT 0.0,
    reference_type TEXT, -- 'work_order', 'task', 'purchase_invoice'
    reference_id TEXT,
    idempotency_key TEXT UNIQUE, -- لمنع التكرار عند إعادة الإرسال
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_idempotency ON stock_movements(idempotency_key);

-- 15. قطع الغيار المستهلكة في المهام (Used Parts in Work Orders)
CREATE TABLE IF NOT EXISTS used_parts (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL,
    task_id TEXT,
    part_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    stock_movement_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (stock_movement_id) REFERENCES stock_movements(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 16. الزيوت وسوائل الصيانة الدورية (Oil & Fluid Records)
CREATE TABLE IF NOT EXISTS oil_fluid_records (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    fluid_type TEXT NOT NULL, -- 'زيت محرك', 'زيت جيربكس', 'زيت فرامل', 'سائل تبريد', 'زيت دفرنس'
    brand TEXT NOT NULL, -- Castrol, Mobil 1, Shell, Motul, etc.
    product_name TEXT,
    viscosity TEXT, -- 5W-30, 0W-20, 10W-40, ATF WS, DOT 4, etc.
    specifications TEXT, -- API SP, ILSAC GF-6A, ACEA C3
    quantity_liters REAL NOT NULL,
    filter_part_number TEXT,
    filter_replaced INTEGER DEFAULT 1,
    cost REAL DEFAULT 0.0,
    price REAL DEFAULT 0.0,
    service_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_odometer INTEGER NOT NULL,
    next_due_date DATE,
    next_due_km INTEGER,
    technician_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_oil_vehicle ON oil_fluid_records(vehicle_id);

-- 17. الفواتير المالية (Invoices)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    visit_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    work_order_id TEXT,
    labor_total REAL DEFAULT 0.0,
    parts_total REAL DEFAULT 0.0,
    fluids_total REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    tax_percent REAL DEFAULT 15.0,
    tax_amount REAL DEFAULT 0.0,
    grand_total REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    balance_due REAL NOT NULL DEFAULT 0.0,
    status TEXT DEFAULT 'unpaid', -- unpaid, partially_paid, paid, cancelled
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- 18. بنود الفاتورة (Invoice Items)
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'labor', 'part', 'fluid', 'fee'
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    part_id TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- 19. المدفوعات وسندات القبض (Payments & Receipts)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash' (نقدي), 'card' (مدى/بطاقة), 'transfer' (تحويل بنكي), 'other'
    reference_number TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    received_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- 20. المصروفات العامة (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    expense_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- إيجار, رواتب, فواتير كهرباء ومياه, أدوات وصيانة, شحن وضيافة, أخرى
    amount REAL NOT NULL,
    expense_date DATE DEFAULT (DATE('now')),
    payment_method TEXT DEFAULT 'cash',
    recipient TEXT,
    description TEXT NOT NULL,
    receipt_attachment_url TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 21. المرفقات والصور والمستندات (Attachments)
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    vehicle_id TEXT,
    visit_id TEXT,
    work_order_id TEXT,
    task_id TEXT,
    category TEXT NOT NULL, -- 'before_repair', 'after_repair', 'damage', 'odometer', 'diagnostic_screen', 'scanner_pdf', 'invoice_scan', 'other'
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    caption TEXT,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 22. التنبيهات والإشعارات (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    user_id TEXT, -- NULL تعني موجهة لكافة أعضاء الورشة المؤهلين
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL, -- 'maintenance_due', 'low_stock', 'task_delayed', 'vehicle_ready', 'unpaid_invoice', 'sync_alert'
    reference_type TEXT,
    reference_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 23. سجل النشاط والتدقيق (Activity / Audit Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, STATUS_CHANGE, PAYMENT, EXPORT, BACKUP
    entity_name TEXT NOT NULL, -- vehicle, customer, work_order, invoice, part, etc.
    entity_id TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_name, entity_id);

-- 24. سجل أحداث المزامنة للأجهزة النشطة والأوفلاين (Sync Events)
CREATE TABLE IF NOT EXISTS sync_events (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload_json TEXT NOT NULL,
    origin_device TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_events_time ON sync_events(created_at);

-- 25. دليل الموردين (Suppliers & Vendors)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    address TEXT,
    category TEXT DEFAULT 'قطع غيار', -- قطع غيار, زيوت وسوائل, بطاريات وإطارات, كهرباء ولمبات, أدوات ومعدات, متنوع
    payment_terms TEXT DEFAULT 'cash', -- 'cash', 'credit_15', 'credit_30', 'credit_60'
    notes TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);
CREATE INDEX IF NOT EXISTS idx_suppliers_workshop ON suppliers(workshop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 26. فواتير مشتريات الموردين (Purchase / Supplier Invoices)
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    supplier_id TEXT,
    supplier_name TEXT NOT NULL,
    supplier_phone TEXT,
    supplier_tax_number TEXT,
    subtotal REAL NOT NULL DEFAULT 0.0,
    tax_percent REAL DEFAULT 15.0,
    tax_amount REAL DEFAULT 0.0,
    grand_total REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    balance_due REAL NOT NULL DEFAULT 0.0,
    payment_status TEXT DEFAULT 'paid', -- 'paid', 'partially_paid', 'unpaid'
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'transfer', 'card', 'credit'
    invoice_date DATE DEFAULT (DATE('now')),
    due_date DATE,
    notes TEXT,
    invoice_image_url TEXT,
    created_by TEXT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_number ON purchase_invoices(invoice_number);

-- 27. بنود فواتير مشتريات الموردين (Purchase Invoice Items)
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id TEXT PRIMARY KEY,
    purchase_invoice_id TEXT NOT NULL,
    part_id TEXT,
    item_name TEXT NOT NULL,
    part_number TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost REAL NOT NULL DEFAULT 0.0,
    total_cost REAL NOT NULL DEFAULT 0.0,
    update_inventory INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_invoice_items(purchase_invoice_id);


