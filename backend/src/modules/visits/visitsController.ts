import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getVisits(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const status = req.query.status as string;
  const vehicleId = req.query.vehicle_id as string;
  const customerId = req.query.customer_id as string;

  let sql = `
    SELECT 
      v.*,
      veh.plate_number, veh.make, veh.model, veh.year,
      c.full_name as customer_name, c.phone as customer_phone,
      u.full_name as received_by_name,
      COUNT(DISTINCT wo.id) as work_orders_count
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN users u ON v.received_by = u.id
    LEFT JOIN work_orders wo ON wo.visit_id = v.id
    WHERE v.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (status) {
    sql += ` AND v.status = ?`;
    params.push(status);
  }
  if (vehicleId) {
    sql += ` AND v.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (customerId) {
    sql += ` AND v.customer_id = ?`;
    params.push(customerId);
  }

  sql += ` GROUP BY v.id ORDER BY v.entry_datetime DESC`;
  const visits = db.prepare(sql).all(...params);

  return res.json({ success: true, data: visits });
}

export function getVisitById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const visit = db.prepare(`
    SELECT 
      v.*,
      veh.plate_number, veh.vin, veh.make, veh.model, veh.year, veh.color, veh.fuel_type, veh.transmission_type,
      c.full_name as customer_name, c.phone as customer_phone, c.customer_code,
      u.full_name as received_by_name,
      del.full_name as delivered_by_name
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN users u ON v.received_by = u.id
    LEFT JOIN users del ON v.delivered_by = del.id
    WHERE v.id = ? AND v.workshop_id = ?
  `).get(id, workshopId) as any;

  if (!visit) {
    return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });
  }

  // Work orders in this visit
  const workOrders = db.prepare(`
    SELECT wo.*, u.full_name as created_by_name
    FROM work_orders wo
    LEFT JOIN users u ON wo.created_by = u.id
    WHERE wo.visit_id = ?
    ORDER BY wo.created_at ASC
  `).all(id) as any[];

  for (const wo of workOrders) {
    // Tasks and assigned mechanics
    const tasks = db.prepare(`
      SELECT t.*, u.full_name as lead_mechanic_name
      FROM tasks t
      LEFT JOIN users u ON t.lead_mechanic_id = u.id
      WHERE t.work_order_id = ?
      ORDER BY t.created_at ASC
    `).all(wo.id) as any[];

    for (const t of tasks) {
      t.assignments = db.prepare(`
        SELECT ta.*, u.full_name as mechanic_name, u.specialty
        FROM task_assignments ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
      `).all(t.id);
    }
    wo.tasks = tasks;

    // Used parts in this work order (with code, name, brand, category, prices)
    wo.usedParts = db.prepare(`
      SELECT up.*, p.name as part_name, p.part_number, p.brand, p.category, p.sale_price as catalog_sale_price
      FROM used_parts up
      JOIN parts p ON up.part_id = p.id
      WHERE up.work_order_id = ?
      ORDER BY up.created_at DESC
    `).all(wo.id);
  }

  // Diagnostics and DTC
  const diagnostics = db.prepare(`
    SELECT d.*, u.full_name as technician_name
    FROM diagnostics d
    LEFT JOIN users u ON d.technician_id = u.id
    WHERE d.visit_id = ?
    ORDER BY d.test_datetime DESC
  `).all(id) as any[];

  for (const d of diagnostics) {
    d.codes = db.prepare('SELECT * FROM diagnostic_codes WHERE diagnostic_id = ?').all(d.id);
  }

  // Fluids changed
  const fluids = db.prepare(`
    SELECT f.*, u.full_name as technician_name
    FROM oil_fluid_records f
    LEFT JOIN users u ON f.technician_id = u.id
    WHERE f.visit_id = ?
  `).all(id);

  // Attachments
  const attachments = db.prepare(`
    SELECT a.*, u.full_name as uploaded_by_name
    FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.visit_id = ?
    ORDER BY a.created_at DESC
  `).all(id);

  // Invoice
  const invoice = db.prepare(`
    SELECT * FROM invoices WHERE visit_id = ?
  `).get(id) as any;

  if (invoice) {
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
    invoice.payments = db.prepare(`
      SELECT p.*, u.full_name as received_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.invoice_id = ?
    `).all(invoice.id);
  }

  // Workshop Profile Details for official reports & invoices
  const workshop = db.prepare(`
    SELECT id, name, commercial_reg, tax_number, phone, email, address, currency, tax_rate
    FROM workshops
    WHERE id = ?
    LIMIT 1
  `).get(workshopId) as any;

  return res.json({
    success: true,
    data: {
      visit,
      workshop,
      workOrders,
      diagnostics,
      fluids,
      attachments,
      invoice
    }
  });
}

export function createVisit(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  let {
    vehicle_id,
    customer_id,
    odometer_in,
    fuel_level,
    customer_complaint,
    intake_condition,
    initial_inspection,
    notes,
    // On-the-fly vehicle & customer payloads
    plate_number,
    make,
    model,
    year,
    color,
    vin,
    customer_name,
    customer_phone,
    customer_address,
    new_vehicle,
    new_customer
  } = req.body;

  let finalVehicleId = vehicle_id;
  let finalCustomerId = customer_id;
  let createdCustomer: any = null;
  let createdVehicle: any = null;

  // 1. Resolve Customer if new details provided
  const custName = customer_name || req.body.owner_name || new_customer?.full_name;
  const custPhone = customer_phone || req.body.owner_phone || new_customer?.phone;
  const custAddress = customer_address || req.body.owner_address || new_customer?.address;

  if (!finalCustomerId && custName && custPhone) {
    const existingCust = db.prepare('SELECT id, full_name, customer_code FROM customers WHERE phone = ? AND workshop_id = ? AND deleted_at IS NULL').get(custPhone.trim(), workshopId) as any;
    if (existingCust) {
      finalCustomerId = existingCust.id;
    } else {
      const countRow = db.prepare('SELECT COUNT(*) as c FROM customers WHERE workshop_id = ?').get(workshopId) as { c: number };
      const customer_code = `C-${(countRow.c + 1).toString().padStart(4, '0')}`;
      finalCustomerId = uuidv4();

      db.prepare(`
        INSERT INTO customers (id, workshop_id, customer_code, full_name, phone, address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        finalCustomerId,
        workshopId,
        customer_code,
        custName.trim(),
        custPhone.trim(),
        custAddress?.trim() || null,
        'تم تسجيله أثناء استقبال الزيارة'
      );

      createdCustomer = {
        id: finalCustomerId,
        customer_code,
        full_name: custName.trim(),
        phone: custPhone.trim()
      };

      logActivity(req, 'CREATE', 'customer', finalCustomerId, { full_name: custName, customer_code });
      broadcastEvent({
        workshopId,
        entity: 'customers',
        entityId: finalCustomerId,
        action: 'INSERT',
        payload: createdCustomer,
        originUserId: req.user?.id
      });
    }
  }

  // 2. Resolve Vehicle if new details provided
  const plate = plate_number || new_vehicle?.plate_number;
  const vMake = make || new_vehicle?.make;
  const vModel = model || new_vehicle?.model;
  const vYear = year || new_vehicle?.year || new Date().getFullYear();
  const vColor = color || new_vehicle?.color;
  const vVin = vin || new_vehicle?.vin;

  if (!finalVehicleId) {
    if (!plate || !vMake || !vModel) {
      return res.status(400).json({
        success: false,
        error: 'يجب اختيار سيارة مسجلة، أو إدخال رقم اللوحة والماركة والموديل للسيارة الجديدة'
      });
    }

    // Check if vehicle with plate already exists in workshop
    const existingVeh = db.prepare('SELECT id, current_owner_id, make, model, plate_number FROM vehicles WHERE plate_number = ? AND workshop_id = ? AND deleted_at IS NULL').get(plate.trim(), workshopId) as any;
    if (existingVeh) {
      finalVehicleId = existingVeh.id;
      if (!finalCustomerId) {
        finalCustomerId = existingVeh.current_owner_id;
      }
    } else {
      if (!finalCustomerId) {
        return res.status(400).json({
          success: false,
          error: 'يجب تحديد مالك للسيارة الجديدة (اختيار مالك مسجل أو إدخال اسم ورقم هاتف المالك)'
        });
      }

      finalVehicleId = uuidv4();
      const odo = parseInt(odometer_in || '0', 10);
      db.prepare(`
        INSERT INTO vehicles (
          id, workshop_id, plate_number, vin, make, model, year, color,
          fuel_type, transmission_type, current_odometer, current_owner_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        finalVehicleId,
        workshopId,
        plate.trim(),
        vVin?.trim() || null,
        vMake.trim(),
        vModel.trim(),
        parseInt(vYear, 10),
        vColor?.trim() || null,
        req.body.fuel_type || 'بنزين',
        req.body.transmission_type || 'أوتوماتيك',
        odo,
        finalCustomerId,
        'تم تسجيل السيارة أثناء استقبال الزيارة'
      );

      createdVehicle = {
        id: finalVehicleId,
        plate_number: plate.trim(),
        make: vMake.trim(),
        model: vModel.trim(),
        current_owner_id: finalCustomerId
      };

      logActivity(req, 'CREATE', 'vehicle', finalVehicleId, { plate_number: plate, make: vMake, model: vModel });
      broadcastEvent({
        workshopId,
        entity: 'vehicles',
        entityId: finalVehicleId,
        action: 'INSERT',
        payload: createdVehicle,
        originUserId: req.user?.id
      });
    }
  } else {
    // If vehicle was provided by ID, but customer_id was omitted, get vehicle's current owner
    if (!finalCustomerId) {
      const veh = db.prepare('SELECT current_owner_id FROM vehicles WHERE id = ? AND workshop_id = ?').get(finalVehicleId, workshopId) as any;
      if (veh) {
        finalCustomerId = veh.current_owner_id;
      }
    }
  }

  if (!finalVehicleId || !finalCustomerId || !odometer_in || !customer_complaint) {
    return res.status(400).json({
      success: false,
      error: 'السيارة، العميل، قراءة العداد عند الدخول، وشكوى العميل حقول إلزامية'
    });
  }

  const visitId = uuidv4();
  const countRow = db.prepare('SELECT COUNT(*) as c FROM visits WHERE workshop_id = ?').get(workshopId) as { c: number };
  const visit_number = `V-${(countRow.c + 1).toString().padStart(5, '0')}`;
  const odometerInt = parseInt(odometer_in, 10);

  executeTransaction(() => {
    // 1. Insert Visit
    db.prepare(`
      INSERT INTO visits (
        id, workshop_id, visit_number, vehicle_id, customer_id,
        odometer_in, fuel_level, customer_complaint, intake_condition,
        initial_inspection, status, notes, received_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
    `).run(
      visitId,
      workshopId,
      visit_number,
      finalVehicleId,
      finalCustomerId,
      odometerInt,
      fuel_level || 'نصف',
      customer_complaint.trim(),
      intake_condition?.trim() || null,
      initial_inspection?.trim() || null,
      notes?.trim() || null,
      req.user!.id
    );

    // 2. Update vehicle current odometer and visit count
    db.prepare(`
      UPDATE vehicles SET
        current_odometer = MAX(current_odometer, ?),
        last_visit_at = CURRENT_TIMESTAMP,
        first_visit_at = COALESCE(first_visit_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(odometerInt, finalVehicleId);

    // 3. Update customer visit count
    db.prepare(`
      UPDATE customers SET
        visit_count = visit_count + 1,
        last_visit_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(finalCustomerId);
  });

  logActivity(req, 'CREATE', 'visit', visitId, { visit_number, vehicle_id: finalVehicleId, customer_id: finalCustomerId });
  broadcastEvent({
    workshopId,
    entity: 'visits',
    entityId: visitId,
    action: 'INSERT',
    payload: { id: visitId, visit_number, vehicle_id: finalVehicleId, status: 'received' },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: {
      id: visitId,
      visit_number,
      status: 'received',
      vehicle_id: finalVehicleId,
      customer_id: finalCustomerId,
      new_vehicle: createdVehicle,
      new_customer: createdCustomer
    },
    message: `تم تسجيل دخول الزيارة بنجاح برقم: ${visit_number}`
  });
}

function buildWhatsAppReadyData(visit: any, invoice: any) {
  const workshopName = visit.workshop_name || 'مركز النخبة المتقدم لصيانة وبرمجة السيارات';
  const vehicleName = `${visit.make || ''} ${visit.model || ''} ${visit.year || ''}`.trim();
  const customerName = visit.customer_name || 'العميل الكريم';
  const plateNumber = visit.plate_number || '';
  const phone = visit.customer_phone || '';
  const balanceDue = invoice ? Number(invoice.balance_due || 0) : 0;

  let message = `السلام عليكم ورحمة الله وبركاته 🌹\n`;
  message += `أهلاً بك أستاذ/ *${customerName}*\n\n`;
  message += `نود إبلاغكم بأن سيارتكم الكريمة:\n`;
  message += `🚗 *${vehicleName}*\n`;
  message += `🔢 *رقم اللوحة:* ${plateNumber}\n`;
  message += `📋 *رقم الزيارة:* ${visit.visit_number}\n\n`;
  message += `✅ *أصبحت جاهزة للتسليم الآن* بفضل الله بعد إتمام كافة أعمال الصيانة والفحص المطلوب بنجاح.\n\n`;
  if (balanceDue > 0) {
    message += `💰 *المبلغ المطلوب عند الاستلام:* ${balanceDue.toLocaleString()} ج.م\n\n`;
  }
  message += `📍 نتشرف بزيارتكم لاستلام السيارة في أي وقت خلال ساعات العمل.\n`;
  message += `أهلاً وسهلاً بكم دائماً، ونسعد بخدمتكم! 🤝\n`;
  message += `*${workshopName}*`;

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

  return {
    phone,
    cleanPhone,
    customerName,
    vehicleName,
    plateNumber,
    visitNumber: visit.visit_number,
    balanceDue,
    message,
    whatsappUrl
  };
}

export function updateVisitStatus(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { status, notes, odometer_out } = req.body;

  const validStatuses = [
    'received',
    'maintenance',
    'repairs',
    'in_repair',
    'engine_overhaul',
    'diagnostics',
    'diagnosing',
    'waiting_parts',
    'ready',
    'delivered',
    'cancelled'
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'حالة الزيارة غير صالحة' });
  }

  const visit = db.prepare(`
    SELECT v.*,
           veh.plate_number, veh.make, veh.model, veh.year,
           c.full_name as customer_name, c.phone as customer_phone,
           w.name as workshop_name, w.phone as workshop_phone
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN workshops w ON v.workshop_id = w.id
    WHERE v.id = ? AND v.workshop_id = ?
  `).get(id, workshopId) as any;

  if (!visit) {
    return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });
  }

  const odoOut = odometer_out !== undefined && odometer_out !== null && odometer_out !== '' ? parseInt(odometer_out, 10) : null;

  if (status === 'delivered') {
    db.prepare(`
      UPDATE visits SET status = ?, notes = COALESCE(?, notes), odometer_out = COALESCE(?, odometer_out), exit_datetime = CURRENT_TIMESTAMP, delivered_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workshop_id = ?
    `).run(status, notes || null, odoOut, req.user!.id, id, workshopId);
  } else {
    db.prepare(`
      UPDATE visits SET status = ?, notes = COALESCE(?, notes), odometer_out = COALESCE(?, odometer_out), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workshop_id = ?
    `).run(status, notes || null, odoOut, id, workshopId);
  }

  // Auto-sync with Work Orders & Diagnostics tables for the 4 maintenance categories
  if (['maintenance', 'repairs', 'in_repair', 'engine_overhaul'].includes(status)) {
    const existingWo = db.prepare('SELECT id FROM work_orders WHERE visit_id = ?').get(id) as any;
    const cat = status === 'maintenance' ? 'maintenance' : status === 'engine_overhaul' ? 'overhaul' : 'repair';

    if (!existingWo) {
      const orderId = uuidv4();
      const countRow = db.prepare('SELECT COUNT(*) as c FROM work_orders WHERE workshop_id = ?').get(workshopId) as { c: number };
      const orderNumber = `WO-${(countRow.c + 1).toString().padStart(4, '0')}`;
      const prefix = status === 'maintenance' ? 'صيانة دورية وسريعة: ' : status === 'engine_overhaul' ? 'عمرة وتوضيب محرك: ' : 'تصليح وإصلاحات: ';
      const description = `${prefix}${visit.customer_complaint || 'صيانة عامة'}`;

      try {
        db.prepare(`
          INSERT INTO work_orders (
            id, workshop_id, order_number, visit_id, vehicle_id,
            description, priority, status, category, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'normal', 'in_progress', ?, ?)
        `).run(
          orderId,
          workshopId,
          orderNumber,
          id,
          visit.vehicle_id,
          description,
          cat,
          req.user?.id || 'admin'
        );
      } catch (e) {
        console.error('Failed to auto-create work order:', e);
      }
    } else {
      try {
        db.prepare('UPDATE work_orders SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cat, existingWo.id);
      } catch (e) {
        console.error('Failed to update work order category:', e);
      }
    }
  } else if (['diagnostics', 'diagnosing'].includes(status)) {
    const existingDiag = db.prepare('SELECT id FROM diagnostics WHERE visit_id = ?').get(id) as any;
    if (!existingDiag) {
      const diagId = uuidv4();
      try {
        db.prepare(`
          INSERT INTO diagnostics (
            id, visit_id, vehicle_id, scanner_manufacturer, scanner_model,
            system_tested, technician_notes, technician_id
          ) VALUES (?, ?, ?, 'Autel MaxiSys', 'MS908S Pro', 'محرك ونظام الوقود (Engine & Fuel)', ?, ?)
        `).run(
          diagId,
          id,
          visit.vehicle_id,
          `فحص وتشخيص كمبيوتر: ${visit.customer_complaint || 'فحص عام'}`,
          req.user?.id || 'admin'
        );
      } catch (e) {
        console.error('Failed to auto-create diagnostic record:', e);
      }
    }
  }

  let whatsappData: any = null;
  if (status === 'ready') {
    const inv = db.prepare('SELECT grand_total as total_amount, balance_due FROM invoices WHERE visit_id = ? ORDER BY created_at DESC LIMIT 1').get(id) as any;
    whatsappData = buildWhatsAppReadyData(visit, inv);

    // Save notification
    try {
      const notifId = uuidv4();
      const vehicleTitle = `${visit.make} ${visit.model} (${visit.plate_number})`;
      db.prepare(`
        INSERT INTO notifications (id, workshop_id, title, message, category, reference_type, reference_id)
        VALUES (?, ?, ?, ?, 'vehicle_ready', 'visit', ?)
      `).run(
        notifId,
        workshopId,
        `سيارة جاهزة للتسليم: ${vehicleTitle}`,
        `أصبحت سيارة العميل ${visit.customer_name} جاهزة للتسليم. تم إعداد رسالة الواتساب للعميل.`,
        id
      );
    } catch (e) {
      console.error('Failed to insert notification:', e);
    }
  }

  logActivity(req, 'STATUS_CHANGE', 'visit', id, { status, visit_number: visit.visit_number });
  broadcastEvent({
    workshopId,
    entity: 'visits',
    entityId: id,
    action: 'STATUS_CHANGE',
    payload: { id, status, vehicle_id: visit.vehicle_id, whatsapp: whatsappData },
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    message: status === 'ready' ? 'تم تحديث الحالة إلى: جاهزة للتسليم وتجهيز رسالة الواتساب' : `تم تحديث حالة الزيارة إلى: ${status}`,
    whatsapp: whatsappData
  });
}

export function getVisitWhatsAppReady(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const visit = db.prepare(`
    SELECT v.*,
           veh.plate_number, veh.make, veh.model, veh.year,
           c.full_name as customer_name, c.phone as customer_phone,
           w.name as workshop_name, w.phone as workshop_phone
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN workshops w ON v.workshop_id = w.id
    WHERE v.id = ? AND v.workshop_id = ?
  `).get(id, workshopId) as any;

  if (!visit) {
    return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });
  }

  const inv = db.prepare('SELECT grand_total as total_amount, balance_due FROM invoices WHERE visit_id = ? ORDER BY created_at DESC LIMIT 1').get(id) as any;
  const whatsappData = buildWhatsAppReadyData(visit, inv);

  return res.json({
    success: true,
    data: whatsappData
  });
}

export function deleteVisit(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const visit = db.prepare('SELECT id, visit_number FROM visits WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!visit) {
    return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });
  }

  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM attachments WHERE visit_id = ?').run(id);
      db.prepare('DELETE FROM diagnostic_codes WHERE diagnostic_id IN (SELECT id FROM diagnostics WHERE visit_id = ?)').run(id);
      db.prepare('DELETE FROM diagnostics WHERE visit_id = ?').run(id);
      db.prepare('DELETE FROM oil_fluid_records WHERE visit_id = ?').run(id);
      db.prepare('DELETE FROM used_parts WHERE work_order_id IN (SELECT id FROM work_orders WHERE visit_id = ?)').run(id);
      db.prepare('DELETE FROM task_assignments WHERE task_id IN (SELECT t.id FROM tasks t JOIN work_orders wo ON t.work_order_id = wo.id WHERE wo.visit_id = ?)').run(id);
      db.prepare('DELETE FROM tasks WHERE work_order_id IN (SELECT id FROM work_orders WHERE visit_id = ?)').run(id);
      db.prepare('DELETE FROM work_orders WHERE visit_id = ?').run(id);
      db.prepare('DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE visit_id = ?)').run(id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE visit_id = ?)').run(id);
      db.prepare('DELETE FROM invoices WHERE visit_id = ?').run(id);
      db.prepare('DELETE FROM visits WHERE id = ? AND workshop_id = ?').run(id, workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'visit', id, { visit_number: visit.visit_number });
    broadcastEvent({
      workshopId,
      entity: 'visits',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف الزيارة بنجاح' });
  } catch (err: any) {
    console.error('Delete visit error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف الزيارة: ' + err.message });
  }
}

