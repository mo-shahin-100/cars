import { Request, Response } from 'express';
import db from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getWorkshopProfile(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  let workshop = db.prepare('SELECT * FROM workshops WHERE id = ?').get(workshopId) as any;

  if (!workshop) {
    workshop = db.prepare('SELECT * FROM workshops LIMIT 1').get() as any;
  }

  if (!workshop) {
    return res.status(404).json({ success: false, error: 'بيانات الورشة غير موجودة' });
  }

  return res.json({ success: true, data: workshop });
}

export function updateWorkshopProfile(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { name, commercial_reg, tax_number, phone, email, address, currency, tax_rate } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'اسم الورشة حقل إلزامي' });
  }

  let workshop = db.prepare('SELECT id FROM workshops WHERE id = ?').get(workshopId) as any;
  if (!workshop) {
    workshop = db.prepare('SELECT id FROM workshops LIMIT 1').get() as any;
  }

  const targetId = workshop ? workshop.id : workshopId;

  db.prepare(`
    UPDATE workshops SET
      name = ?,
      commercial_reg = ?,
      tax_number = ?,
      phone = ?,
      email = ?,
      address = ?,
      currency = COALESCE(?, currency),
      tax_rate = COALESCE(?, tax_rate),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name.trim(),
    commercial_reg ? commercial_reg.trim() : null,
    tax_number ? tax_number.trim() : null,
    phone ? phone.trim() : null,
    email ? email.trim() : null,
    address ? address.trim() : null,
    currency ? currency.trim() : 'EGP',
    tax_rate !== undefined ? parseFloat(tax_rate) : 15.0,
    targetId
  );

  const updated = db.prepare('SELECT * FROM workshops WHERE id = ?').get(targetId) as any;

  logActivity(req, 'UPDATE', 'workshop', targetId, { name, commercial_reg, tax_number });
  broadcastEvent({
    workshopId: targetId,
    entity: 'workshop',
    entityId: targetId,
    action: 'UPDATE',
    payload: updated,
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    data: updated,
    message: 'تم تحديث بيانات الورشة بنجاح'
  });
}
