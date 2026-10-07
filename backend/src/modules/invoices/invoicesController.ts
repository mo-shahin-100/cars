import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getInvoices(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const status = req.query.status as string;
  const customerId = req.query.customer_id as string;
  const vehicleId = req.query.vehicle_id as string;

  let sql = `
    SELECT 
      i.*,
      c.full_name as customer_name, c.phone as customer_phone, c.customer_code,
      veh.plate_number, veh.make, veh.model,
      veh.current_odometer, veh.next_maintenance_km, veh.next_maintenance_date, veh.next_maintenance_notes, veh.last_maintenance_km,
      v.visit_number,
      u.full_name as created_by_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN vehicles veh ON i.vehicle_id = veh.id
    JOIN visits v ON i.visit_id = v.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (status === 'due' || status === 'has_balance' || req.query.has_balance === 'true') {
    sql += ` AND i.balance_due > 0 AND i.status != 'cancelled'`;
  } else if (status) {
    sql += ` AND i.status = ?`;
    params.push(status);
  }
  if (customerId) {
    sql += ` AND i.customer_id = ?`;
    params.push(customerId);
  }
  if (vehicleId) {
    sql += ` AND i.vehicle_id = ?`;
    params.push(vehicleId);
  }

  sql += ` ORDER BY i.issue_date DESC`;
  const invoices = db.prepare(sql).all(...params);

  return res.json({ success: true, data: invoices });
}

export function getInvoiceById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const invoice = db.prepare(`
    SELECT 
      i.*,
      c.full_name as customer_name, c.phone as customer_phone, c.customer_code, c.address as customer_address,
      veh.plate_number, veh.vin, veh.make, veh.model, veh.year,
      veh.current_odometer, veh.next_maintenance_km, veh.next_maintenance_date, veh.next_maintenance_notes, veh.last_maintenance_km,
      v.visit_number, v.odometer_in,
      u.full_name as created_by_name,
      w.name as workshop_name, w.commercial_reg, w.tax_number, w.phone as workshop_phone, w.address as workshop_address
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN vehicles veh ON i.vehicle_id = veh.id
    JOIN visits v ON i.visit_id = v.id
    JOIN workshops w ON i.workshop_id = w.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = ? AND i.workshop_id = ?
  `).get(id, workshopId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
  }

  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
  invoice.payments = db.prepare(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.invoice_id = ?
    ORDER BY p.payment_date DESC
  `).all(id);

  return res.json({ success: true, data: invoice });
}

export function createInvoice(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    visit_id,
    customer_id,
    vehicle_id,
    work_order_id,
    labor_total,
    parts_total,
    fluids_total,
    discount_amount,
    tax_percent,
    notes,
    items, // Array of { item_type, description, quantity, unit_price, part_id }
    initial_payment // Optional { amount, payment_method, reference_number }
  } = req.body;

  if (!visit_id || !customer_id || !vehicle_id) {
    return res.status(400).json({ success: false, error: 'الزيارة، العميل، والسيارة حقول إلزامية' });
  }

  // Check if an active invoice already exists for this visit
  const existingInvoice = db.prepare(`
    SELECT * FROM invoices 
    WHERE visit_id = ? AND workshop_id = ? AND status != 'cancelled'
    ORDER BY created_at DESC
  `).get(visit_id, workshopId) as any;

  const initPayAmt = initial_payment && initial_payment.amount
    ? parseFloat(initial_payment.amount)
    : (req.body.paid_amount !== undefined ? parseFloat(req.body.paid_amount) : 0);

  if (existingInvoice) {
    if (initPayAmt > 0) {
      const payAmount = Math.min(existingInvoice.balance_due, initPayAmt);
      const newPaid = Math.round((existingInvoice.paid_amount + payAmount) * 100) / 100;
      const newBalance = Math.max(0, Math.round((existingInvoice.grand_total - newPaid) * 100) / 100);
      const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

      executeTransaction(() => {
        db.prepare(`
          UPDATE invoices 
          SET paid_amount = ?, balance_due = ?, status = ? 
          WHERE id = ?
        `).run(newPaid, newBalance, newStatus, existingInvoice.id);

        const receiptCount = db.prepare('SELECT COUNT(*) as c FROM payments WHERE workshop_id = ?').get(workshopId) as { c: number };
        const receipt_number = `RCP-${(receiptCount.c + 1).toString().padStart(5, '0')}`;

        db.prepare(`
          INSERT INTO payments (id, workshop_id, receipt_number, invoice_id, customer_id, amount, payment_method, reference_number, notes, received_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          workshopId,
          receipt_number,
          existingInvoice.id,
          customer_id,
          payAmount,
          initial_payment?.payment_method || req.body.payment_method || 'cash',
          initial_payment?.reference_number || null,
          'سداد دفعة على الفاتورة القائمة',
          req.user!.id
        );

        // Recalculate customer balance
        const balanceRow = db.prepare(`
          SELECT COALESCE(SUM(balance_due), 0) as total 
          FROM invoices 
          WHERE customer_id = ? AND status != 'cancelled'
        `).get(customer_id) as any;
        db.prepare('UPDATE customers SET total_balance_due = ? WHERE id = ?').run(balanceRow?.total || 0, customer_id);
      });

      broadcastEvent({
        workshopId,
        entity: 'invoices',
        entityId: existingInvoice.id,
        action: 'UPDATE',
        payload: { id: existingInvoice.id },
        originUserId: req.user?.id
      });
      broadcastEvent({
        workshopId,
        entity: 'payments',
        entityId: existingInvoice.id,
        action: 'INSERT',
        originUserId: req.user?.id
      });
      broadcastEvent({
        workshopId,
        entity: 'customers',
        entityId: customer_id,
        action: 'UPDATE',
        payload: { id: customer_id },
        originUserId: req.user?.id
      });

      return res.json({
        success: true,
        message: `تم سداد دفعة للفاتورة القائمة (${existingInvoice.invoice_number}) بنجاح بدلاً من تكرارها`,
        data: { id: existingInvoice.id, invoice_number: existingInvoice.invoice_number, alreadyExisted: true }
      });
    }

    return res.json({
      success: true,
      message: `هذه الزيارة صادر لها بالفعل فاتورة برقم (${existingInvoice.invoice_number})`,
      data: { id: existingInvoice.id, invoice_number: existingInvoice.invoice_number, alreadyExisted: true }
    });
  }

  const invoiceId = uuidv4();
  const countRow = db.prepare('SELECT COUNT(*) as c FROM invoices WHERE workshop_id = ?').get(workshopId) as { c: number };
  const invoice_number = `INV-${(countRow.c + 1).toString().padStart(5, '0')}`;

  const explicitGrandTotal = req.body.grand_total !== undefined ? parseFloat(req.body.grand_total) : null;
  const labor = parseFloat(labor_total || 0);
  const parts = parseFloat(parts_total || 0);
  const fluids = parseFloat(fluids_total || 0);
  const discount = parseFloat(discount_amount || 0);
  const subtotalBeforeTax = Math.max(0, (labor + parts + fluids) - discount);
  const taxRate = tax_percent !== undefined ? parseFloat(tax_percent) : 15.0;
  const taxAmount = (subtotalBeforeTax * taxRate) / 100.0;
  const computedGrandTotal = Math.round((subtotalBeforeTax + taxAmount) * 100) / 100;
  const grandTotal = explicitGrandTotal !== null && explicitGrandTotal > 0 ? explicitGrandTotal : computedGrandTotal;

  const paidAmount = Math.min(grandTotal, Math.max(0, initPayAmt));
  const balanceDue = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);

  let initialStatus = 'unpaid';
  if (paidAmount >= grandTotal && grandTotal > 0) {
    initialStatus = 'paid';
  } else if (paidAmount > 0) {
    initialStatus = 'partially_paid';
  }

  executeTransaction(() => {
    // 1. Insert Invoice
    db.prepare(`
      INSERT INTO invoices (
        id, workshop_id, invoice_number, visit_id, customer_id, vehicle_id, work_order_id,
        labor_total, parts_total, fluids_total, discount_amount, tax_percent, tax_amount,
        grand_total, paid_amount, balance_due, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      workshopId,
      invoice_number,
      visit_id,
      customer_id,
      vehicle_id,
      work_order_id || null,
      labor,
      parts,
      fluids,
      discount,
      taxRate,
      taxAmount,
      grandTotal,
      paidAmount,
      balanceDue,
      initialStatus,
      notes?.trim() || null,
      req.user!.id
    );

    // 2. Insert items (or pull from work order tasks and parts if not provided)
    if (Array.isArray(items) && items.length > 0) {
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total_price, part_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of items) {
        const qty = parseFloat(it.quantity || 1);
        const price = parseFloat(it.unit_price || 0);
        insertItemStmt.run(
          uuidv4(),
          invoiceId,
          it.item_type || 'labor',
          it.description || 'بند صيانة',
          qty,
          price,
          qty * price,
          it.part_id || null
        );
      }
    } else if (work_order_id) {
      // Auto-import tasks from work order
      const tasks = db.prepare('SELECT title, price FROM tasks WHERE work_order_id = ?').all(work_order_id) as any[];
      const usedParts = db.prepare(`
        SELECT up.quantity, up.unit_price, up.part_id, p.name as part_name
        FROM used_parts up
        JOIN parts p ON up.part_id = p.id
        WHERE up.work_order_id = ?
      `).all(work_order_id) as any[];

      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total_price, part_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const t of tasks) {
        const p = parseFloat(t.price || 0);
        insertItemStmt.run(uuidv4(), invoiceId, 'labor', t.title || 'عمل صيانة', 1, p, p, null);
      }
      for (const up of usedParts) {
        const q = parseFloat(up.quantity || 1);
        const p = parseFloat(up.unit_price || 0);
        insertItemStmt.run(uuidv4(), invoiceId, 'part', up.part_name || 'قطع غيار', q, p, q * p, up.part_id);
      }
    }

    // 3. Process Initial Payment if paidAmount > 0
    if (paidAmount > 0) {
      const payCount = db.prepare('SELECT COUNT(*) as c FROM payments WHERE workshop_id = ?').get(workshopId) as { c: number };
      const receiptNumber = `RCP-${(payCount.c + 1).toString().padStart(5, '0')}`;
      const payMethod = initial_payment?.payment_method || req.body.payment_method || 'cash';
      const refNumber = initial_payment?.reference_number || req.body.reference_number || null;
      const payNotes = initial_payment?.notes || req.body.notes || 'سداد دفعة عند إصدار الفاتورة';

      db.prepare(`
        INSERT INTO payments (
          id, workshop_id, receipt_number, invoice_id, customer_id, amount,
          payment_method, reference_number, notes, received_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        workshopId,
        receiptNumber,
        invoiceId,
        customer_id,
        paidAmount,
        payMethod,
        refNumber,
        payNotes,
        req.user!.id
      );
    }

    // 4. Update customer total balance due
    if (balanceDue > 0) {
      db.prepare(`
        UPDATE customers 
        SET total_balance_due = total_balance_due + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(balanceDue, customer_id);
    }

    // 5. Update vehicle total spent & next maintenance schedule if provided
    db.prepare(`
      UPDATE vehicles 
      SET total_spent = total_spent + ?,
          next_maintenance_km = COALESCE(?, next_maintenance_km),
          next_maintenance_notes = COALESCE(?, next_maintenance_notes),
          last_maintenance_km = COALESCE(?, last_maintenance_km),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      grandTotal,
      req.body.next_maintenance_km ? parseInt(req.body.next_maintenance_km, 10) : null,
      req.body.next_maintenance_notes?.trim() || null,
      req.body.odometer_in ? parseInt(req.body.odometer_in, 10) : null,
      vehicle_id
    );

    // 6. Connect to Visit: Automatically advance visit status to 'ready' if still in progress
    db.prepare(`
      UPDATE visits 
      SET status = CASE WHEN status NOT IN ('ready', 'delivered') THEN 'ready' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(visit_id);
  });

  logActivity(req, 'CREATE', 'invoice', invoiceId, { invoice_number, grandTotal, paidAmount, balanceDue });
  broadcastEvent({
    workshopId,
    entity: 'invoices',
    entityId: invoiceId,
    action: 'INSERT',
    payload: { id: invoiceId, invoice_number, grand_total: grandTotal, status: initialStatus },
    originUserId: req.user?.id
  });
  broadcastEvent({
    workshopId,
    entity: 'visits',
    entityId: visit_id,
    action: 'UPDATE',
    payload: { id: visit_id, status: 'ready' },
    originUserId: req.user?.id
  });
  broadcastEvent({
    workshopId,
    entity: 'customers',
    entityId: customer_id,
    action: 'UPDATE',
    payload: { id: customer_id, balance_due: balanceDue },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: invoiceId, invoice_number, grand_total: grandTotal, status: initialStatus },
    message: `تم إصدار الفاتورة بنجاح برقم: [${invoice_number}]`
  });
}

/**
 * Register Partial Payment & Issue Instant Receipt
 */
export function registerPayment(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { invoice_id, amount, payment_method, reference_number, notes } = req.body;

  if (!invoice_id || !amount) {
    return res.status(400).json({ success: false, error: 'الفاتورة والمبلغ المسدد حقول إلزامية' });
  }

  const payAmt = parseFloat(amount);
  if (isNaN(payAmt) || payAmt <= 0) {
    return res.status(400).json({ success: false, error: 'المبلغ المسدد يجب أن يكون أكبر من الصفر' });
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND workshop_id = ?').get(invoice_id, workshopId) as any;
  if (!invoice) {
    return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
  }

  if (invoice.balance_due <= 0) {
    return res.status(400).json({ success: false, error: 'هذه الفاتورة مسددة بالكامل ولا يوجد رصيد متبقٍ عليها' });
  }

  const paymentId = uuidv4();
  const payCount = db.prepare('SELECT COUNT(*) as c FROM payments WHERE workshop_id = ?').get(workshopId) as { c: number };
  const receiptNumber = `RCP-${(payCount.c + 1).toString().padStart(5, '0')}`;

  const actualPayment = Math.min(invoice.balance_due, payAmt);
  const newPaidAmount = Math.round((invoice.paid_amount + actualPayment) * 100) / 100;
  const newBalanceDue = Math.max(0, Math.round((invoice.balance_due - actualPayment) * 100) / 100);
  const newStatus = newBalanceDue === 0 ? 'paid' : 'partially_paid';

  executeTransaction(() => {
    // 1. Insert Payment
    db.prepare(`
      INSERT INTO payments (
        id, workshop_id, receipt_number, invoice_id, customer_id, amount,
        payment_method, reference_number, notes, received_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      workshopId,
      receiptNumber,
      invoice_id,
      invoice.customer_id,
      actualPayment,
      payment_method || 'cash',
      reference_number?.trim() || null,
      notes?.trim() || null,
      req.user!.id
    );

    // 2. Update Invoice balance
    db.prepare(`
      UPDATE invoices SET
        paid_amount = ?,
        balance_due = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPaidAmount, newBalanceDue, newStatus, invoice_id);

    // 3. Deduct from customer total balance due
    db.prepare(`
      UPDATE customers SET
        total_balance_due = MAX(0, total_balance_due - ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(actualPayment, invoice.customer_id);
  });

  logActivity(req, 'PAYMENT', 'payment', paymentId, {
    receipt_number: receiptNumber,
    invoice_number: invoice.invoice_number,
    amount: actualPayment
  });

  broadcastEvent({
    workshopId,
    entity: 'payments',
    entityId: paymentId,
    action: 'INSERT',
    payload: { invoice_id, receipt_number: receiptNumber, amount: actualPayment, newStatus },
    originUserId: req.user?.id
  });
  broadcastEvent({
    workshopId,
    entity: 'invoices',
    entityId: invoice_id,
    action: 'UPDATE',
    payload: { id: invoice_id, paid_amount: newPaidAmount, balance_due: newBalanceDue, status: newStatus },
    originUserId: req.user?.id
  });
  broadcastEvent({
    workshopId,
    entity: 'customers',
    entityId: invoice.customer_id,
    action: 'UPDATE',
    payload: { id: invoice.customer_id },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: {
      receipt_number: receiptNumber,
      amount_paid: actualPayment,
      remaining_balance: newBalanceDue,
      invoice_status: newStatus
    },
    message: `تم تسجيل سند القبض رقم [${receiptNumber}] بمبلغ ${actualPayment} ج.م بنجاح`
  });
}

// ======================
// EXPENSES
// ======================
export function getExpenses(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const category = req.query.category as string;
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;

  let sql = `
    SELECT e.*, u.full_name as created_by_name
    FROM expenses e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.workshop_id = ?
  `;
  const params: any[] = [workshopId];

  if (category) {
    sql += ` AND e.category = ?`;
    params.push(category);
  }
  if (startDate) {
    sql += ` AND e.expense_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND e.expense_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;
  const expenses = db.prepare(sql).all(...params);

  return res.json({ success: true, data: expenses });
}

export function createExpense(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { category, amount, expense_date, payment_method, recipient, description, receipt_attachment_url } = req.body;

  if (!category || !amount || !description) {
    return res.status(400).json({ success: false, error: 'التصنيف، المبلغ، وبيان المصروف حقول مطلوبة' });
  }

  const expenseId = uuidv4();
  const countRow = db.prepare('SELECT COUNT(*) as c FROM expenses WHERE workshop_id = ?').get(workshopId) as { c: number };
  const expense_number = `EXP-${(countRow.c + 1).toString().padStart(5, '0')}`;

  db.prepare(`
    INSERT INTO expenses (
      id, workshop_id, expense_number, category, amount,
      expense_date, payment_method, recipient, description, receipt_attachment_url, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    expenseId,
    workshopId,
    expense_number,
    category.trim(),
    parseFloat(amount),
    expense_date || new Date().toISOString().split('T')[0],
    payment_method || 'cash',
    recipient?.trim() || null,
    description.trim(),
    receipt_attachment_url || null,
    req.user!.id
  );

  logActivity(req, 'CREATE', 'expense', expenseId, { expense_number, category, amount });

  return res.status(201).json({
    success: true,
    data: { id: expenseId, expense_number, amount },
    message: `تم تسجيل المصروف رقم [${expense_number}] بنجاح`
  });
}

export function deleteInvoice(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const inv = db.prepare('SELECT id, invoice_number, customer_id, balance_due FROM invoices WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!inv) {
    return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
  }

  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
      db.prepare('DELETE FROM invoices WHERE id = ? AND workshop_id = ?').run(id, workshopId);

      // Recalculate customer total balance due
      const balanceRow = db.prepare(`SELECT COALESCE(SUM(balance_due), 0) as total FROM invoices WHERE customer_id = ? AND status != 'cancelled'`).get(inv.customer_id) as any;
      db.prepare('UPDATE customers SET total_balance_due = ? WHERE id = ?').run(balanceRow?.total || 0, inv.customer_id);
    });

    tx();

    logActivity(req, 'DELETE', 'invoice', id, { invoice_number: inv.invoice_number });
    broadcastEvent({
      workshopId,
      entity: 'invoices',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });
    broadcastEvent({
      workshopId,
      entity: 'customers',
      entityId: inv.customer_id,
      action: 'UPDATE',
      payload: { id: inv.customer_id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف الفاتورة بنجاح' });
  } catch (err: any) {
    console.error('Delete invoice error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف الفاتورة: ' + err.message });
  }
}

export function deleteExpense(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const exp = db.prepare('SELECT id, expense_number FROM expenses WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!exp) {
    return res.status(404).json({ success: false, error: 'المصروف غير موجود' });
  }

  try {
    db.prepare('DELETE FROM expenses WHERE id = ? AND workshop_id = ?').run(id, workshopId);

    logActivity(req, 'DELETE', 'expense', id, { expense_number: exp.expense_number });
    broadcastEvent({
      workshopId,
      entity: 'expenses',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف المصروف بنجاح' });
  } catch (err: any) {
    console.error('Delete expense error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف المصروف: ' + err.message });
  }
}

