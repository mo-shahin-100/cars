import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getVehicles(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const search = (req.query.search as string || '').trim();
  const ownerId = req.query.owner_id as string;

  let sql = `
    SELECT 
      v.*,
      c.full_name as owner_name,
      c.phone as owner_phone,
      c.customer_code as owner_code,
      COUNT(DISTINCT vis.id) as visits_count,
      MAX(vis.odometer_in) as latest_visit_odometer
    FROM vehicles v
    JOIN customers c ON v.current_owner_id = c.id
    LEFT JOIN visits vis ON vis.vehicle_id = v.id
    WHERE v.workshop_id = ? AND v.deleted_at IS NULL
  `;
  const params: any[] = [workshopId];

  if (ownerId) {
    sql += ` AND v.current_owner_id = ?`;
    params.push(ownerId);
  }

  if (search) {
    sql += ` AND (v.plate_number LIKE ? OR v.vin LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` GROUP BY v.id ORDER BY v.created_at DESC`;
  const vehicles = db.prepare(sql).all(...params);

  return res.json({ success: true, data: vehicles });
}

export function getVehicleById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const vehicle = db.prepare(`
    SELECT v.*, c.full_name as owner_name, c.phone as owner_phone, c.customer_code as owner_code, c.address as owner_address
    FROM vehicles v
    JOIN customers c ON v.current_owner_id = c.id
    WHERE v.id = ? AND v.workshop_id = ? AND v.deleted_at IS NULL
  `).get(id, workshopId) as any;

  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  // Ownership history
  const ownershipHistory = db.prepare(`
    SELECT voh.*, 
      prev.full_name as prev_owner_name, prev.phone as prev_owner_phone,
      next.full_name as new_owner_name, next.phone as new_owner_phone,
      u.full_name as transferred_by_name
    FROM vehicle_ownership_history voh
    JOIN customers prev ON voh.previous_owner_id = prev.id
    JOIN customers next ON voh.new_owner_id = next.id
    JOIN users u ON voh.transferred_by = u.id
    WHERE voh.vehicle_id = ?
    ORDER BY voh.transfer_date DESC
  `).all(id);

  // Visited visits summary
  const visits = db.prepare(`
    SELECT v.*, u.full_name as received_by_name
    FROM visits v
    LEFT JOIN users u ON v.received_by = u.id
    WHERE v.vehicle_id = ?
    ORDER BY v.entry_datetime DESC
  `).all(id);

  // Work orders
  const workOrders = db.prepare(`
    SELECT wo.*, u.full_name as created_by_name
    FROM work_orders wo
    LEFT JOIN users u ON wo.created_by = u.id
    WHERE wo.vehicle_id = ?
    ORDER BY wo.created_at DESC
  `).all(id);

  // Diagnostics and DTC codes
  const diagnostics = db.prepare(`
    SELECT d.*, u.full_name as tech_name
    FROM diagnostics d
    LEFT JOIN users u ON d.technician_id = u.id
    WHERE d.vehicle_id = ?
    ORDER BY d.test_datetime DESC
  `).all(id) as any[];

  for (const diag of diagnostics) {
    diag.codes = db.prepare(`
      SELECT * FROM diagnostic_codes WHERE diagnostic_id = ? ORDER BY dtc_code ASC
    `).all(diag.id);
  }

  // Oil & Fluids
  const fluids = db.prepare(`
    SELECT o.*, u.full_name as technician_name
    FROM oil_fluid_records o
    LEFT JOIN users u ON o.technician_id = u.id
    WHERE o.vehicle_id = ?
    ORDER BY o.service_date DESC
  `).all(id);

  // Used Spare Parts
  const usedParts = db.prepare(`
    SELECT up.*, p.name as part_name, p.part_number, p.brand, wo.order_number
    FROM used_parts up
    JOIN parts p ON up.part_id = p.id
    JOIN work_orders wo ON up.work_order_id = wo.id
    WHERE wo.vehicle_id = ?
    ORDER BY up.created_at DESC
  `).all(id);

  // Attachments (Images & Documents)
  const attachments = db.prepare(`
    SELECT a.*, u.full_name as uploaded_by_name
    FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.vehicle_id = ?
    ORDER BY a.created_at DESC
  `).all(id);

  // Invoices
  const invoices = db.prepare(`
    SELECT i.*, u.full_name as created_by_name
    FROM invoices i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.vehicle_id = ?
    ORDER BY i.issue_date DESC
  `).all(id);

  return res.json({
    success: true,
    data: {
      overview: vehicle,
      ownershipHistory,
      visits,
      workOrders,
      diagnostics,
      fluids,
      usedParts,
      attachments,
      invoices
    }
  });
}

/**
 * Section 6: Comprehensive Unified Vehicle Timeline Aggregator
 * Merges every single event (Visits, Work Orders, Diagnostics, DTCs, Oil, Parts, Invoices, Attachments)
 * into a single unified chronological timeline with timestamps, mileage, author, and category.
 */
export function getVehicleTimeline(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const vehicle = db.prepare('SELECT id, plate_number, make, model FROM vehicles WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(id, workshopId) as any;
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  const timelineEvents: Array<{
    id: string;
    type: 'visit' | 'work_order' | 'diagnostic' | 'fluid' | 'part' | 'invoice' | 'attachment' | 'ownership';
    timestamp: string;
    odometer?: number;
    title: string;
    description: string;
    authorName?: string;
    status?: string;
    details: any;
  }> = [];

  // 1. Visits
  const visits = db.prepare(`
    SELECT v.*, u.full_name as author_name 
    FROM visits v 
    LEFT JOIN users u ON v.received_by = u.id 
    WHERE v.vehicle_id = ?
  `).all(id) as any[];

  for (const v of visits) {
    timelineEvents.push({
      id: `visit_${v.id}`,
      type: 'visit',
      timestamp: v.entry_datetime,
      odometer: v.odometer_in,
      title: `زيارة ورشة جديدة رقم [${v.visit_number}]`,
      description: `شكوى العميل: ${v.customer_complaint}`,
      authorName: v.author_name,
      status: v.status,
      details: v
    });
  }

  // 2. Work Orders
  const workOrders = db.prepare(`
    SELECT wo.*, u.full_name as author_name 
    FROM work_orders wo 
    LEFT JOIN users u ON wo.created_by = u.id 
    WHERE wo.vehicle_id = ?
  `).all(id) as any[];

  for (const wo of workOrders) {
    timelineEvents.push({
      id: `wo_${wo.id}`,
      type: 'work_order',
      timestamp: wo.created_at,
      title: `أمر إصلاح [${wo.order_number}]`,
      description: wo.description,
      authorName: wo.author_name,
      status: wo.status,
      details: wo
    });
  }

  // 3. Diagnostics & DTCs
  const diagnostics = db.prepare(`
    SELECT d.*, u.full_name as author_name 
    FROM diagnostics d 
    LEFT JOIN users u ON d.technician_id = u.id 
    WHERE d.vehicle_id = ?
  `).all(id) as any[];

  for (const d of diagnostics) {
    const codes = db.prepare('SELECT * FROM diagnostic_codes WHERE diagnostic_id = ?').all(d.id) as any[];
    const codesList = codes.map(c => `${c.dtc_code} (${c.description})`).join('، ');
    timelineEvents.push({
      id: `diag_${d.id}`,
      type: 'diagnostic',
      timestamp: d.test_datetime,
      title: `تقرير فحص كمبيوتر (${d.scanner_manufacturer || 'جهاز الفحص'} - ${d.system_tested})`,
      description: codes.length > 0 ? `الأكواد المرصودة: ${codesList}` : 'الفحص سليم ولم تسجل أكواد أعطال',
      authorName: d.author_name,
      details: { ...d, codes }
    });
  }

  // 4. Oil & Fluids
  const fluids = db.prepare(`
    SELECT f.*, u.full_name as author_name 
    FROM oil_fluid_records f 
    LEFT JOIN users u ON f.technician_id = u.id 
    WHERE f.vehicle_id = ?
  `).all(id) as any[];

  for (const f of fluids) {
    timelineEvents.push({
      id: `fluid_${f.id}`,
      type: 'fluid',
      timestamp: f.service_date,
      odometer: f.current_odometer,
      title: `تغيير ${f.fluid_type} (${f.brand} ${f.viscosity || ''})`,
      description: `الكمية: ${f.quantity_liters} لتر | الفلتر: ${f.filter_replaced ? 'تم التغيير' : 'لم يغير'} | الصيانة القادمة عند: ${f.next_due_km ? f.next_due_km + ' كم' : '-'} أو ${f.next_due_date || '-'}`,
      authorName: f.author_name,
      details: f
    });
  }

  // 5. Invoices
  const invoices = db.prepare(`
    SELECT i.*, u.full_name as author_name 
    FROM invoices i 
    LEFT JOIN users u ON i.created_by = u.id 
    WHERE i.vehicle_id = ?
  `).all(id) as any[];

  for (const inv of invoices) {
    const total = Math.round((Number(inv.grand_total) || 0) * 100) / 100;
    const paid = Math.round((Number(inv.paid_amount) || 0) * 100) / 100;
    const balance = Math.round((Number(inv.balance_due) || 0) * 100) / 100;

    timelineEvents.push({
      id: `inv_${inv.id}`,
      type: 'invoice',
      timestamp: inv.issue_date,
      title: `فاتورة صيانة رقم [${inv.invoice_number}]`,
      description: `الإجمالي: ${total} ج.م | المدفوع: ${paid} ج.م | المتبقي: ${balance} ج.م`,
      authorName: inv.author_name,
      status: inv.status,
      details: {
        ...inv,
        grand_total: total,
        paid_amount: paid,
        balance_due: balance
      }
    });
  }

  // 6. Media Attachments
  const attachments = db.prepare(`
    SELECT a.*, u.full_name as author_name 
    FROM attachments a 
    LEFT JOIN users u ON a.uploaded_by = u.id 
    WHERE a.vehicle_id = ?
  `).all(id) as any[];

  for (const att of attachments) {
    timelineEvents.push({
      id: `att_${att.id}`,
      type: 'attachment',
      timestamp: att.created_at,
      title: `مرفق صورة أو مستند [${att.category}]`,
      description: att.caption || att.file_name,
      authorName: att.author_name,
      details: att
    });
  }

  // Sort chronologically descending
  timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return res.json({
    success: true,
    data: {
      vehicle,
      totalEvents: timelineEvents.length,
      timeline: timelineEvents
    }
  });
}

export function createVehicle(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  let {
    plate_number, vin, make, model, year, color,
    engine_number, engine_capacity, fuel_type, transmission_type,
    current_odometer, current_owner_id, notes,
    last_maintenance_km, next_maintenance_km, next_maintenance_date, next_maintenance_notes,
    new_customer, owner_name, owner_phone, owner_address
  } = req.body;

  let ownerId = current_owner_id;
  let createdNewCustomer: any = null;

  const custName = new_customer?.full_name || owner_name;
  const custPhone = new_customer?.phone || owner_phone;
  const custAddress = new_customer?.address || owner_address;

  // If no owner selected, allow creating/finding owner by name and phone
  if (!ownerId) {
    if (!custName || !custPhone) {
      return res.status(400).json({
        success: false,
        error: 'يجب اختيار مالك مسجل للسيارة أو إدخال اسم ورقم هاتف المالك الجديد'
      });
    }

    // Check if customer already exists with this phone in this workshop
    const existingCust = db.prepare('SELECT id, full_name, customer_code FROM customers WHERE phone = ? AND workshop_id = ? AND deleted_at IS NULL').get(custPhone.trim(), workshopId) as any;
    if (existingCust) {
      ownerId = existingCust.id;
    } else {
      const countRow = db.prepare('SELECT COUNT(*) as c FROM customers WHERE workshop_id = ?').get(workshopId) as { c: number };
      const customer_code = `C-${(countRow.c + 1).toString().padStart(4, '0')}`;
      ownerId = uuidv4();

      db.prepare(`
        INSERT INTO customers (id, workshop_id, customer_code, full_name, phone, address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        ownerId,
        workshopId,
        customer_code,
        custName.trim(),
        custPhone.trim(),
        custAddress?.trim() || null,
        new_customer?.notes || 'تم إنشاؤه أثناء تسجيل السيارة'
      );

      createdNewCustomer = {
        id: ownerId,
        customer_code,
        full_name: custName.trim(),
        phone: custPhone.trim()
      };

      logActivity(req, 'CREATE', 'customer', ownerId, { full_name: custName, customer_code });
      broadcastEvent({
        workshopId,
        entity: 'customers',
        entityId: ownerId,
        action: 'INSERT',
        payload: createdNewCustomer,
        originUserId: req.user?.id
      });
    }
  }

  if (!plate_number || !make || !model || !year || !ownerId) {
    return res.status(400).json({ success: false, error: 'رقم اللوحة، الماركة، الموديل، سنة الصنع، وهوية المالك حقول إلزامية' });
  }

  // Check duplicate VIN if provided
  if (vin && vin.trim()) {
    const existingVin = db.prepare('SELECT id FROM vehicles WHERE vin = ? AND workshop_id = ? AND deleted_at IS NULL').get(vin.trim(), workshopId);
    if (existingVin) {
      return res.status(400).json({ success: false, error: 'رقم الشاسيه (VIN) مسجل بالفعل لسيارة أخرى في النظام' });
    }
  }

  // Check plate number
  const existingPlate = db.prepare('SELECT id FROM vehicles WHERE plate_number = ? AND workshop_id = ? AND deleted_at IS NULL').get(plate_number.trim(), workshopId);
  if (existingPlate) {
    return res.status(400).json({ success: false, error: 'رقم اللوحة مسجل بالفعل لسيارة أخرى في الورشة' });
  }

  const vehicleId = uuidv4();

  db.prepare(`
    INSERT INTO vehicles (
      id, workshop_id, plate_number, vin, make, model, year, color,
      engine_number, engine_capacity, fuel_type, transmission_type,
      current_odometer, current_owner_id, notes,
      last_maintenance_km, next_maintenance_km, next_maintenance_date, next_maintenance_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    vehicleId,
    workshopId,
    plate_number.trim(),
    vin?.trim() || null,
    make.trim(),
    model.trim(),
    parseInt(year, 10),
    color?.trim() || null,
    engine_number?.trim() || null,
    engine_capacity?.trim() || null,
    fuel_type || 'بنزين',
    transmission_type || 'أوتوماتيك',
    parseInt(current_odometer || 0, 10),
    ownerId,
    notes?.trim() || null,
    last_maintenance_km ? parseInt(last_maintenance_km, 10) : null,
    next_maintenance_km ? parseInt(next_maintenance_km, 10) : null,
    next_maintenance_date || null,
    next_maintenance_notes?.trim() || null
  );

  logActivity(req, 'CREATE', 'vehicle', vehicleId, { plate_number, make, model, year });
  broadcastEvent({
    workshopId,
    entity: 'vehicles',
    entityId: vehicleId,
    action: 'INSERT',
    payload: { id: vehicleId, plate_number, make, model, current_owner_id: ownerId },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: vehicleId, plate_number, make, model, current_owner_id: ownerId, new_customer: createdNewCustomer },
    message: createdNewCustomer
      ? `تم تسجيل المالك الجديد [${createdNewCustomer.full_name}] والسيارة [${plate_number}] بنجاح`
      : 'تم تسجيل ملف السيارة بنجاح'
  });
}

export function updateVehicle(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const {
    plate_number, vin, make, model, year, color,
    engine_number, engine_capacity, fuel_type, transmission_type,
    current_odometer, notes,
    last_maintenance_km, next_maintenance_km, next_maintenance_date, next_maintenance_notes
  } = req.body;

  const existing = db.prepare('SELECT id FROM vehicles WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(id, workshopId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  db.prepare(`
    UPDATE vehicles SET
      plate_number = ?, vin = ?, make = ?, model = ?, year = ?, color = ?,
      engine_number = ?, engine_capacity = ?, fuel_type = ?, transmission_type = ?,
      current_odometer = ?, notes = ?,
      last_maintenance_km = COALESCE(?, last_maintenance_km),
      next_maintenance_km = COALESCE(?, next_maintenance_km),
      next_maintenance_date = COALESCE(?, next_maintenance_date),
      next_maintenance_notes = COALESCE(?, next_maintenance_notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(
    plate_number.trim(),
    vin?.trim() || null,
    make.trim(),
    model.trim(),
    parseInt(year, 10),
    color?.trim() || null,
    engine_number?.trim() || null,
    engine_capacity?.trim() || null,
    fuel_type || 'بنزين',
    transmission_type || 'أوتوماتيك',
    parseInt(current_odometer || 0, 10),
    notes?.trim() || null,
    last_maintenance_km !== undefined ? (last_maintenance_km ? parseInt(last_maintenance_km, 10) : null) : null,
    next_maintenance_km !== undefined ? (next_maintenance_km ? parseInt(next_maintenance_km, 10) : null) : null,
    next_maintenance_date !== undefined ? (next_maintenance_date || null) : null,
    next_maintenance_notes !== undefined ? (next_maintenance_notes?.trim() || null) : null,
    id,
    workshopId
  );

  logActivity(req, 'UPDATE', 'vehicle', id, { plate_number, make, model });
  broadcastEvent({
    workshopId,
    entity: 'vehicles',
    entityId: id,
    action: 'UPDATE',
    payload: { id, plate_number, make, model },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم تحديث بيانات السيارة بنجاح' });
}

export function updateMaintenanceSchedule(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { last_maintenance_km, next_maintenance_km, next_maintenance_date, next_maintenance_notes } = req.body;

  const vehicle = db.prepare('SELECT id, plate_number, make, model FROM vehicles WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(id, workshopId) as any;
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  const lastKm = last_maintenance_km !== undefined && last_maintenance_km !== '' && last_maintenance_km !== null
    ? parseInt(last_maintenance_km, 10) : null;
  const nextKm = next_maintenance_km !== undefined && next_maintenance_km !== '' && next_maintenance_km !== null
    ? parseInt(next_maintenance_km, 10) : null;
  const nextDate = next_maintenance_date || null;
  const nextNotes = next_maintenance_notes !== undefined ? (next_maintenance_notes?.trim() || null) : null;

  db.prepare(`
    UPDATE vehicles SET
      last_maintenance_km = ?,
      next_maintenance_km = ?,
      next_maintenance_date = ?,
      next_maintenance_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(
    lastKm,
    nextKm,
    nextDate,
    nextNotes,
    id,
    workshopId
  );

  logActivity(req, 'UPDATE', 'vehicle', id, {
    plate_number: vehicle.plate_number,
    action: 'تحديث خطة وجدول الصيانة القادمة',
    next_maintenance_km: nextKm,
    next_maintenance_notes: nextNotes
  });

  broadcastEvent({
    workshopId,
    entity: 'vehicles',
    entityId: id,
    action: 'UPDATE',
    payload: { id, last_maintenance_km: lastKm, next_maintenance_km: nextKm, next_maintenance_notes: nextNotes },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم تحديث خطة الصيانة القادمة للسيارة بنجاح' });
}


/**
 * Transfer vehicle ownership with historical retention
 * Does not overwrite old owner's invoices or history!
 */
export function transferOwnership(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { new_owner_id, reason, transfer_odometer } = req.body;

  if (!new_owner_id) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد المالك الجديد للسيارة' });
  }

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(id, workshopId) as any;
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  if (vehicle.current_owner_id === new_owner_id) {
    return res.status(400).json({ success: false, error: 'السيارة مسجلة بالفعل باسم هذا العميل' });
  }

  const newOwner = db.prepare('SELECT id, full_name FROM customers WHERE id = ? AND deleted_at IS NULL').get(new_owner_id) as any;
  if (!newOwner) {
    return res.status(404).json({ success: false, error: 'المالك الجديد غير موجود في سجل العملاء' });
  }

  executeTransaction(() => {
    // 1. Record in history
    db.prepare(`
      INSERT INTO vehicle_ownership_history (id, vehicle_id, previous_owner_id, new_owner_id, transfer_odometer, reason, transferred_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      id,
      vehicle.current_owner_id,
      new_owner_id,
      transfer_odometer ? parseInt(transfer_odometer, 10) : vehicle.current_odometer,
      reason || 'نقل ملكية وتحديث بيانات',
      req.user!.id
    );

    // 2. Update current vehicle owner
    db.prepare(`
      UPDATE vehicles 
      SET current_owner_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new_owner_id, id);
  });

  logActivity(req, 'UPDATE', 'vehicle_ownership', id, {
    prev_owner: vehicle.current_owner_id,
    new_owner: new_owner_id
  });

  broadcastEvent({
    workshopId,
    entity: 'vehicles',
    entityId: id,
    action: 'UPDATE',
    payload: { id, new_owner_id },
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    message: `تم نقل ملكية السيارة بنجاح إلى العميل: ${newOwner.full_name} مع الاحتفاظ بالأرشيف التاريخي كاملاً.`
  });
}

export function deleteVehicle(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const vehicle = db.prepare('SELECT id, plate_number, make, model FROM vehicles WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM attachments WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM diagnostic_codes WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM diagnostics WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM oil_fluid_records WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM used_parts WHERE work_order_id IN (SELECT id FROM work_orders WHERE vehicle_id = ?)').run(id);
      db.prepare('DELETE FROM task_assignments WHERE task_id IN (SELECT t.id FROM tasks t JOIN work_orders wo ON t.work_order_id = wo.id WHERE wo.vehicle_id = ?)').run(id);
      db.prepare('DELETE FROM tasks WHERE work_order_id IN (SELECT id FROM work_orders WHERE vehicle_id = ?)').run(id);
      db.prepare('DELETE FROM work_orders WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE vehicle_id = ?)').run(id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE vehicle_id = ?)').run(id);
      db.prepare('DELETE FROM invoices WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM visits WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM vehicle_ownership_history WHERE vehicle_id = ?').run(id);
      db.prepare('DELETE FROM vehicles WHERE id = ? AND workshop_id = ?').run(id, workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'vehicle', id, { plate_number: vehicle.plate_number, model: vehicle.model });
    broadcastEvent({
      workshopId,
      entity: 'vehicles',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف السيارة وسجلاتها بنجاح' });
  } catch (err: any) {
    console.error('Delete vehicle error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف السيارة: ' + err.message });
  }
}

export function getVehicleWhatsAppMaintenance(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const vehicle = db.prepare(`
    SELECT v.*,
           c.full_name as customer_name, c.phone as customer_phone,
           w.name as workshop_name, w.phone as workshop_phone, w.address as workshop_address
    FROM vehicles v
    JOIN customers c ON v.current_owner_id = c.id
    LEFT JOIN workshops w ON v.workshop_id = w.id
    WHERE v.id = ? AND v.workshop_id = ?
  `).get(id, workshopId) as any;

  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'السيارة غير موجودة' });
  }

  const workshopName = vehicle.workshop_name || 'مركز النخبة المتقدم لصيانة وبرمجة السيارات';
  const workshopPhone = vehicle.workshop_phone || '';
  const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
  const customerName = vehicle.customer_name || 'العميل الكريم';
  const plateNumber = vehicle.plate_number || '';
  const phone = vehicle.customer_phone || '';
  const currentOdo = Number(vehicle.current_odometer || 0);
  const nextKm = Number(vehicle.next_maintenance_km || 0);
  const diffKm = nextKm > 0 ? nextKm - currentOdo : null;
  const notes = vehicle.next_maintenance_notes || 'صيانة دورية وتغيير الزيوت وفحص العفشة والمكابح';

  let urgencyText = '📅 تذكير بموعد الصيانة الدورية المجدولة';
  if (diffKm !== null && diffKm <= 0) {
    urgencyText = '⚠️ تنبيه عاجل: حان موعد الصيانة الدورية الآن لتفادي أي أعطال';
  } else if (diffKm !== null && diffKm <= 1500) {
    urgencyText = `⏳ تنبيه: اقترب موعد الصيانة القادمة (متبقي ${diffKm.toLocaleString()} كم تقريباً)`;
  }

  let message = `السلام عليكم ورحمة الله وبركاته 🌹\n`;
  message += `أهلاً بك أستاذ/ *${customerName}*\n\n`;
  message += `${urgencyText}\n\n`;
  message += `🚗 *بيانات سيارتكم:* ${vehicleName}\n`;
  message += `🔢 *رقم اللوحة:* ${plateNumber}\n`;
  if (currentOdo > 0) {
    message += `📊 *قراءة العداد المسجلة:* ${currentOdo.toLocaleString()} كم\n`;
  }
  if (nextKm > 0) {
    message += `🎯 *العداد المستهدف للصيانة:* ${nextKm.toLocaleString()} كم\n`;
    if (diffKm !== null) {
      if (diffKm > 0) {
        message += `⏳ *المتبقي على الصيانة:* ${diffKm.toLocaleString()} كم تقريباً\n`;
      } else {
        message += `⚠️ *تجاوزت الصيانة بمقدار:* ${Math.abs(diffKm).toLocaleString()} كم\n`;
      }
    }
  }
  if (vehicle.next_maintenance_date) {
    message += `📅 *الموعد المقترح:* ${vehicle.next_maintenance_date.split('T')[0]}\n`;
  }
  message += `\n🔧 *أعمال وتوصيات الصيانة الموصى بها:* \n`;
  message += `• ${notes}\n\n`;
  message += `حرصاً على سلامتك وكفاءة سيارتك، نوصي بحجز موعد صيانة وتجهيز قطع الغيار مسبقاً.\n`;
  message += `لحجز موعدك أو الاستفسار، يمكنك الرد مباشرة على هذه الرسالة 🤝\n\n`;
  message += `*${workshopName}*\n`;
  if (workshopPhone) {
    message += `📞 للتواصل والاستفسار: ${workshopPhone}`;
  }

  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
  if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
    cleanPhone = '20' + cleanPhone.substring(1);
  } else if ((cleanPhone.startsWith('10') || cleanPhone.startsWith('11') || cleanPhone.startsWith('12') || cleanPhone.startsWith('15')) && cleanPhone.length === 10) {
    cleanPhone = '20' + cleanPhone;
  } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
    cleanPhone = '966' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
    cleanPhone = '966' + cleanPhone;
  }

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

  return res.json({
    success: true,
    data: {
      phone,
      cleanPhone,
      customerName,
      vehicleName,
      plateNumber,
      visitNumber: '',
      currentOdometer: currentOdo,
      nextMaintenanceKm: nextKm,
      diffKm,
      notes,
      message,
      whatsappUrl
    }
  });
}

