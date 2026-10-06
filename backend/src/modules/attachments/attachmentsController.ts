import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function uploadAttachment(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'لم يتم استلام أي ملف للرفع' });
  }

  const { vehicle_id, visit_id, work_order_id, task_id, category, caption } = req.body;
  const attachmentId = uuidv4();

  db.prepare(`
    INSERT INTO attachments (
      id, workshop_id, vehicle_id, visit_id, work_order_id, task_id,
      category, file_name, file_path, mime_type, file_size, caption, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attachmentId,
    workshopId,
    vehicle_id || null,
    visit_id || null,
    work_order_id || null,
    task_id || null,
    category || 'damage',
    file.originalname,
    `/uploads/${file.filename}`,
    file.mimetype,
    file.size,
    caption?.trim() || null,
    req.user!.id
  );

  logActivity(req, 'CREATE', 'attachment', attachmentId, {
    category,
    vehicle_id,
    file_name: file.originalname
  });

  // Broadcast to Windows / Android clients instantly!
  broadcastEvent({
    workshopId,
    entity: 'attachments',
    entityId: attachmentId,
    action: 'INSERT',
    payload: {
      id: attachmentId,
      vehicle_id,
      visit_id,
      work_order_id,
      category,
      file_path: `/uploads/${file.filename}`,
      caption
    },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: {
      id: attachmentId,
      file_name: file.originalname,
      file_path: `/uploads/${file.filename}`,
      category
    },
    message: 'تم رفع الملف وحفظه بنجاح'
  });
}

export function getAttachments(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const vehicleId = req.query.vehicle_id as string;
  const visitId = req.query.visit_id as string;
  const workOrderId = req.query.work_order_id as string;

  let sql = `
    SELECT a.*, u.full_name as uploaded_by_name
    FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (vehicleId) {
    sql += ` AND a.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (visitId) {
    sql += ` AND a.visit_id = ?`;
    params.push(visitId);
  }
  if (workOrderId) {
    sql += ` AND a.work_order_id = ?`;
    params.push(workOrderId);
  }

  sql += ` ORDER BY a.created_at DESC`;
  const list = db.prepare(sql).all(...params);

  return res.json({ success: true, data: list });
}
