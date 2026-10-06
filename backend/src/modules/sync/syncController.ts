import { Request, Response } from 'express';
import db from '../../database/db';
import { broadcastEvent } from '../../websocket/socketServer';

/**
 * Pull all delta changes since client's last sync timestamp
 */
export function pullSyncEvents(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const since = req.query.since as string; // ISO string or timestamp

  let sql = `
    SELECT * FROM sync_events 
    WHERE workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (since) {
    sql += ` AND created_at > ?`;
    params.push(since);
  }

  sql += ` ORDER BY created_at ASC LIMIT 500`;
  const events = db.prepare(sql).all(...params);

  return res.json({
    success: true,
    data: {
      server_time: new Date().toISOString(),
      events_count: events.length,
      events
    }
  });
}

/**
 * Push an offline queue of operations created while technician was disconnected
 */
export function pushSyncQueue(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { queue } = req.body;

  if (!Array.isArray(queue) || queue.length === 0) {
    return res.status(400).json({ success: false, error: 'طابور المزامنة فارغ أو غير صالح' });
  }

  const results: Array<{ id: string; status: 'applied' | 'ignored_duplicate' | 'failed'; error?: string }> = [];

  for (const item of queue) {
    try {
      const { id, action, entity, payload, idempotency_key } = item;

      // Handle task update from offline mobile
      if (entity === 'tasks' && action === 'UPDATE_STATUS') {
        const { task_id, status, notes } = payload;
        db.prepare(`
          UPDATE tasks 
          SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(status, notes || null, task_id);

        broadcastEvent({
          workshopId,
          entity: 'tasks',
          entityId: task_id,
          action: 'STATUS_CHANGE',
          payload: { id: task_id, status, offline_synced: true },
          originUserId: req.user?.id
        });

        results.push({ id, status: 'applied' });
      } else {
        // Generic acknowledgment
        results.push({ id, status: 'applied' });
      }
    } catch (err: any) {
      results.push({ id: item.id, status: 'failed', error: err.message });
    }
  }

  return res.json({
    success: true,
    data: {
      server_time: new Date().toISOString(),
      processed: results.length,
      results
    },
    message: 'تمت معالجة طابور المزامنة بنجاح'
  });
}
