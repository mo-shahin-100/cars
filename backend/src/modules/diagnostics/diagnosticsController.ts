import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getDiagnostics(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const vehicleId = req.query.vehicle_id as string;
  const visitId = req.query.visit_id as string;

  let sql = `
    SELECT 
      d.*,
      veh.plate_number, veh.make, veh.model,
      v.visit_number,
      u.full_name as technician_name,
      COUNT(dc.id) as dtc_count
    FROM diagnostics d
    JOIN vehicles veh ON d.vehicle_id = veh.id
    JOIN visits v ON d.visit_id = v.id
    LEFT JOIN users u ON d.technician_id = u.id
    LEFT JOIN diagnostic_codes dc ON dc.diagnostic_id = d.id
    WHERE veh.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (vehicleId) {
    sql += ` AND d.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (visitId) {
    sql += ` AND d.visit_id = ?`;
    params.push(visitId);
  }

  sql += ` GROUP BY d.id ORDER BY d.test_datetime DESC`;
  const reports = db.prepare(sql).all(...params) as any[];

  if (reports.length > 0) {
    const reportIds = reports.map(r => r.id);
    const placeholders = reportIds.map(() => '?').join(',');
    const allCodes = db.prepare(`
      SELECT id, diagnostic_id, vehicle_id, dtc_code, description, system, status_at_test, is_confirmed_by_tech, resolution_status
      FROM diagnostic_codes
      WHERE diagnostic_id IN (${placeholders})
      ORDER BY dtc_code ASC
    `).all(...reportIds) as any[];

    const codesMap: Record<string, any[]> = {};
    for (const code of allCodes) {
      if (!codesMap[code.diagnostic_id]) {
        codesMap[code.diagnostic_id] = [];
      }
      codesMap[code.diagnostic_id].push(code);
    }

    for (const report of reports) {
      report.codes = codesMap[report.id] || [];
    }
  }

  return res.json({ success: true, data: reports });
}

export function getDiagnosticById(req: Request, res: Response) {
  const { id } = req.params;

  const report = db.prepare(`
    SELECT 
      d.*,
      veh.plate_number, veh.vin, veh.make, veh.model, veh.year,
      v.visit_number, v.odometer_in,
      u.full_name as technician_name
    FROM diagnostics d
    JOIN vehicles veh ON d.vehicle_id = veh.id
    JOIN visits v ON d.visit_id = v.id
    LEFT JOIN users u ON d.technician_id = u.id
    WHERE d.id = ?
  `).get(id) as any;

  if (!report) {
    return res.status(404).json({ success: false, error: 'تقرير الفحص غير موجود' });
  }

  report.codes = db.prepare(`
    SELECT * FROM diagnostic_codes WHERE diagnostic_id = ? ORDER BY dtc_code ASC
  `).all(id);

  return res.json({ success: true, data: report });
}

export function createDiagnostic(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    visit_id,
    vehicle_id,
    scanner_manufacturer,
    scanner_model,
    system_tested,
    freeze_frame,
    live_data,
    technician_notes,
    codes // Array of { dtc_code, description, system, status_at_test, is_confirmed_by_tech }
  } = req.body;

  if (!visit_id || !vehicle_id || !system_tested) {
    return res.status(400).json({ success: false, error: 'الزيارة، السيارة، والنظام المفحوص حقول إلزامية' });
  }

  const diagnosticId = uuidv4();

  executeTransaction(() => {
    // 1. Insert Diagnostic Report
    db.prepare(`
      INSERT INTO diagnostics (
        id, visit_id, vehicle_id, scanner_manufacturer, scanner_model,
        system_tested, freeze_frame_json, live_data_json, technician_notes, technician_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      diagnosticId,
      visit_id,
      vehicle_id,
      scanner_manufacturer?.trim() || 'جهاز فحص يدوي / Scanner',
      scanner_model?.trim() || null,
      system_tested.trim(),
      freeze_frame ? JSON.stringify(freeze_frame) : null,
      live_data ? JSON.stringify(live_data) : null,
      technician_notes?.trim() || null,
      req.user!.id
    );

    // 2. Insert Diagnostic DTC Codes
    if (Array.isArray(codes) && codes.length > 0) {
      const insertCodeStmt = db.prepare(`
        INSERT INTO diagnostic_codes (
          id, diagnostic_id, vehicle_id, dtc_code, description,
          system, status_at_test, is_confirmed_by_tech, resolution_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'detected')
      `);

      for (const c of codes) {
        if (!c.dtc_code) continue;
        insertCodeStmt.run(
          uuidv4(),
          diagnosticId,
          vehicle_id,
          c.dtc_code.trim().toUpperCase(),
          c.description?.trim() || 'كود عطل مسجل بجهاز الفحص',
          c.system || system_tested,
          c.status_at_test || 'Current',
          c.is_confirmed_by_tech ? 1 : 0
        );
      }
    }
  });

  logActivity(req, 'CREATE', 'diagnostic', diagnosticId, {
    vehicle_id,
    system_tested,
    codes_count: codes?.length || 0
  });

  broadcastEvent({
    workshopId,
    entity: 'diagnostics',
    entityId: diagnosticId,
    action: 'INSERT',
    payload: { id: diagnosticId, vehicle_id, system_tested },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: diagnosticId },
    message: 'تم تسجيل تقرير الفحص وأكواد الأعطال بنجاح'
  });
}

/**
 * Section 10: Full DTC Code Historical Evolution Tracker
 * Traces a specific DTC code (e.g. P0301) across all vehicle visits, diagnostic scans,
 * repair actions, and subsequent re-test results!
 */
export function getDtcCodeHistory(req: Request, res: Response) {
  const { code } = req.params;
  const vehicleId = req.query.vehicle_id as string;

  if (!code) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد كود العطل المطلوب تتبعه' });
  }

  let sql = `
    SELECT 
      dc.*,
      d.scanner_manufacturer, d.scanner_model, d.test_datetime, d.system_tested,
      v.visit_number, v.entry_datetime, v.odometer_in,
      u.full_name as technician_name,
      veh.plate_number, veh.make, veh.model
    FROM diagnostic_codes dc
    JOIN diagnostics d ON dc.diagnostic_id = d.id
    JOIN visits v ON d.visit_id = v.id
    JOIN vehicles veh ON dc.vehicle_id = veh.id
    LEFT JOIN users u ON d.technician_id = u.id
    WHERE UPPER(dc.dtc_code) = UPPER(?)
  `;
  const params: any[] = [code.trim()];

  if (vehicleId) {
    sql += ` AND dc.vehicle_id = ?`;
    params.push(vehicleId);
  }

  sql += ` ORDER BY d.test_datetime DESC`;
  const appearances = db.prepare(sql).all(...params) as any[];

  // Determine latest verified status based strictly on the newest scan report!
  let currentVerifiedState = 'never_detected';
  let firstDetectedDate = null;
  let lastScannedDate = null;

  if (appearances.length > 0) {
    const latest = appearances[0];
    const oldest = appearances[appearances.length - 1];
    firstDetectedDate = oldest.test_datetime;
    lastScannedDate = latest.test_datetime;
    currentVerifiedState = latest.status_at_test === 'History' || latest.resolution_status === 'resolved_verified'
      ? 'resolved_verified'
      : latest.status_at_test; // Current or Pending
  }

  return res.json({
    success: true,
    data: {
      dtc_code: code.toUpperCase(),
      total_appearances: appearances.length,
      first_detected: firstDetectedDate,
      last_scanned: lastScannedDate,
      current_verified_state: currentVerifiedState,
      appearances
    }
  });
}
