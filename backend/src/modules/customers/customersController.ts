import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getCustomers(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const search = (req.query.search as string || '').trim();

  let sql = `
    SELECT 
      c.id, c.customer_code, c.full_name, c.phone, c.phone_secondary, 
      c.email, c.address, c.notes, c.total_balance_due, c.visit_count, 
      c.last_visit_at, c.created_at,
      COUNT(DISTINCT v.id) as vehicles_count,
      json_group_array(
        CASE WHEN v.id IS NOT NULL THEN
          json_object(
            'id', v.id,
            'plate_number', v.plate_number,
            'vin', v.vin,
            'make', v.make,
            'model', v.model,
            'year', v.year,
            'color', v.color,
            'fuel_type', v.fuel_type,
            'transmission_type', v.transmission_type,
            'current_odometer', v.current_odometer
          )
        ELSE NULL END
      ) as vehicles_json
    FROM customers c
    LEFT JOIN vehicles v ON v.current_owner_id = c.id AND v.deleted_at IS NULL
    WHERE c.workshop_id = ? AND c.deleted_at IS NULL
  `;
  const params: any[] = [workshopId];

  if (search) {
    sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;
  const customers = db.prepare(sql).all(...params) as any[];

  for (const c of customers) {
    if (c.vehicles_json) {
      try {
        const arr = JSON.parse(c.vehicles_json);
        c.vehicles = arr.filter((x: any) => x !== null && x.id);
      } catch {
        c.vehicles = [];
      }
      delete c.vehicles_json;
    } else {
      c.vehicles = [];
    }
  }

  return res.json({ success: true, data: customers });
}

export function getCustomerById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const customer = db.prepare(`
    SELECT * FROM customers 
    WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL
  `).get(id, workshopId) as any;

  if (!customer) {
    return res.status(404).json({ success: false, error: 'العميل غير موجود' });
  }

  // Fetch customer's vehicles
  const vehicles = db.prepare(`
    SELECT * FROM vehicles 
    WHERE current_owner_id = ? AND deleted_at IS NULL 
    ORDER BY created_at DESC
  `).all(id);

  // Fetch recent visits
  const recentVisits = db.prepare(`
    SELECT v.*, veh.plate_number, veh.make, veh.model
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    WHERE v.customer_id = ?
    ORDER BY v.entry_datetime DESC
    LIMIT 10
  `).all(id);

  // Fetch invoices and unpaid balances
  const invoices = db.prepare(`
    SELECT id, invoice_number, grand_total, paid_amount, balance_due, status, issue_date
    FROM invoices
    WHERE customer_id = ?
    ORDER BY issue_date DESC
  `).all(id);

  return res.json({
    success: true,
    data: {
      ...customer,
      vehicles,
      recentVisits,
      invoices
    }
  });
}

export function createCustomer(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { full_name, phone, phone_secondary, email, address, notes, vehicle } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ success: false, error: 'الاسم الكامل ورقم الهاتف الأساسي حقول إلزامية' });
  }

  // Generate unique sequential customer code
  const countRow = db.prepare('SELECT COUNT(*) as c FROM customers WHERE workshop_id = ?').get(workshopId) as { c: number };
  const customer_code = `C-${(countRow.c + 1).toString().padStart(4, '0')}`;
  const customerId = uuidv4();
  let createdVehicleId: string | null = null;

  executeTransaction(() => {
    db.prepare(`
      INSERT INTO customers (id, workshop_id, customer_code, full_name, phone, phone_secondary, email, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      workshopId,
      customer_code,
      full_name.trim(),
      phone.trim(),
      phone_secondary?.trim() || null,
      email?.trim() || null,
      address?.trim() || null,
      notes?.trim() || null
    );

    // If vehicle details are supplied, register the vehicle automatically linked to this customer
    if (vehicle && vehicle.plate_number && vehicle.make && vehicle.model) {
      const cleanPlate = vehicle.plate_number.replace(/\s+/g, ' ').trim().toUpperCase();
      const existingVeh = db.prepare('SELECT id FROM vehicles WHERE plate_number = ? AND workshop_id = ? AND deleted_at IS NULL').get(cleanPlate, workshopId) as any;

      if (!existingVeh) {
        const vehicleId = uuidv4();
        createdVehicleId = vehicleId;
        db.prepare(`
          INSERT INTO vehicles (
            id, workshop_id, current_owner_id, plate_number, vin, make, model, year, color,
            fuel_type, transmission_type, current_odometer, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          vehicleId,
          workshopId,
          customerId,
          cleanPlate,
          vehicle.vin?.trim() || null,
          vehicle.make.trim(),
          vehicle.model.trim(),
          parseInt(vehicle.year) || new Date().getFullYear(),
          vehicle.color?.trim() || null,
          vehicle.fuel_type || 'بنزين',
          vehicle.transmission_type || 'أوتوماتيك',
          parseInt(vehicle.current_odometer) || 0,
          vehicle.notes?.trim() || null
        );

        // Ownership history
        db.prepare(`
          INSERT INTO vehicle_ownership_history (id, vehicle_id, previous_owner_id, new_owner_id, transfer_odometer, reason, transferred_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          vehicleId,
          customerId,
          customerId,
          parseInt(vehicle.current_odometer) || 0,
          'تسجيل السيارة مع العميل الجديد',
          req.user?.id || 'usr_default_01'
        );

        broadcastEvent({
          workshopId,
          entity: 'vehicles',
          entityId: vehicleId,
          action: 'INSERT',
          payload: { id: vehicleId, plate_number: cleanPlate, make: vehicle.make, model: vehicle.model, owner_name: full_name },
          originUserId: req.user?.id
        });
      }
    }
  });

  logActivity(req, 'CREATE', 'customer', customerId, { full_name, customer_code });
  broadcastEvent({
    workshopId,
    entity: 'customers',
    entityId: customerId,
    action: 'INSERT',
    payload: { id: customerId, full_name, phone, customer_code },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: customerId, customer_code, full_name, phone, vehicle_id: createdVehicleId },
    message: 'تم إضافة العميل والسيارة بنجاح'
  });
}

export function updateCustomer(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { full_name, phone, phone_secondary, email, address, notes } = req.body;

  const existing = db.prepare('SELECT id FROM customers WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(id, workshopId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'العميل غير موجود' });
  }

  db.prepare(`
    UPDATE customers 
    SET full_name = ?, phone = ?, phone_secondary = ?, email = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(
    full_name.trim(),
    phone.trim(),
    phone_secondary?.trim() || null,
    email?.trim() || null,
    address?.trim() || null,
    notes?.trim() || null,
    id,
    workshopId
  );

  logActivity(req, 'UPDATE', 'customer', id, { full_name, phone });
  broadcastEvent({
    workshopId,
    entity: 'customers',
    entityId: id,
    action: 'UPDATE',
    payload: { id, full_name, phone },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
}

export function deleteCustomer(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const customer = db.prepare('SELECT id, full_name, customer_code FROM customers WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!customer) {
    return res.status(404).json({ success: false, error: 'العميل غير موجود' });
  }

  try {
    const tx = db.transaction(() => {
      // Find all vehicles owned by this customer
      const vehicleIds = (db.prepare('SELECT id FROM vehicles WHERE current_owner_id = ? AND workshop_id = ?').all(id, workshopId) as any[]).map(v => v.id);

      for (const vId of vehicleIds) {
        db.prepare('DELETE FROM attachments WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM diagnostic_codes WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM diagnostics WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM oil_fluid_records WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM used_parts WHERE work_order_id IN (SELECT id FROM work_orders WHERE vehicle_id = ?)').run(vId);
        db.prepare('DELETE FROM task_assignments WHERE task_id IN (SELECT t.id FROM tasks t JOIN work_orders wo ON t.work_order_id = wo.id WHERE wo.vehicle_id = ?)').run(vId);
        db.prepare('DELETE FROM tasks WHERE work_order_id IN (SELECT id FROM work_orders WHERE vehicle_id = ?)').run(vId);
        db.prepare('DELETE FROM work_orders WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE vehicle_id = ?)').run(vId);
        db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE vehicle_id = ?)').run(vId);
        db.prepare('DELETE FROM invoices WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM visits WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM vehicle_ownership_history WHERE vehicle_id = ?').run(vId);
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(vId);
      }

      // Also clean up any direct customer references
      db.prepare('DELETE FROM payments WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE customer_id = ?)').run(id);
      db.prepare('DELETE FROM invoices WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM visits WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM vehicle_ownership_history WHERE previous_owner_id = ? OR new_owner_id = ?').run(id, id);

      // Finally delete the customer
      db.prepare('DELETE FROM customers WHERE id = ? AND workshop_id = ?').run(id, workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'customer', id, { full_name: customer.full_name, customer_code: customer.customer_code });
    broadcastEvent({
      workshopId,
      entity: 'customers',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف العميل وكافة سجلاته بنجاح' });
  } catch (err: any) {
    console.error('Delete customer error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف العميل: ' + err.message });
  }
}

