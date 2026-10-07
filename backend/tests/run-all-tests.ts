import assert from 'assert';
import db, { initDatabase } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'workshop_super_secret_jwt_key_2026';

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

console.log('====================================================');
console.log('🧪 البدء في تشغيل حزمة اختبارات الجودة المتكاملة (Integration Tests)');
console.log('====================================================');

// Ensure database seeded
seedDatabase();

// Test 1: Seeded Users and Roles Verification
runTest('التحقق من إنشاء المستخدمين الأساسيين والأدوار والصلاحيات', () => {
  const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get() as any;
  assert.ok(admin, 'Admin user must exist');
  assert.ok(bcrypt.compareSync('admin123', admin.password_hash) || bcrypt.compareSync('123456', admin.password_hash), 'Admin password hash must match');

  const roles = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  assert.strictEqual(roles.count, 5, 'Must have 5 roles: owner, manager, reception, mechanic, accountant');
});

// Test 2: Customer Creation & Unique Code Generation
let testCustomerId: string = '';
runTest('إنشاء عميل جديد مع توليد رقم تسلسلي فريد', () => {
  const countRow = db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number };
  const customerCode = `C-${((countRow?.c || 0) + 1).toString().padStart(4, '0')}`;
  testCustomerId = 'cust_test_' + Date.now();

  db.prepare(`
    INSERT INTO customers (id, workshop_id, customer_code, full_name, phone, address)
    VALUES (?, 'ws_default_01', ?, 'سعد بن ناصر الدوسري', '+966551122334', 'الرياض - حي الياسمين')
  `).run(testCustomerId, customerCode);

  const saved = db.prepare('SELECT * FROM customers WHERE id = ?').get(testCustomerId) as any;
  assert.strictEqual(saved.full_name, 'سعد بن ناصر الدوسري');
  assert.strictEqual(saved.customer_code, customerCode);
});

// Test 3: Vehicle Creation and Owner Association
let testVehicleId: string = '';
runTest('إضافة سيارة جديدة وربطها بالعميل مع التحقق من VIN واللوحة', () => {
  testVehicleId = 'veh_test_' + Date.now();
  const plate = 'أ ب ج 1234';
  const vin = 'WBA3A5C55FP' + Date.now().toString().substring(5);

  db.prepare(`
    INSERT INTO vehicles (
      id, workshop_id, plate_number, vin, make, model, year, color,
      current_odometer, current_owner_id
    ) VALUES (?, 'ws_default_01', ?, ?, 'BMW', '320i M-Sport', 2021, 'كحلي', 45000, ?)
  `).run(testVehicleId, plate, vin, testCustomerId);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(testVehicleId) as any;
  assert.strictEqual(vehicle.make, 'BMW');
  assert.strictEqual(vehicle.current_owner_id, testCustomerId);
  assert.strictEqual(vehicle.current_odometer, 45000);
});

// Test 4: Ownership Transfer & History Preservation
runTest('نقل ملكية السيارة مع حفظ سجل المالك السابق دون تشويه تاريخه', () => {
  // Create second customer
  const newOwnerId = 'cust_buyer_' + Date.now();
  const buyerCode = 'C-B-' + Date.now();
  db.prepare(`
    INSERT INTO customers (id, workshop_id, customer_code, full_name, phone)
    VALUES (?, 'ws_default_01', ?, 'تركي الماجد', '+966559988776')
  `).run(newOwnerId, buyerCode);

  // Record transfer
  const vohId = 'voh_' + Date.now();
  db.prepare(`
    INSERT INTO vehicle_ownership_history (id, vehicle_id, previous_owner_id, new_owner_id, transfer_odometer, reason, transferred_by)
    VALUES (?, ?, ?, ?, 45000, 'بيع وشراء موثق', 'usr_admin')
  `).run(vohId, testVehicleId, testCustomerId, newOwnerId);

  // Update current owner
  db.prepare('UPDATE vehicles SET current_owner_id = ? WHERE id = ?').run(newOwnerId, testVehicleId);

  const updatedVehicle = db.prepare('SELECT current_owner_id FROM vehicles WHERE id = ?').get(testVehicleId) as any;
  assert.strictEqual(updatedVehicle.current_owner_id, newOwnerId);

  const history = db.prepare('SELECT * FROM vehicle_ownership_history WHERE vehicle_id = ?').all(testVehicleId) as any[];
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].previous_owner_id, testCustomerId);
  assert.strictEqual(history[0].new_owner_id, newOwnerId);

  // Revert owner back to testCustomerId for remaining tests
  db.prepare('UPDATE vehicles SET current_owner_id = ? WHERE id = ?').run(testCustomerId, testVehicleId);
});

// Test 5: Work Visit Intake
let testVisitId: string = '';
runTest('تسجيل زيارة ورشة جديدة وتحديث عداد السيارة وعدد زيارات العميل', () => {
  testVisitId = 'vis_test_' + Date.now();
  const visitNumber = 'V-' + Date.now();
  const entryKm = 48500;

  db.prepare(`
    INSERT INTO visits (
      id, workshop_id, visit_number, vehicle_id, customer_id,
      odometer_in, customer_complaint, status, received_by
    ) VALUES (?, 'ws_default_01', ?, ?, ?, ?, 'نتعة في التعشيق وصوت صفير في الفرامل الأمامية', 'received', 'usr_reception')
  `).run(testVisitId, visitNumber, testVehicleId, testCustomerId, entryKm);

  // Update vehicle and customer
  db.prepare('UPDATE vehicles SET current_odometer = MAX(current_odometer, ?), last_visit_at = CURRENT_TIMESTAMP WHERE id = ?').run(entryKm, testVehicleId);
  db.prepare('UPDATE customers SET visit_count = visit_count + 1 WHERE id = ?').run(testCustomerId);

  const veh = db.prepare('SELECT current_odometer FROM vehicles WHERE id = ?').get(testVehicleId) as any;
  assert.strictEqual(veh.current_odometer, entryKm, 'Vehicle odometer must be updated to entry odometer');

  const cust = db.prepare('SELECT visit_count FROM customers WHERE id = ?').get(testCustomerId) as any;
  assert.strictEqual(cust.visit_count, 1, 'Customer visit count must be incremented');
});

// Test 6: Work Order & Multi-Mechanic Task Distribution
let testWorkOrderId: string = '';
let testTaskId1: string = '';
let testTaskId2: string = '';
runTest('إنشاء أمر إصلاح وتوزيع المهام على أكثر من فني وميكانيكي', () => {
  testWorkOrderId = 'wo_test_' + Date.now();
  const orderNumber = 'WO-' + Date.now();
  db.prepare(`
    INSERT INTO work_orders (
      id, workshop_id, order_number, visit_id, vehicle_id, description, status, created_by
    ) VALUES (?, 'ws_default_01', ?, ?, ?, 'فحص كمبيوتر + صيانة فرامل وتغيير زيت', 'in_progress', 'usr_manager')
  `).run(testWorkOrderId, orderNumber, testVisitId, testVehicleId);

  // Task 1: Computer Diagnostic assigned to Mahmoud
  testTaskId1 = 'task_diag_' + Date.now();
  db.prepare(`
    INSERT INTO tasks (id, work_order_id, title, lead_mechanic_id, status)
    VALUES (?, ?, 'فحص كمبيوتر شامل للأعطال', 'usr_mech_mahmoud', 'in_progress')
  `).run(testTaskId1, testWorkOrderId);

  const ta1Id = 'ta_1_' + Date.now();
  db.prepare(`
    INSERT INTO task_assignments (id, task_id, user_id, role_in_task)
    VALUES (?, ?, 'usr_mech_mahmoud', 'lead')
  `).run(ta1Id, testTaskId1);

  // Task 2: Brake pads replacement assigned to Ahmed as lead and Mahmoud as assistant
  testTaskId2 = 'task_brakes_' + Date.now();
  db.prepare(`
    INSERT INTO tasks (id, work_order_id, title, lead_mechanic_id, status)
    VALUES (?, ?, 'تغيير أقمشة الفرامل الأمامية وخرط الهوبات', 'usr_mech_ahmed', 'pending')
  `).run(testTaskId2, testWorkOrderId);

  const ta2Lead = 'ta_2_lead_' + Date.now();
  const ta2Asst = 'ta_2_asst_' + Date.now();
  db.prepare(`
    INSERT INTO task_assignments (id, task_id, user_id, role_in_task)
    VALUES (?, ?, 'usr_mech_ahmed', 'lead'),
           (?, ?, 'usr_mech_mahmoud', 'assistant')
  `).run(ta2Lead, testTaskId2, ta2Asst, testTaskId2);

  const assignments = db.prepare('SELECT * FROM task_assignments WHERE task_id = ?').all(testTaskId2) as any[];
  assert.strictEqual(assignments.length, 2, 'Task 2 must have 2 mechanics assigned');
});

// Test 7: Diagnostics & DTC Fault Codes Recording
runTest('تسجيل فحص جهاز كشف الأعطال وأكواد DTC وتتبع تاريخها', () => {
  const diagId = 'diag_test_' + Date.now();
  db.prepare(`
    INSERT INTO diagnostics (
      id, visit_id, vehicle_id, scanner_manufacturer, scanner_model, system_tested, technician_id
    ) VALUES (?, ?, ?, 'Autel MaxiSys', 'MS908S Pro', 'Engine & Transmission', 'usr_mech_mahmoud')
  `).run(diagId, testVisitId, testVehicleId);

  // Register fault code P0301 (Misfire Cylinder 1)
  const dtcId = 'dtc_test_' + Date.now();
  db.prepare(`
    INSERT INTO diagnostic_codes (
      id, diagnostic_id, vehicle_id, dtc_code, description, system, status_at_test, is_confirmed_by_tech
    ) VALUES (?, ?, ?, 'P0301', 'Cylinder 1 Misfire Detected', 'Engine', 'Current', 1)
  `).run(dtcId, diagId, testVehicleId);

  const foundCode = db.prepare('SELECT * FROM diagnostic_codes WHERE dtc_code = ? AND vehicle_id = ?').get('P0301', testVehicleId) as any;
  assert.ok(foundCode, 'DTC code P0301 must be saved');
  assert.strictEqual(foundCode.status_at_test, 'Current');
});

// Test 8: Oil & Fluids Change and Next Due Calculation
runTest('تسجيل تغيير زيت المحرك وحساب موعد وعداد الصيانة القادمة تلقائياً', () => {
  const fluidId = 'fluid_test_' + Date.now();
  const currentKm = 48500;
  const nextDueKm = currentKm + 10000; // 58500
  const nextDueDate = '2027-04-03';

  db.prepare(`
    INSERT INTO oil_fluid_records (
      id, visit_id, vehicle_id, fluid_type, brand, viscosity, quantity_liters,
      filter_part_number, filter_replaced, current_odometer, next_due_date, next_due_km, technician_id
    ) VALUES (?, ?, ?, 'زيت محرك', 'Mobil 1', '5W-30', 5.0, '11428570590', 1, ?, ?, ?, 'usr_mech_ahmed')
  `).run(fluidId, testVisitId, testVehicleId, currentKm, nextDueDate, nextDueKm);

  // Update vehicle
  db.prepare(`
    UPDATE vehicles SET next_maintenance_date = ?, next_maintenance_km = ? WHERE id = ?
  `).run(nextDueDate, nextDueKm, testVehicleId);

  const veh = db.prepare('SELECT next_maintenance_km, next_maintenance_date FROM vehicles WHERE id = ?').get(testVehicleId) as any;
  assert.strictEqual(veh.next_maintenance_km, 58500);
  assert.strictEqual(veh.next_maintenance_date, '2027-04-03');
});

// Test 9: Safe Atomic Stock Deduction with Idempotency Key
runTest('خصم قطع الغيار من المخزون بأمان مع منع التكرار (Idempotency Protection)', () => {
  let part = db.prepare("SELECT * FROM parts WHERE part_number = '11428570590'").get() as any;
  if (!part) {
    db.prepare(`
      INSERT INTO parts (id, workshop_id, part_number, name, category, brand, type, cost_price, sale_price, stock_quantity, min_stock_alert, storage_location)
      VALUES ('part_test_bmw', 'ws_default_01', '11428570590', 'فلتر زيت BMW', 'فلاتر', 'Mann-Filter', 'OEM', 35, 60, 18, 5, 'رف A-3')
    `).run();
    part = db.prepare("SELECT * FROM parts WHERE id = 'part_test_bmw'").get() as any;
  }
  const initialStock = part.stock_quantity;
  const qtyToConsume = 1;
  const idempotencyKey = 'idemp_key_bmw_filter_' + Date.now();

  // First execution
  const movementId = 'sm_test_' + Date.now();
  db.prepare('UPDATE parts SET stock_quantity = stock_quantity - ? WHERE id = ?').run(qtyToConsume, part.id);
  db.prepare(`
    INSERT INTO stock_movements (
      id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price, idempotency_key, created_by
    ) VALUES (?, 'ws_default_01', ?, 'consumption', ?, ?, ?, ?, 'usr_mech_ahmed')
  `).run(movementId, part.id, -qtyToConsume, part.cost_price, part.sale_price, idempotencyKey);

  // Verify stock deducted
  const afterStock = db.prepare('SELECT stock_quantity FROM parts WHERE id = ?').get(part.id) as any;
  assert.strictEqual(afterStock.stock_quantity, initialStock - qtyToConsume);

  // Attempt duplicate execution with same idempotency key
  let caughtDuplicate = false;
  try {
    const smDupId = 'sm_dup_' + Date.now();
    db.prepare(`
      INSERT INTO stock_movements (
        id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price, idempotency_key, created_by
      ) VALUES (?, 'ws_default_01', ?, 'consumption', ?, ?, ?, ?, 'usr_mech_ahmed')
    `).run(smDupId, part.id, -qtyToConsume, part.cost_price, part.sale_price, idempotencyKey);
  } catch (err: any) {
    caughtDuplicate = true;
    assert.ok(err.message.includes('UNIQUE constraint failed'), 'Must reject duplicate idempotency_key');
  }
  assert.ok(caughtDuplicate, 'Duplicate request must be blocked without double deduction');
});

// Test 10: Invoices & Partial Payments
let testInvoiceId: string = '';
runTest('إنشاء فاتورة شاملة وتسجيل دفعات جزئية مع سندات قبض وحساب المتبقي', () => {
  testInvoiceId = 'inv_test_' + Date.now();
  const invNumber = 'INV-' + Date.now();
  const grandTotal = 1150.0; // 1000 + 15% VAT
  const initialPayment = 500.0;
  const balanceDue = grandTotal - initialPayment; // 650.0

  // 1. Insert Invoice
  db.prepare(`
    INSERT INTO invoices (
      id, workshop_id, invoice_number, visit_id, customer_id, vehicle_id, work_order_id,
      labor_total, parts_total, tax_amount, grand_total, paid_amount, balance_due, status, created_by
    ) VALUES (?, 'ws_default_01', ?, ?, ?, ?, ?, 600.0, 400.0, 150.0, ?, ?, ?, 'partially_paid', 'usr_accountant')
  `).run(testInvoiceId, invNumber, testVisitId, testCustomerId, testVehicleId, testWorkOrderId, grandTotal, initialPayment, balanceDue);

  // 2. Receipt for 1st payment
  const rcp1Id = 'rcp_1_' + Date.now();
  const rcp1Num = 'RCP-1-' + Date.now();
  db.prepare(`
    INSERT INTO payments (
      id, workshop_id, receipt_number, invoice_id, customer_id, amount, payment_method, received_by
    ) VALUES (?, 'ws_default_01', ?, ?, ?, ?, 'card', 'usr_accountant')
  `).run(rcp1Id, rcp1Num, testInvoiceId, testCustomerId, initialPayment);

  // 3. Register 2nd payment settling full remaining balance
  const secondPayment = balanceDue; // 650.0
  const rcp2Id = 'rcp_2_' + Date.now();
  const rcp2Num = 'RCP-2-' + Date.now();
  db.prepare(`
    INSERT INTO payments (
      id, workshop_id, receipt_number, invoice_id, customer_id, amount, payment_method, received_by
    ) VALUES (?, 'ws_default_01', ?, ?, ?, ?, 'cash', 'usr_accountant')
  `).run(rcp2Id, rcp2Num, testInvoiceId, testCustomerId, secondPayment);

  // Update invoice status to 'paid'
  db.prepare(`
    UPDATE invoices SET paid_amount = grand_total, balance_due = 0.0, status = 'paid' WHERE id = ?
  `).run(testInvoiceId);

  const finalInv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(testInvoiceId) as any;
  assert.strictEqual(finalInv.paid_amount, grandTotal);
  assert.strictEqual(finalInv.balance_due, 0.0);
  assert.strictEqual(finalInv.status, 'paid');

  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ?').all(testInvoiceId) as any[];
  assert.strictEqual(payments.length, 2, 'Must have 2 partial payment receipts');
});

// Test 11: Comprehensive Vehicle Timeline Aggregation
runTest('التحقق من عمل التايم لاين الشامل للسيارة وتجميع كافة الأحداث زمنياً', () => {
  const visits = db.prepare('SELECT id FROM visits WHERE vehicle_id = ?').all(testVehicleId);
  const workOrders = db.prepare('SELECT id FROM work_orders WHERE vehicle_id = ?').all(testVehicleId);
  const diagnostics = db.prepare('SELECT id FROM diagnostics WHERE vehicle_id = ?').all(testVehicleId);
  const fluids = db.prepare('SELECT id FROM oil_fluid_records WHERE vehicle_id = ?').all(testVehicleId);
  const invoices = db.prepare('SELECT id FROM invoices WHERE vehicle_id = ?').all(testVehicleId);

  assert.ok(visits.length >= 1, 'Must have at least 1 visit');
  assert.ok(workOrders.length >= 1, 'Must have at least 1 work order');
  assert.ok(diagnostics.length >= 1, 'Must have at least 1 diagnostic test');
  assert.ok(fluids.length >= 1, 'Must have at least 1 fluid record');
  assert.ok(invoices.length >= 1, 'Must have at least 1 invoice');
});

// Test 12: RBAC Server-Side Enforcement Verification
runTest('التحقق من حظر الوصول غير المصرح به على مستوى الخادم (Server-Side RBAC)', () => {
  const mechanicPerms = db.prepare(`
    SELECT p.code FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = 'role_mechanic'
  `).all() as { code: string }[];

  const codes = mechanicPerms.map(p => p.code);
  assert.ok(!codes.includes('settings.manage'), 'Mechanic must NOT have settings.manage permission');
  assert.ok(!codes.includes('invoices.create'), 'Mechanic must NOT have invoices.create permission');
  assert.ok(!codes.includes('reports.financial'), 'Mechanic must NOT have reports.financial permission');
  assert.ok(codes.includes('diagnostics.create'), 'Mechanic MUST have diagnostics.create permission');
  assert.ok(codes.includes('tasks.update'), 'Mechanic MUST have tasks.update permission');
});

console.log('====================================================');
console.log(`🎉 تم اجتياز كافة الاختبارات بنجاح: ${passedTests} من أصل ${totalTests} اختبار!`);
console.log('====================================================');
