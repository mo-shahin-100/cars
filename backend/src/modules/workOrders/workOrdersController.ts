import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getWorkOrders(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const status = req.query.status as string;
  const visitId = req.query.visit_id as string;
  const vehicleId = req.query.vehicle_id as string;
  const mechanicId = req.query.mechanic_id as string;

  let sql = `
    SELECT 
      wo.*,
      veh.plate_number, veh.make, veh.model, veh.year,
      c.full_name as customer_name, c.phone as customer_phone,
      v.visit_number, v.status as visit_status,
      u.full_name as created_by_name,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
    FROM work_orders wo
    JOIN vehicles veh ON wo.vehicle_id = veh.id
    JOIN visits v ON wo.visit_id = v.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN users u ON wo.created_by = u.id
    LEFT JOIN tasks t ON t.work_order_id = wo.id
    LEFT JOIN task_assignments ta ON ta.task_id = t.id
    WHERE wo.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (status) {
    sql += ` AND wo.status = ?`;
    params.push(status);
  }
  if (visitId) {
    sql += ` AND wo.visit_id = ?`;
    params.push(visitId);
  }
  if (vehicleId) {
    sql += ` AND wo.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (mechanicId) {
    sql += ` AND (t.lead_mechanic_id = ? OR ta.user_id = ?)`;
    params.push(mechanicId, mechanicId);
  }

  sql += ` GROUP BY wo.id ORDER BY wo.created_at DESC`;
  const workOrders = db.prepare(sql).all(...params);

  return res.json({ success: true, data: workOrders });
}

export function getWorkOrderById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const order = db.prepare(`
    SELECT 
      wo.*,
      veh.plate_number, veh.vin, veh.make, veh.model, veh.year, veh.color, veh.current_odometer,
      c.id as customer_id, c.full_name as customer_name, c.phone as customer_phone,
      v.visit_number, v.odometer_in, v.customer_complaint,
      u.full_name as created_by_name
    FROM work_orders wo
    JOIN vehicles veh ON wo.vehicle_id = veh.id
    JOIN visits v ON wo.visit_id = v.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN users u ON wo.created_by = u.id
    WHERE wo.id = ? AND wo.workshop_id = ?
  `).get(id, workshopId) as any;

  if (!order) {
    return res.status(404).json({ success: false, error: 'أمر الإصلاح غير موجود' });
  }

  // Tasks with assigned mechanics
  const tasks = db.prepare(`
    SELECT t.*, u.full_name as lead_mechanic_name, u.phone as lead_mechanic_phone
    FROM tasks t
    LEFT JOIN users u ON t.lead_mechanic_id = u.id
    WHERE t.work_order_id = ?
    ORDER BY t.created_at ASC
  `).all(id) as any[];

  for (const t of tasks) {
    t.assignments = db.prepare(`
      SELECT ta.*, u.full_name as mechanic_name, u.specialty
      FROM task_assignments ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ?
    `).all(t.id);
  }
  order.tasks = tasks;

  // Used spare parts
  order.usedParts = db.prepare(`
    SELECT up.*, p.name as part_name, p.part_number, p.brand, p.category, u.full_name as recorded_by_name
    FROM used_parts up
    JOIN parts p ON up.part_id = p.id
    LEFT JOIN users u ON up.created_by = u.id
    WHERE up.work_order_id = ?
    ORDER BY up.created_at DESC
  `).all(id);

  // Attachments
  order.attachments = db.prepare(`
    SELECT a.*, u.full_name as uploaded_by_name
    FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.work_order_id = ?
    ORDER BY a.created_at DESC
  `).all(id);

  return res.json({ success: true, data: order });
}

export function createWorkOrder(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    visit_id,
    vehicle_id,
    description,
    inspection_result,
    priority,
    estimated_cost,
    estimated_hours,
    tasks // Optional array of initial tasks [{ title, description, lead_mechanic_id, assistant_ids }]
  } = req.body;

  if (!visit_id || !vehicle_id || !description) {
    return res.status(400).json({ success: false, error: 'الزيارة، السيارة، ووصف العمل المطلوب حقول إلزامية' });
  }

  const orderId = uuidv4();
  const countRow = db.prepare('SELECT COUNT(*) as c FROM work_orders WHERE workshop_id = ?').get(workshopId) as { c: number };
  const order_number = `WO-${(countRow.c + 1).toString().padStart(5, '0')}`;

  executeTransaction(() => {
    // 1. Insert Work Order
    db.prepare(`
      INSERT INTO work_orders (
        id, workshop_id, order_number, visit_id, vehicle_id,
        description, inspection_result, priority, status,
        estimated_cost, estimated_hours, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `).run(
      orderId,
      workshopId,
      order_number,
      visit_id,
      vehicle_id,
      description.trim(),
      inspection_result?.trim() || null,
      priority || 'normal',
      parseFloat(estimated_cost || 0),
      parseFloat(estimated_hours || 0),
      req.user!.id
    );

    // 2. Insert Tasks if supplied
    if (Array.isArray(tasks) && tasks.length > 0) {
      for (const t of tasks) {
        if (!t.title) continue;
        const taskId = uuidv4();
        db.prepare(`
          INSERT INTO tasks (id, work_order_id, title, description, price, lead_mechanic_id, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `).run(
          taskId,
          orderId,
          t.title.trim(),
          t.description?.trim() || null,
          parseFloat(t.price || 0),
          t.lead_mechanic_id || null
        );

        // Assign lead
        if (t.lead_mechanic_id) {
          db.prepare(`
            INSERT INTO task_assignments (id, task_id, user_id, role_in_task)
            VALUES (?, ?, ?, 'lead')
          `).run(uuidv4(), taskId, t.lead_mechanic_id);
        }

        // Assign assistants
        if (Array.isArray(t.assistant_ids)) {
          for (const asstId of t.assistant_ids) {
            if (asstId && asstId !== t.lead_mechanic_id) {
              db.prepare(`
                INSERT INTO task_assignments (id, task_id, user_id, role_in_task)
                VALUES (?, ?, ?, 'assistant')
              `).run(uuidv4(), taskId, asstId);
            }
          }
        }
      }
    }

    // 3. Update visit status to 'in_repair'
    db.prepare(`
      UPDATE visits SET status = 'in_repair', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'received'
    `).run(visit_id);
  });

  logActivity(req, 'CREATE', 'work_order', orderId, { order_number, vehicle_id });
  broadcastEvent({
    workshopId,
    entity: 'work_orders',
    entityId: orderId,
    action: 'INSERT',
    payload: { id: orderId, order_number, vehicle_id, status: 'new' },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: orderId, order_number, status: 'new' },
    message: `تم إنشاء أمر الإصلاح رقم [${order_number}] بنجاح`
  });
}

export function addTaskToWorkOrder(req: Request, res: Response) {
  const { work_order_id, title, description, price, lead_mechanic_id, assistant_ids } = req.body;
  if (!work_order_id || !title) {
    return res.status(400).json({ success: false, error: 'معرف أمر العمل واسم المهمة حقول إلزامية' });
  }

  const order = db.prepare('SELECT id, workshop_id, vehicle_id FROM work_orders WHERE id = ?').get(work_order_id) as any;
  if (!order) {
    return res.status(404).json({ success: false, error: 'أمر الإصلاح غير موجود' });
  }

  const taskId = uuidv4();

  executeTransaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, work_order_id, title, description, price, lead_mechanic_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      taskId,
      work_order_id,
      title.trim(),
      description?.trim() || null,
      parseFloat(price || 0),
      lead_mechanic_id || null
    );

    if (lead_mechanic_id) {
      db.prepare(`
        INSERT INTO task_assignments (id, task_id, user_id, role_in_task)
        VALUES (?, ?, ?, 'lead')
      `).run(uuidv4(), taskId, lead_mechanic_id);
    }

    if (Array.isArray(assistant_ids)) {
      for (const asstId of assistant_ids) {
        if (asstId && asstId !== lead_mechanic_id) {
          db.prepare(`
            INSERT INTO task_assignments (id, task_id, user_id, role_in_task)
            VALUES (?, ?, ?, 'assistant')
          `).run(uuidv4(), taskId, asstId);
        }
      }
    }
  });

  logActivity(req, 'CREATE', 'task', taskId, { work_order_id, title });
  broadcastEvent({
    workshopId: order.workshop_id,
    entity: 'tasks',
    entityId: taskId,
    action: 'INSERT',
    payload: { id: taskId, work_order_id, title, lead_mechanic_id },
    originUserId: req.user?.id
  });

  return res.status(201).json({ success: true, data: { id: taskId, title }, message: 'تمت إضافة المهمة بنجاح' });
}

export function updateTaskStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, notes, hours_worked } = req.body;

  const validStatuses = ['pending', 'in_progress', 'completed', 'paused', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'حالة المهمة غير صالحة' });
  }

  const task = db.prepare(`
    SELECT t.*, wo.workshop_id, wo.vehicle_id 
    FROM tasks t
    JOIN work_orders wo ON t.work_order_id = wo.id
    WHERE t.id = ?
  `).get(id) as any;

  if (!task) {
    return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
  }

  let startTimeUpdate = '';
  let endTimeUpdate = '';

  if (status === 'in_progress' && !task.start_time) {
    startTimeUpdate = ', start_time = CURRENT_TIMESTAMP';
  } else if (status === 'completed' && !task.end_time) {
    endTimeUpdate = ', end_time = CURRENT_TIMESTAMP';
  }

  executeTransaction(() => {
    db.prepare(`
      UPDATE tasks 
      SET status = ?, notes = COALESCE(?, notes) ${startTimeUpdate} ${endTimeUpdate}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, notes || null, id);

    // If mechanic reported hours worked, update in task assignments
    if (hours_worked && req.user) {
      db.prepare(`
        UPDATE task_assignments
        SET hours_worked = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE task_id = ? AND user_id = ?
      `).run(parseFloat(hours_worked), status, id, req.user.id);
    }
  });

  logActivity(req, 'STATUS_CHANGE', 'task', id, { status, task_title: task.title });
  broadcastEvent({
    workshopId: task.workshop_id,
    entity: 'tasks',
    entityId: id,
    action: 'STATUS_CHANGE',
    payload: { id, work_order_id: task.work_order_id, status },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: `تم تحديث حالة المهمة إلى: ${status}` });
}

/**
 * Section 12: Atomic safe stock deduction with Idempotency Key
 * Prevents double-spending parts on network dropouts or duplicate clicks!
 */
export function consumePartForWorkOrder(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { work_order_id, task_id, part_id, quantity, sale_price, idempotency_key, notes } = req.body;

  if (!work_order_id || !part_id || !quantity) {
    return res.status(400).json({ success: false, error: 'أمر العمل، القطعة، والكمية حقول مطلوبة' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, error: 'الكمية يجب أن تكون رقماً موجباً أكبر من الصفر' });
  }

  // 1. Idempotency Check: Did we already process this exact request?
  if (idempotency_key) {
    const existingMovement = db.prepare(`
      SELECT sm.*, up.id as used_part_id
      FROM stock_movements sm
      LEFT JOIN used_parts up ON up.stock_movement_id = sm.id
      WHERE sm.idempotency_key = ?
    `).get(idempotency_key) as any;

    if (existingMovement) {
      return res.json({
        success: true,
        data: {
          movement_id: existingMovement.id,
          used_part_id: existingMovement.used_part_id,
          idempotent_replayed: true
        },
        message: 'تم استرجاع العملية المسجلة مسبقاً بنجاح دون خصم مكرر'
      });
    }
  }

  // 2. Atomic Transaction Execution
  try {
    const result = executeTransaction(() => {
      // Check part stock
      const part = db.prepare(`
        SELECT id, name, part_number, cost_price, sale_price, stock_quantity, min_stock_alert 
        FROM parts 
        WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL
      `).get(part_id, workshopId) as any;

      if (!part) {
        throw new Error('القطعة غير موجودة في المخزون');
      }

      if (part.stock_quantity < qty) {
        throw new Error(`الرصيد المتاح في المستودع (${part.stock_quantity}) غير كافٍ لصرف الكمية المطلوبة (${qty})`);
      }

      const unitCost = part.cost_price;
      const unitSale = sale_price ? parseFloat(sale_price) : part.sale_price;
      const totalPrice = unitSale * qty;

      const movementId = uuidv4();
      const usedPartId = uuidv4();
      const safeIdempotencyKey = idempotency_key || `sm_auto_${Date.now()}_${uuidv4().substring(0, 8)}`;

      // Deduct stock
      db.prepare(`
        UPDATE parts 
        SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(qty, part_id);

      // Record stock movement (negative quantity for consumption)
      db.prepare(`
        INSERT INTO stock_movements (
          id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price,
          reference_type, reference_id, idempotency_key, notes, created_by
        ) VALUES (?, ?, ?, 'consumption', ?, ?, ?, 'work_order', ?, ?, ?, ?)
      `).run(
        movementId,
        workshopId,
        part_id,
        -qty,
        unitCost,
        unitSale,
        work_order_id,
        safeIdempotencyKey,
        notes || `صرف لأمر العمل ${work_order_id}`,
        req.user!.id
      );

      // Record in used_parts
      db.prepare(`
        INSERT INTO used_parts (
          id, work_order_id, task_id, part_id, quantity, unit_cost, unit_price, total_price, stock_movement_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        usedPartId,
        work_order_id,
        task_id || null,
        part_id,
        qty,
        unitCost,
        unitSale,
        totalPrice,
        movementId,
        req.user!.id
      );

      // Update work order actual cost
      db.prepare(`
        UPDATE work_orders 
        SET actual_cost = actual_cost + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(totalPrice, work_order_id);

      // Create low stock alert notification if needed
      const remainingStock = part.stock_quantity - qty;
      if (remainingStock <= part.min_stock_alert) {
        db.prepare(`
          INSERT INTO notifications (id, workshop_id, title, message, category, reference_type, reference_id)
          VALUES (?, ?, ?, ?, 'low_stock', 'part', ?)
        `).run(
          uuidv4(),
          workshopId,
          `تنبيه انخفاض مخزون: ${part.name}`,
          `المتبقي من الصنف [${part.part_number} - ${part.name}] هو ${remainingStock} فقط، وصل للحد الأدنى.`,
          part_id
        );
      }

      return {
        used_part_id: usedPartId,
        movement_id: movementId,
        part_name: part.name,
        deducted_qty: qty,
        remaining_stock: remainingStock
      };
    });

    logActivity(req, 'UPDATE', 'inventory_deduction', result.movement_id, {
      part_id,
      quantity: qty,
      work_order_id
    });

    broadcastEvent({
      workshopId,
      entity: 'inventory',
      entityId: part_id,
      action: 'UPDATE',
      payload: { part_id, remaining_stock: result.remaining_stock },
      originUserId: req.user?.id
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: `تم صرف ${qty} قطعة من [${result.part_name}] وخصمها من المخزون بأمان`
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'فشل في صرف قطعة الغيار' });
  }
}

export function deleteWorkOrder(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const wo = db.prepare('SELECT id, order_number FROM work_orders WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!wo) {
    return res.status(404).json({ success: false, error: 'أمر العمل غير موجود' });
  }

  try {
    const tx = db.transaction(() => {
      db.prepare('UPDATE invoices SET work_order_id = NULL WHERE work_order_id = ?').run(id);
      db.prepare('DELETE FROM used_parts WHERE work_order_id = ?').run(id);
      db.prepare('DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE work_order_id = ?)').run(id);
      db.prepare('DELETE FROM tasks WHERE work_order_id = ?').run(id);
      db.prepare('DELETE FROM attachments WHERE work_order_id = ?').run(id);
      db.prepare('DELETE FROM work_orders WHERE id = ? AND workshop_id = ?').run(id, workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'work_order', id, { order_number: wo.order_number });
    broadcastEvent({
      workshopId,
      entity: 'work_orders',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف أمر العمل بنجاح' });
  } catch (err: any) {
    console.error('Delete work order error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف أمر العمل: ' + err.message });
  }
}

export function updateTask(req: Request, res: Response) {
  const { id } = req.params;
  const { title, description, price, lead_mechanic_id } = req.body;

  const task = db.prepare('SELECT t.*, wo.workshop_id FROM tasks t JOIN work_orders wo ON t.work_order_id = wo.id WHERE t.id = ?').get(id) as any;
  if (!task) {
    return res.status(404).json({ success: false, error: 'مهمة الصيانة غير موجودة' });
  }

  executeTransaction(() => {
    db.prepare(`
      UPDATE tasks 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          price = CASE WHEN ? IS NOT NULL THEN ? ELSE price END,
          lead_mechanic_id = COALESCE(?, lead_mechanic_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title ? title.trim() : null,
      description !== undefined ? (description?.trim() || null) : null,
      price !== undefined ? 1 : null,
      price !== undefined ? parseFloat(price || 0) : null,
      lead_mechanic_id !== undefined ? (lead_mechanic_id || null) : null,
      id
    );

    if (lead_mechanic_id) {
      db.prepare('DELETE FROM task_assignments WHERE task_id = ? AND role_in_task = "lead"').run(id);
      db.prepare('INSERT INTO task_assignments (id, task_id, user_id, role_in_task) VALUES (?, ?, ?, "lead")')
        .run(uuidv4(), id, lead_mechanic_id);
    }
  });

  logActivity(req, 'UPDATE', 'task', id, { title, price });
  broadcastEvent({
    workshopId: task.workshop_id,
    entity: 'tasks',
    entityId: id,
    action: 'UPDATE',
    payload: { id, work_order_id: task.work_order_id, title, price },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم تحديث بيانات الصيانة وسعرها بنجاح' });
}

export function deleteTask(req: Request, res: Response) {
  const { id } = req.params;
  const task = db.prepare('SELECT t.*, wo.workshop_id FROM tasks t JOIN work_orders wo ON t.work_order_id = wo.id WHERE t.id = ?').get(id) as any;
  if (!task) {
    return res.status(404).json({ success: false, error: 'مهمة الصيانة غير موجودة' });
  }

  executeTransaction(() => {
    db.prepare('DELETE FROM task_assignments WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  });

  logActivity(req, 'DELETE', 'task', id, { title: task.title });
  broadcastEvent({
    workshopId: task.workshop_id,
    entity: 'tasks',
    entityId: id,
    action: 'DELETE',
    payload: { id, work_order_id: task.work_order_id },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم حذف بند الصيانة بنجاح' });
}

export function removeUsedPart(req: Request, res: Response) {
  const { id } = req.params;
  const used = db.prepare(`
    SELECT up.*, wo.workshop_id 
    FROM used_parts up 
    JOIN work_orders wo ON up.work_order_id = wo.id 
    WHERE up.id = ?
  `).get(id) as any;

  if (!used) {
    return res.status(404).json({ success: false, error: 'بند القطعة المصروفة غير موجود' });
  }

  executeTransaction(() => {
    // Return stock quantity
    db.prepare('UPDATE parts SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(used.quantity, used.part_id);
    // Delete stock movement
    if (used.stock_movement_id) {
      db.prepare('DELETE FROM stock_movements WHERE id = ?').run(used.stock_movement_id);
    }
    // Delete used_parts record
    db.prepare('DELETE FROM used_parts WHERE id = ?').run(id);
  });

  logActivity(req, 'DELETE', 'used_part', id, { part_id: used.part_id, quantity: used.quantity });
  broadcastEvent({
    workshopId: used.workshop_id,
    entity: 'inventory',
    entityId: used.part_id,
    action: 'UPDATE',
    payload: { work_order_id: used.work_order_id },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم إرجاع القطعة إلى المخزون وحذفها من أمر الصيانة بنجاح' });
}

/**
 * Quick Add Item to a Visit:
 * Automatically finds or creates a work order for the visit and adds a maintenance task with its price,
 * or consumes a coded part from the inventory with its registered price!
 */
export function quickAddVisitItem(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { visit_id, type, title, price, part_id, quantity, lead_mechanic_id, notes } = req.body;

  if (!visit_id || !type) {
    return res.status(400).json({ success: false, error: 'معرف الزيارة ونوع البند مطلوبان' });
  }

  // Find visit
  const visit = db.prepare('SELECT id, vehicle_id, visit_number FROM visits WHERE id = ? AND workshop_id = ?').get(visit_id, workshopId) as any;
  if (!visit) {
    return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });
  }

  // Find or create work order
  let workOrder = db.prepare('SELECT id, order_number FROM work_orders WHERE visit_id = ? AND workshop_id = ? ORDER BY created_at ASC LIMIT 1').get(visit_id, workshopId) as any;

  if (!workOrder) {
    const woId = uuidv4();
    const countRow = db.prepare('SELECT COUNT(*) as c FROM work_orders WHERE workshop_id = ?').get(workshopId) as { c: number };
    const order_number = `WO-${(countRow.c + 1).toString().padStart(5, '0')}`;
    db.prepare(`
      INSERT INTO work_orders (id, workshop_id, order_number, visit_id, vehicle_id, description, priority, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'normal', 'in_progress', ?)
    `).run(woId, workshopId, order_number, visit_id, visit.vehicle_id, `أمر صيانة للزيارة ${visit.visit_number}`, req.user!.id);
    workOrder = { id: woId, order_number };
  }

  if (type === 'task') {
    if (!title) {
      return res.status(400).json({ success: false, error: 'اسم أو وصف الصيانة مطلوب' });
    }
    const taskId = uuidv4();
    executeTransaction(() => {
      db.prepare(`
        INSERT INTO tasks (id, work_order_id, title, description, price, lead_mechanic_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'completed')
      `).run(
        taskId,
        workOrder.id,
        title.trim(),
        notes?.trim() || null,
        parseFloat(price || 0),
        lead_mechanic_id || null
      );
      if (lead_mechanic_id) {
        db.prepare('INSERT INTO task_assignments (id, task_id, user_id, role_in_task) VALUES (?, ?, ?, "lead")')
          .run(uuidv4(), taskId, lead_mechanic_id);
      }
    });

    broadcastEvent({
      workshopId,
      entity: 'work_orders',
      entityId: workOrder.id,
      action: 'UPDATE',
      payload: { id: workOrder.id, visit_id },
      originUserId: req.user?.id
    });

    return res.status(201).json({
      success: true,
      data: { id: taskId, work_order_id: workOrder.id },
      message: `تم تسجيل الصيانة [${title}] بسعر [${parseFloat(price || 0)} ج.م] بنجاح`
    });
  } else if (type === 'part') {
    if (!part_id) {
      return res.status(400).json({ success: false, error: 'يرجى اختيار الصنف من المخزون' });
    }
    const qty = parseInt(quantity || 1, 10);
    const part = db.prepare('SELECT * FROM parts WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(part_id, workshopId) as any;
    if (!part) {
      return res.status(404).json({ success: false, error: 'الصنف غير موجود بالمخزون' });
    }
    if (part.stock_quantity < qty) {
      return res.status(400).json({ success: false, error: `الرصيد المتاح بالمخزون (${part.stock_quantity}) غير كافٍ لصرف (${qty}) قطعة` });
    }

    const movementId = uuidv4();
    const usedPartId = uuidv4();
    const idempotencyKey = `quick_sm_${Date.now()}_${uuidv4().substring(0, 6)}`;
    const unitPrice = part.sale_price;
    const totalPrice = unitPrice * qty;

    executeTransaction(() => {
      db.prepare('UPDATE parts SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(qty, part_id);
      db.prepare(`
        INSERT INTO stock_movements (id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price, reference_type, reference_id, idempotency_key, notes, created_by)
        VALUES (?, ?, ?, 'consumption', ?, ?, ?, 'work_order', ?, ?, ?, ?)
      `).run(movementId, workshopId, part_id, -qty, part.cost_price, unitPrice, workOrder.id, idempotencyKey, `صرف للزيارة ${visit.visit_number}`, req.user!.id);
      db.prepare(`
        INSERT INTO used_parts (id, work_order_id, part_id, quantity, unit_cost, unit_price, total_price, stock_movement_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(usedPartId, workOrder.id, part_id, qty, part.cost_price, unitPrice, totalPrice, movementId, req.user!.id);
    });

    broadcastEvent({
      workshopId,
      entity: 'work_orders',
      entityId: workOrder.id,
      action: 'UPDATE',
      payload: { id: workOrder.id, visit_id },
      originUserId: req.user?.id
    });

    return res.status(201).json({
      success: true,
      data: { id: usedPartId, work_order_id: workOrder.id },
      message: `تم صرف ${qty} قطعة من [${part.name}] بكود [${part.part_number}] بسعر [${totalPrice} ج.م] بنجاح`
    });
  }

  return res.status(400).json({ success: false, error: 'نوع البند غير معروف' });
}
