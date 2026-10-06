import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getFluidRecords(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const vehicleId = req.query.vehicle_id as string;
  const visitId = req.query.visit_id as string;

  let sql = `
    SELECT 
      o.*,
      veh.plate_number, veh.make, veh.model, veh.year,
      c.full_name as customer_name, c.phone as customer_phone,
      u.full_name as technician_name,
      v.visit_number
    FROM oil_fluid_records o
    JOIN vehicles veh ON o.vehicle_id = veh.id
    JOIN visits v ON o.visit_id = v.id
    JOIN customers c ON veh.current_owner_id = c.id
    LEFT JOIN users u ON o.technician_id = u.id
    WHERE veh.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (vehicleId) {
    sql += ` AND o.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (visitId) {
    sql += ` AND o.visit_id = ?`;
    params.push(visitId);
  }

  sql += ` ORDER BY o.service_date DESC`;
  const records = db.prepare(sql).all(...params);

  return res.json({ success: true, data: records });
}

export function createFluidRecord(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    visit_id,
    vehicle_id,
    fluid_type,
    brand,
    product_name,
    viscosity,
    specifications,
    quantity_liters,
    filter_part_number,
    filter_replaced,
    cost,
    price,
    current_odometer,
    interval_km, // e.g. 5000 or 10000 km
    interval_months // e.g. 6 or 12 months
  } = req.body;

  if (!visit_id || !vehicle_id || !fluid_type || !brand || !quantity_liters || !current_odometer) {
    return res.status(400).json({
      success: false,
      error: 'الزيارة، السيارة، نوع السائل/الزيت، الماركة، الكمية، وقراءة العداد حقول إلزامية'
    });
  }

  const recordId = uuidv4();
  const odo = parseInt(current_odometer, 10);
  const qty = parseFloat(quantity_liters);

  // Calculate next due date and KM
  const kmInterval = interval_km ? parseInt(interval_km, 10) : 10000;
  const nextKm = odo + kmInterval;

  const monthsInterval = interval_months ? parseInt(interval_months, 10) : 6;
  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + monthsInterval);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  executeTransaction(() => {
    // 1. Insert Fluid Record
    db.prepare(`
      INSERT INTO oil_fluid_records (
        id, visit_id, vehicle_id, fluid_type, brand, product_name,
        viscosity, specifications, quantity_liters, filter_part_number,
        filter_replaced, cost, price, current_odometer, next_due_date, next_due_km, technician_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      visit_id,
      vehicle_id,
      fluid_type,
      brand.trim(),
      product_name?.trim() || null,
      viscosity?.trim() || null,
      specifications?.trim() || null,
      qty,
      filter_part_number?.trim() || null,
      filter_replaced === false ? 0 : 1,
      parseFloat(cost || 0),
      parseFloat(price || 0),
      odo,
      nextDateStr,
      nextKm,
      req.user!.id
    );

    // 2. Update vehicle next maintenance indicators
    db.prepare(`
      UPDATE vehicles SET
        next_maintenance_date = ?,
        next_maintenance_km = ?,
        current_odometer = MAX(current_odometer, ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextDateStr, nextKm, odo, vehicle_id);
  });

  logActivity(req, 'CREATE', 'fluid_change', recordId, {
    vehicle_id,
    fluid_type,
    viscosity,
    nextKm
  });

  broadcastEvent({
    workshopId,
    entity: 'fluids',
    entityId: recordId,
    action: 'INSERT',
    payload: { id: recordId, vehicle_id, fluid_type, nextKm },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: recordId, next_due_date: nextDateStr, next_due_km: nextKm },
    message: `تم تسجيل تغيير ${fluid_type} بنجاح. موعد الصيانة القادم عند: ${nextKm} كم أو تاريخ ${nextDateStr}`
  });
}

/**
 * Get vehicles with upcoming maintenance due based on mileage or date
 */
export function getUpcomingMaintenance(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';

  const upcoming = db.prepare(`
    SELECT 
      v.id, v.plate_number, v.make, v.model, v.year, v.current_odometer,
      v.next_maintenance_date, v.next_maintenance_km,
      c.id as customer_id, c.full_name as customer_name, c.phone as customer_phone
    FROM vehicles v
    JOIN customers c ON v.current_owner_id = c.id
    WHERE v.workshop_id = ? 
      AND v.deleted_at IS NULL
      AND (
        (v.next_maintenance_date IS NOT NULL AND v.next_maintenance_date <= DATE('now', '+30 days'))
        OR (v.next_maintenance_km IS NOT NULL AND v.current_odometer >= (v.next_maintenance_km - 1000))
      )
    ORDER BY v.next_maintenance_date ASC
  `).all(workshopId);

  return res.json({ success: true, data: upcoming });
}
