import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db';

export function logActivity(
  req: Request,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PAYMENT' | 'EXPORT' | 'BACKUP' | 'LOGIN',
  entityName: string,
  entityId: string,
  details?: Record<string, any>
) {
  try {
    const userId = req.user ? req.user.id : null;
    const workshopId = req.user ? req.user.workshop_id : 'ws_default_01';
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    db.prepare(`
      INSERT INTO activity_logs (id, workshop_id, user_id, action, entity_name, entity_id, details_json, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      workshopId,
      userId,
      action,
      entityName,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent
    );
  } catch (err) {
    console.error('Failed to log activity audit:', err);
  }
}
