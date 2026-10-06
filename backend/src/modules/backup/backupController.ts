import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../../database/db';
import { logActivity } from '../../middleware/audit';

export async function createHotBackup(req: Request, res: Response) {
  try {
    const backupDir = path.join(__dirname, '../../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `workshop_backup_${timestamp}.db`;
    const backupFilePath = path.join(backupDir, backupFilename);

    // Use SQLite's safe online backup API to copy while running!
    await (db as any).backup(backupFilePath);

    logActivity(req, 'BACKUP', 'database', backupFilename, { backupFilePath });

    return res.download(backupFilePath, backupFilename, (err) => {
      if (err) {
        console.error('Error sending backup file download:', err);
      }
    });
  } catch (error: any) {
    console.error('Backup creation failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء النسخة الاحتياطية لقاعدة البيانات' });
  }
}

export function listBackups(req: Request, res: Response) {
  const backupDir = path.join(__dirname, '../../../backups');
  if (!fs.existsSync(backupDir)) {
    return res.json({ success: true, data: [] });
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db') || f.endsWith('.bak'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return {
        name: f,
        size: stat.size,
        created_at: stat.birthtime
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({ success: true, data: files });
}

import { broadcastEvent } from '../../websocket/socketServer';

export function resetDemoData(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  try {
    const tx = db.transaction(() => {
      // 0. Delete purchase invoice items and purchase invoices
      db.prepare(`DELETE FROM purchase_invoice_items WHERE purchase_invoice_id IN (SELECT id FROM purchase_invoices WHERE workshop_id = ?)`).run(workshopId);
      db.prepare(`DELETE FROM purchase_invoices WHERE workshop_id = ?`).run(workshopId);

      // 1. Delete attachments (references tasks, work_orders, visits, vehicles)
      db.prepare(`DELETE FROM attachments WHERE workshop_id = ?`).run(workshopId);

      // 2. Delete payments (references invoices with RESTRICT)
      db.prepare(`DELETE FROM payments WHERE workshop_id = ?`).run(workshopId);

      // 3. Delete invoice items (references invoices, parts)
      db.prepare(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE workshop_id = ?)`).run(workshopId);

      // 4. Delete invoices (references work_orders, visits, vehicles, customers)
      db.prepare(`DELETE FROM invoices WHERE workshop_id = ?`).run(workshopId);

      // 5. Delete used parts (references tasks, work_orders, stock_movements, parts)
      db.prepare(`DELETE FROM used_parts WHERE work_order_id IN (SELECT id FROM work_orders WHERE workshop_id = ?)`).run(workshopId);

      // 6. Delete task assignments (references tasks, users)
      db.prepare(`DELETE FROM task_assignments WHERE task_id IN (SELECT t.id FROM tasks t JOIN work_orders wo ON t.work_order_id = wo.id WHERE wo.workshop_id = ?)`).run(workshopId);

      // 7. Delete tasks (references work_orders)
      db.prepare(`DELETE FROM tasks WHERE work_order_id IN (SELECT id FROM work_orders WHERE workshop_id = ?)`).run(workshopId);

      // 8. Delete work orders (references visits with RESTRICT, vehicles)
      db.prepare(`DELETE FROM work_orders WHERE workshop_id = ?`).run(workshopId);

      // 9. Delete diagnostic codes (references diagnostics, vehicles)
      db.prepare(`DELETE FROM diagnostic_codes WHERE vehicle_id IN (SELECT id FROM vehicles WHERE workshop_id = ?)`).run(workshopId);

      // 10. Delete diagnostics (references visits, vehicles)
      db.prepare(`DELETE FROM diagnostics WHERE vehicle_id IN (SELECT id FROM vehicles WHERE workshop_id = ?)`).run(workshopId);

      // 11. Delete oil & fluid records (references visits, vehicles)
      db.prepare(`DELETE FROM oil_fluid_records WHERE vehicle_id IN (SELECT id FROM vehicles WHERE workshop_id = ?)`).run(workshopId);

      // 12. Delete visits (references vehicles, customers)
      db.prepare(`DELETE FROM visits WHERE workshop_id = ?`).run(workshopId);

      // 13. Delete vehicle ownership history (references vehicles, customers)
      db.prepare(`DELETE FROM vehicle_ownership_history WHERE vehicle_id IN (SELECT id FROM vehicles WHERE workshop_id = ?)`).run(workshopId);

      // 14. Delete vehicles (references customers)
      db.prepare(`DELETE FROM vehicles WHERE workshop_id = ?`).run(workshopId);

      // 15. Delete customers
      db.prepare(`DELETE FROM customers WHERE workshop_id = ?`).run(workshopId);

      // 16. Delete expenses
      db.prepare(`DELETE FROM expenses WHERE workshop_id = ?`).run(workshopId);

      // 17. Delete stock movements
      db.prepare(`DELETE FROM stock_movements WHERE workshop_id = ?`).run(workshopId);

      // 18. Delete notifications
      db.prepare(`DELETE FROM notifications WHERE workshop_id = ?`).run(workshopId);

      // 19. Delete sync events
      db.prepare(`DELETE FROM sync_events WHERE workshop_id = ?`).run(workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'database', 'demo_data_purged', { reset_by: req.user?.username });

    broadcastEvent({
      workshopId,
      entity: 'backup',
      entityId: 'reset-demo-data',
      action: 'DELETE',
      payload: { purged: true },
      originUserId: req.user?.id
    });

    return res.json({
      success: true,
      message: 'تم تصفير وحذف كافة البيانات التجريبية بنجاح! قاعدة البيانات الآن نظيفة وجاهزة لاستقبال بيانات الورشة الفعلية.'
    });
  } catch (err: any) {
    console.error('Reset demo data error:', err);
    return res.status(500).json({ success: false, error: 'فشل في تصفير البيانات: ' + err.message });
  }
}

