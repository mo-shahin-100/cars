-- ============================================================
-- نظام إدارة ورشة ميكانيكا السيارات — Workshop Management Schema
-- محرك قاعدة البيانات: PostgreSQL Relational Database Engine
-- ============================================================

-- 1. الورش والفروع (Workshops)
CREATE TABLE IF NOT EXISTS workshops (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    commercial_reg VARCHAR(100),
    tax_number VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'EGP',
    tax_rate NUMERIC(5,2) DEFAULT 15.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. الأدوار والصلاحيات (Roles & Permissions)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(100) NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 3. المستخدمون والفنيون (Users & Technicians)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(150),
    role_id VARCHAR(100) NOT NULL,
    specialty VARCHAR(150),
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    is_active SMALLINT DEFAULT 1,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 4. العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    customer_code VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    phone_secondary VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    notes TEXT,
    total_balance_due NUMERIC(12,2) DEFAULT 0.0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- 5. السيارات (Vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    plate_number VARCHAR(100) NOT NULL,
    vin VARCHAR(100) UNIQUE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    engine_number VARCHAR(100),
    engine_capacity VARCHAR(50),
    fuel_type VARCHAR(50) DEFAULT 'بنزين',
    transmission_type VARCHAR(50) DEFAULT 'أوتوماتيك',
    current_odometer INTEGER DEFAULT 0,
    current_owner_id VARCHAR(100) NOT NULL,
    notes TEXT,
    first_visit_at TIMESTAMPTZ NULL,
    last_visit_at TIMESTAMPTZ NULL,
    total_spent NUMERIC(12,2) DEFAULT 0.0,
    next_maintenance_date DATE NULL,
    next_maintenance_km INTEGER NULL,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (current_owner_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(current_owner_id);

-- 6. تاريخ انتقال الملكية (Vehicle Ownership History)
CREATE TABLE IF NOT EXISTS vehicle_ownership_history (
    id VARCHAR(100) PRIMARY KEY,
    vehicle_id VARCHAR(100) NOT NULL,
    previous_owner_id VARCHAR(100) NOT NULL,
    new_owner_id VARCHAR(100) NOT NULL,
    transfer_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    transfer_odometer INTEGER,
    reason TEXT,
    transferred_by VARCHAR(100) NOT NULL,
    notes TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_owner_id) REFERENCES customers(id),
    FOREIGN KEY (new_owner_id) REFERENCES customers(id),
    FOREIGN KEY (transferred_by) REFERENCES users(id)
);

-- 7. زيارات الورشة (Work Visits)
CREATE TABLE IF NOT EXISTS visits (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    visit_number VARCHAR(100) NOT NULL UNIQUE,
    vehicle_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    entry_datetime TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    exit_datetime TIMESTAMPTZ NULL,
    odometer_in INTEGER NOT NULL,
    odometer_out INTEGER NULL,
    fuel_level VARCHAR(50),
    customer_complaint TEXT NOT NULL,
    intake_condition TEXT,
    initial_inspection TEXT,
    status VARCHAR(50) DEFAULT 'received',
    notes TEXT,
    received_by VARCHAR(100) NOT NULL,
    delivered_by VARCHAR(100) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    visit_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'repair',
    description TEXT NOT NULL,
    inspection_result TEXT,
    priority VARCHAR(50) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'new',
    estimated_cost NUMERIC(12,2) DEFAULT 0.0,
    actual_cost NUMERIC(12,2) DEFAULT 0.0,
    estimated_hours NUMERIC(6,2) DEFAULT 0.0,
    actual_hours NUMERIC(6,2) DEFAULT 0.0,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_workorders_visit ON work_orders(visit_id);

-- 9. المهام التشغيلية وأعمال الصيانة (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(100) PRIMARY KEY,
    work_order_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) DEFAULT 0.0,
    lead_mechanic_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    start_time TIMESTAMPTZ NULL,
    end_time TIMESTAMPTZ NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_mechanic_id) REFERENCES users(id)
);

-- 10. إسناد المهام للميكانيكيين (Task Assignments)
CREATE TABLE IF NOT EXISTS task_assignments (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    role_in_task VARCHAR(50) DEFAULT 'lead',
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    hours_worked NUMERIC(6,2) DEFAULT 0.0,
    notes TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. تشخيص الأعطال وتقارير الأجهزة (Diagnostics)
CREATE TABLE IF NOT EXISTS diagnostics (
    id VARCHAR(100) PRIMARY KEY,
    visit_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100) NOT NULL,
    scanner_manufacturer VARCHAR(100),
    scanner_model VARCHAR(100),
    test_datetime TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    system_tested VARCHAR(150) NOT NULL,
    freeze_frame_json JSONB,
    live_data_json JSONB,
    technician_notes TEXT,
    technician_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- 12. أكواد الأعطال (Diagnostic DTC Codes)
CREATE TABLE IF NOT EXISTS diagnostic_codes (
    id VARCHAR(100) PRIMARY KEY,
    diagnostic_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100) NOT NULL,
    dtc_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    system VARCHAR(100),
    status_at_test VARCHAR(50) DEFAULT 'Current',
    is_confirmed_by_tech SMALLINT DEFAULT 0,
    resolution_status VARCHAR(50) DEFAULT 'detected',
    repair_action TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diagnostic_id) REFERENCES diagnostics(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);
CREATE INDEX IF NOT EXISTS idx_dtc_code ON diagnostic_codes(dtc_code);
CREATE INDEX IF NOT EXISTS idx_dtc_vehicle ON diagnostic_codes(vehicle_id);

-- 13. دليل قطع الغيار والمخزون (Parts & Inventory)
CREATE TABLE IF NOT EXISTS parts (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    type VARCHAR(50) DEFAULT 'Original',
    supplier_name VARCHAR(200),
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 2,
    storage_location VARCHAR(100),
    warranty_months INTEGER DEFAULT 0,
    description TEXT,
    image_url TEXT,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);
CREATE INDEX IF NOT EXISTS idx_parts_number ON parts(part_number);

-- 14. حركات المخزون (Stock Movements)
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    part_id VARCHAR(100) NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) DEFAULT 0.0,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    idempotency_key VARCHAR(255) UNIQUE,
    customer_id VARCHAR(100) NULL,
    customer_name VARCHAR(200) NULL,
    notes TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_idempotency ON stock_movements(idempotency_key);

-- 15. قطع الغيار المستهلكة في المهام (Used Parts in Work Orders)
CREATE TABLE IF NOT EXISTS used_parts (
    id VARCHAR(100) PRIMARY KEY,
    work_order_id VARCHAR(100) NOT NULL,
    task_id VARCHAR(100),
    part_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    stock_movement_id VARCHAR(100) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (stock_movement_id) REFERENCES stock_movements(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 16. الزيوت وسوائل الصيانة الدورية (Oil & Fluid Records)
CREATE TABLE IF NOT EXISTS oil_fluid_records (
    id VARCHAR(100) PRIMARY KEY,
    visit_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100) NOT NULL,
    fluid_type VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    product_name VARCHAR(150),
    viscosity VARCHAR(50),
    specifications VARCHAR(150),
    quantity_liters NUMERIC(6,2) NOT NULL,
    filter_part_number VARCHAR(100),
    filter_replaced SMALLINT DEFAULT 1,
    cost NUMERIC(12,2) DEFAULT 0.0,
    price NUMERIC(12,2) DEFAULT 0.0,
    service_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    current_odometer INTEGER NOT NULL,
    next_due_date DATE,
    next_due_km INTEGER,
    technician_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_oil_vehicle ON oil_fluid_records(vehicle_id);

-- 17. الفواتير المالية للعملاء (Customer Invoices)
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    visit_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100) NOT NULL,
    work_order_id VARCHAR(100),
    labor_total NUMERIC(12,2) DEFAULT 0.0,
    parts_total NUMERIC(12,2) DEFAULT 0.0,
    fluids_total NUMERIC(12,2) DEFAULT 0.0,
    discount_amount NUMERIC(12,2) DEFAULT 0.0,
    tax_percent NUMERIC(5,2) DEFAULT 15.0,
    tax_amount NUMERIC(12,2) DEFAULT 0.0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'unpaid',
    issue_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NULL,
    notes TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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
    id VARCHAR(100) PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    part_id VARCHAR(100),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- 19. المدفوعات وسندات القبض (Payments & Receipts)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    received_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- 20. المصروفات العامة (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    expense_number VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    recipient VARCHAR(200),
    description TEXT NOT NULL,
    receipt_attachment_url TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 21. المرفقات والصور (Attachments)
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100),
    visit_id VARCHAR(100),
    work_order_id VARCHAR(100),
    task_id VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    caption TEXT,
    uploaded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 22. التنبيهات والإشعارات (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    is_read SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 23. سجل النشاط والتدقيق (Activity / Audit Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details_json JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_name, entity_id);

-- 24. سجل أحداث المزامنة (Sync Events)
CREATE TABLE IF NOT EXISTS sync_events (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    payload_json JSONB NOT NULL,
    origin_device VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_events_time ON sync_events(created_at);

-- 25. دليل الموردين (Suppliers & Vendors)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    tax_number VARCHAR(100),
    address TEXT,
    category VARCHAR(100) DEFAULT 'قطع غيار',
    payment_terms VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);
CREATE INDEX IF NOT EXISTS idx_suppliers_workshop ON suppliers(workshop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 26. فواتير مشتريات الموردين (Purchase / Supplier Invoices)
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id VARCHAR(100) PRIMARY KEY,
    workshop_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(100),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_phone VARCHAR(50),
    supplier_tax_number VARCHAR(100),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    tax_percent NUMERIC(5,2) DEFAULT 15.0,
    tax_amount NUMERIC(12,2) DEFAULT 0.0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    payment_status VARCHAR(50) DEFAULT 'paid',
    payment_method VARCHAR(50) DEFAULT 'cash',
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    notes TEXT,
    invoice_image_url TEXT,
    created_by VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_number ON purchase_invoices(invoice_number);

-- 27. بنود فواتير مشتريات الموردين (Purchase Invoice Items)
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id VARCHAR(100) PRIMARY KEY,
    purchase_invoice_id VARCHAR(100) NOT NULL,
    part_id VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.0,
    update_inventory SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_invoice_items(purchase_invoice_id);
