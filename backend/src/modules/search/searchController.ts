import { Request, Response } from 'express';
import db from '../../database/db';

export function globalSearch(req: Request, res: Response) {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q || q.length < 1) {
      return res.json({
        success: true,
        data: {
          customers: [],
          vehicles: [],
          visits: [],
          workOrders: [],
          diagnosticCodes: [],
          totalResults: 0
        }
      });
    }

    const workshopId = req.user?.workshop_id;
    if (!workshopId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const wildcard = `%${q}%`;

    // 1. Search Customers (اسم العميل أو الهاتف أو الكود)
    const customers = db.prepare(`
      SELECT id, customer_code, full_name, phone, phone_secondary, email, address, total_balance_due, visit_count
      FROM customers
      WHERE workshop_id = ? AND deleted_at IS NULL AND (
        full_name LIKE ? OR phone LIKE ? OR phone_secondary LIKE ? OR customer_code LIKE ?
      )
      ORDER BY last_visit_at DESC, created_at DESC
      LIMIT 8
    `).all(workshopId, wildcard, wildcard, wildcard, wildcard);

    // 2. Search Vehicles (رقم اللوحة، الماركة، الموديل، الشاسيه، واسم المالك)
    const vehicles = db.prepare(`
      SELECT v.id, v.plate_number, v.vin, v.make, v.model, v.year, v.color, v.current_odometer,
             c.id as owner_id, c.full_name as owner_name, c.phone as owner_phone
      FROM vehicles v
      LEFT JOIN customers c ON v.current_owner_id = c.id
      WHERE v.workshop_id = ? AND v.deleted_at IS NULL AND (
        v.plate_number LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR v.vin LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?
      )
      ORDER BY v.last_visit_at DESC, v.created_at DESC
      LIMIT 8
    `).all(workshopId, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);

    // 3. Search Visits / Faults / Complaints (الشكوى والعطل، الفحص المبدئي، الملاحظات، رقم الزيارة)
    const visits = db.prepare(`
      SELECT vi.id, vi.visit_number, vi.customer_complaint, vi.initial_inspection, vi.intake_condition, vi.notes, vi.status, vi.entry_datetime, vi.odometer_in,
             v.id as vehicle_id, v.plate_number, v.make, v.model, v.year,
             c.id as customer_id, c.full_name as customer_name, c.phone as customer_phone
      FROM visits vi
      JOIN vehicles v ON vi.vehicle_id = v.id
      JOIN customers c ON vi.customer_id = c.id
      WHERE vi.workshop_id = ? AND (
        vi.customer_complaint LIKE ? OR vi.initial_inspection LIKE ? OR vi.notes LIKE ? OR vi.visit_number LIKE ?
        OR c.full_name LIKE ? OR c.phone LIKE ? OR v.plate_number LIKE ? OR v.make LIKE ? OR v.model LIKE ?
      )
      ORDER BY vi.entry_datetime DESC
      LIMIT 8
    `).all(workshopId, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);

    // 4. Search Work Orders / Tasks (وصف العطل والإصلاح، نتيجة الفحص، رقم الأمر)
    const workOrders = db.prepare(`
      SELECT wo.id, wo.order_number, wo.description, wo.inspection_result, wo.priority, wo.status, wo.estimated_cost, wo.visit_id,
             v.id as vehicle_id, v.plate_number, v.make, v.model,
             c.id as customer_id, c.full_name as customer_name, c.phone as customer_phone
      FROM work_orders wo
      JOIN vehicles v ON wo.vehicle_id = v.id
      JOIN visits vi ON wo.visit_id = vi.id
      JOIN customers c ON vi.customer_id = c.id
      WHERE wo.workshop_id = ? AND (
        wo.description LIKE ? OR wo.inspection_result LIKE ? OR wo.order_number LIKE ?
        OR c.full_name LIKE ? OR v.plate_number LIKE ?
      )
      ORDER BY wo.created_at DESC
      LIMIT 8
    `).all(workshopId, wildcard, wildcard, wildcard, wildcard, wildcard);

    // 5. Search Diagnostics DTC (كود العطل DTC، وصف العطل، منظومة السيارة)
    const diagnosticCodes = db.prepare(`
      SELECT dc.id, dc.dtc_code, dc.description, dc.system, dc.status_at_test, dc.repair_action, dc.diagnostic_id,
             v.id as vehicle_id, v.plate_number, v.make, v.model,
             c.id as customer_id, c.full_name as customer_name, c.phone as customer_phone
      FROM diagnostic_codes dc
      JOIN vehicles v ON dc.vehicle_id = v.id
      LEFT JOIN customers c ON v.current_owner_id = c.id
      JOIN diagnostics d ON dc.diagnostic_id = d.id
      JOIN visits vi ON d.visit_id = vi.id
      WHERE vi.workshop_id = ? AND (
        dc.dtc_code LIKE ? OR dc.description LIKE ? OR dc.system LIKE ? OR d.scanner_manufacturer LIKE ?
      )
      ORDER BY dc.created_at DESC
      LIMIT 8
    `).all(workshopId, wildcard, wildcard, wildcard, wildcard);

    const totalResults = customers.length + vehicles.length + visits.length + workOrders.length + diagnosticCodes.length;

    return res.json({
      success: true,
      data: {
        customers,
        vehicles,
        visits,
        workOrders,
        diagnosticCodes,
        totalResults
      }
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return res.status(500).json({ success: false, error: error.message || 'خطأ في عملية البحث' });
  }
}
