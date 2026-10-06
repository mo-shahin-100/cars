import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

// ==========================================
// 1. SUPPLIERS (الموردين)
// ==========================================

/**
 * Get all suppliers with aggregated financial stats (invoices, total purchases, total paid, balance due)
 */
export function getSuppliers(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const search = (req.query.search as string || '').trim();
  const category = req.query.category as string;
  const status = req.query.status as string;

  let sql = `
    SELECT 
      s.*,
      COUNT(pi.id) as invoice_count,
      COALESCE(SUM(pi.grand_total), 0) as total_purchases,
      COALESCE(SUM(pi.paid_amount), 0) as total_paid,
      COALESCE(SUM(pi.balance_due), 0) as balance_due,
      MAX(pi.invoice_date) as last_invoice_date,
      (SELECT MAX(payment_date) FROM supplier_payments sp WHERE sp.supplier_id = s.id) as last_payment_date,
      COUNT(CASE WHEN pi.balance_due > 0 AND pi.due_date IS NOT NULL AND pi.due_date < date('now') THEN 1 END) as overdue_count
    FROM suppliers s
    LEFT JOIN purchase_invoices pi ON (pi.supplier_id = s.id OR pi.supplier_name = s.name) AND pi.deleted_at IS NULL AND pi.workshop_id = s.workshop_id
    WHERE s.workshop_id = ? AND s.deleted_at IS NULL
  `;
  const params: any[] = [workshopId];

  if (category && category !== 'all') {
    sql += ` AND s.category = ?`;
    params.push(category);
  }

  if (search) {
    sql += ` AND (s.name LIKE ? OR s.phone LIKE ? OR s.phone_secondary LIKE ? OR s.contact_person LIKE ? OR s.tax_number LIKE ? OR s.notes LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` GROUP BY s.id ORDER BY balance_due DESC, s.name ASC`;

  const suppliers = db.prepare(sql).all(...params);

  // Process account status for each supplier
  let processedSuppliers = (suppliers as any[]).map(sup => {
    let account_status: 'paid' | 'unpaid' | 'overdue' = 'paid';
    if (sup.overdue_count > 0) {
      account_status = 'overdue';
    } else if (sup.balance_due > 0) {
      account_status = 'unpaid';
    }
    return {
      ...sup,
      account_status
    };
  });

  if (status && status !== 'all') {
    processedSuppliers = processedSuppliers.filter(s => s.account_status === status);
  }

  // Overall suppliers summary stats
  const summary = db.prepare(`
    SELECT 
      COUNT(DISTINCT s.id) as total_suppliers,
      COALESCE(SUM(pi.grand_total), 0) as overall_purchases,
      COALESCE(SUM(pi.paid_amount), 0) as overall_paid,
      COALESCE(SUM(pi.balance_due), 0) as overall_balance_due
    FROM suppliers s
    LEFT JOIN purchase_invoices pi ON (pi.supplier_id = s.id OR pi.supplier_name = s.name) AND pi.deleted_at IS NULL AND pi.workshop_id = s.workshop_id
    WHERE s.workshop_id = ? AND s.deleted_at IS NULL
  `).get(workshopId) as any;

  return res.json({
    success: true,
    data: processedSuppliers,
    summary
  });
}

/**
 * Get supplier details with invoices, payments, parts supplied, and account ledger
 */
export function getSupplierById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const supplier = db.prepare(`
    SELECT 
      s.*,
      COUNT(pi.id) as invoice_count,
      COALESCE(SUM(pi.grand_total), 0) as total_purchases,
      COALESCE(SUM(pi.paid_amount), 0) as total_paid,
      COALESCE(SUM(pi.balance_due), 0) as balance_due,
      MAX(pi.invoice_date) as last_invoice_date,
      (SELECT MAX(payment_date) FROM supplier_payments sp WHERE sp.supplier_id = s.id) as last_payment_date,
      COUNT(CASE WHEN pi.balance_due > 0 AND pi.due_date IS NOT NULL AND pi.due_date < date('now') THEN 1 END) as overdue_count
    FROM suppliers s
    LEFT JOIN purchase_invoices pi ON (pi.supplier_id = s.id OR pi.supplier_name = s.name) AND pi.deleted_at IS NULL AND pi.workshop_id = s.workshop_id
    WHERE s.id = ? AND s.workshop_id = ? AND s.deleted_at IS NULL
    GROUP BY s.id
  `).get(id, workshopId) as any;

  if (!supplier) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود' });
  }

  let account_status: 'paid' | 'unpaid' | 'overdue' = 'paid';
  if (supplier.overdue_count > 0) {
    account_status = 'overdue';
  } else if (supplier.balance_due > 0) {
    account_status = 'unpaid';
  }
  supplier.account_status = account_status;

  // Get invoices from this supplier
  const invoices = db.prepare(`
    SELECT pi.*, u.full_name as creator_name
    FROM purchase_invoices pi
    LEFT JOIN users u ON pi.created_by = u.id
    WHERE (pi.supplier_id = ? OR pi.supplier_name = ?) AND pi.workshop_id = ? AND pi.deleted_at IS NULL
    ORDER BY pi.invoice_date DESC, pi.created_at DESC
  `).all(id, supplier.name, workshopId);

  // Get payments made to this supplier
  const payments = db.prepare(`
    SELECT sp.*, u.full_name as creator_name, pi.invoice_number
    FROM supplier_payments sp
    LEFT JOIN users u ON sp.created_by = u.id
    LEFT JOIN purchase_invoices pi ON sp.purchase_invoice_id = pi.id
    WHERE sp.supplier_id = ? AND sp.workshop_id = ?
    ORDER BY sp.payment_date DESC, sp.created_at DESC
  `).all(id, workshopId);

  // Get parts supplied by this supplier
  const parts = db.prepare(`
    SELECT id, part_number, name, category, brand, cost_price, sale_price, stock_quantity, min_stock_alert, storage_location
    FROM parts
    WHERE workshop_id = ? AND supplier_name = ? AND deleted_at IS NULL
    ORDER BY name ASC
  `).all(workshopId, supplier.name);

  // Compute detailed financial ledger (كشف حركة الحساب)
  const ledgerItems: any[] = [];
  for (const inv of invoices as any[]) {
    ledgerItems.push({
      id: inv.id,
      date: inv.invoice_date || inv.created_at,
      type: 'invoice',
      type_label: 'فاتورة شراء',
      number: inv.invoice_number,
      description: `فاتورة مشتريات [${inv.invoice_number}]` + (inv.notes ? ` - ${inv.notes}` : ''),
      debit: 0,
      credit: Number(inv.grand_total || 0),
      timestamp: new Date(inv.invoice_date || inv.created_at).getTime()
    });
  }
  for (const pay of payments as any[]) {
    const methodMap: Record<string, string> = {
      cash: 'نقدي',
      transfer: 'تحويل بنكي',
      card: 'بطاقة مدى / ائتمان',
      check: 'شيك'
    };
    const methodLabel = methodMap[pay.payment_method] || pay.payment_method;
    ledgerItems.push({
      id: pay.id,
      date: pay.payment_date || pay.created_at,
      type: 'payment',
      type_label: 'سند صرف / سداد دفعة',
      number: pay.payment_number,
      description: `سداد للمورد (${methodLabel})` + (pay.invoice_number ? ` عن فاتورة [${pay.invoice_number}]` : '') + (pay.notes ? ` - ${pay.notes}` : ''),
      debit: Number(pay.amount || 0),
      credit: 0,
      timestamp: new Date(pay.payment_date || pay.created_at).getTime()
    });
  }

  ledgerItems.sort((a, b) => a.timestamp - b.timestamp);
  let runningBalance = 0;
  for (const item of ledgerItems) {
    runningBalance += (item.credit - item.debit);
    item.balance = runningBalance;
  }

  return res.json({
    success: true,
    data: {
      ...supplier,
      invoices,
      payments,
      parts,
      ledger: [...ledgerItems].reverse()
    }
  });
}

/**
 * Get supplier payments list
 */
export function getSupplierPayments(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const payments = db.prepare(`
    SELECT sp.*, u.full_name as creator_name, pi.invoice_number
    FROM supplier_payments sp
    LEFT JOIN users u ON sp.created_by = u.id
    LEFT JOIN purchase_invoices pi ON sp.purchase_invoice_id = pi.id
    WHERE sp.supplier_id = ? AND sp.workshop_id = ?
    ORDER BY sp.payment_date DESC, sp.created_at DESC
  `).all(id, workshopId);

  return res.json({ success: true, data: payments });
}

/**
 * Get supplier financial ledger statement
 */
export function getSupplierLedger(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL`).get(id, workshopId) as any;
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود' });
  }

  const invoices = db.prepare(`
    SELECT id, invoice_number, grand_total, paid_amount, balance_due, invoice_date, created_at, notes
    FROM purchase_invoices 
    WHERE (supplier_id = ? OR supplier_name = ?) AND workshop_id = ? AND deleted_at IS NULL
    ORDER BY invoice_date ASC, created_at ASC
  `).all(id, supplier.name, workshopId) as any[];

  const payments = db.prepare(`
    SELECT sp.*, u.full_name as creator_name, pi.invoice_number
    FROM supplier_payments sp
    LEFT JOIN users u ON sp.created_by = u.id
    LEFT JOIN purchase_invoices pi ON sp.purchase_invoice_id = pi.id
    WHERE sp.supplier_id = ? AND sp.workshop_id = ?
    ORDER BY sp.payment_date ASC, sp.created_at ASC
  `).all(id, workshopId) as any[];

  const ledgerItems: any[] = [];
  for (const inv of invoices) {
    ledgerItems.push({
      id: inv.id,
      date: inv.invoice_date || inv.created_at,
      type: 'invoice',
      type_label: 'فاتورة شراء',
      number: inv.invoice_number,
      description: `فاتورة مشتريات [${inv.invoice_number}]` + (inv.notes ? ` - ${inv.notes}` : ''),
      debit: 0,
      credit: Number(inv.grand_total || 0),
      timestamp: new Date(inv.invoice_date || inv.created_at).getTime()
    });
  }
  for (const pay of payments) {
    ledgerItems.push({
      id: pay.id,
      date: pay.payment_date || pay.created_at,
      type: 'payment',
      type_label: 'سداد دفعة للمورد',
      number: pay.payment_number,
      description: `سداد للمورد (${pay.payment_method})` + (pay.invoice_number ? ` عن فاتورة [${pay.invoice_number}]` : '') + (pay.notes ? ` - ${pay.notes}` : ''),
      debit: Number(pay.amount || 0),
      credit: 0,
      timestamp: new Date(pay.payment_date || pay.created_at).getTime()
    });
  }

  ledgerItems.sort((a, b) => a.timestamp - b.timestamp);
  let runningBalance = 0;
  for (const item of ledgerItems) {
    runningBalance += (item.credit - item.debit);
    item.balance = runningBalance;
  }

  return res.json({
    success: true,
    data: {
      supplier,
      ledger: [...ledgerItems].reverse(),
      total_invoices: invoices.length,
      total_payments: payments.length,
      current_balance: runningBalance
    }
  });
}

/**
 * Create a new supplier
 */
export function createSupplier(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    name,
    contact_person,
    phone,
    phone_secondary,
    email,
    tax_number,
    address,
    category,
    payment_terms,
    notes
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'اسم المورد أو الشركة حقل إلزامي' });
  }

  // Check duplicate
  const existing = db.prepare(`
    SELECT id FROM suppliers 
    WHERE workshop_id = ? AND name = ? AND deleted_at IS NULL
  `).get(workshopId, name.trim()) as any;

  if (existing) {
    return res.status(400).json({ success: false, error: 'يوجد مورد مسجل بالفعل بهذا الاسم' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO suppliers (
      id, workshop_id, name, contact_person, phone, phone_secondary, email, tax_number, address, category, payment_terms, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    workshopId,
    name.trim(),
    contact_person?.trim() || null,
    phone?.trim() || null,
    phone_secondary?.trim() || null,
    email?.trim() || null,
    tax_number?.trim() || null,
    address?.trim() || null,
    category?.trim() || 'قطع غيار',
    payment_terms?.trim() || 'cash',
    notes?.trim() || null
  );

  logActivity(req, 'CREATE', 'supplier', id, { name: name.trim() });

  broadcastEvent({
    workshopId,
    entity: 'suppliers',
    entityId: id,
    action: 'INSERT',
    payload: { id, name: name.trim() },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id, name: name.trim() },
    message: `تمت إضافة المورد "${name.trim()}" بنجاح إلى دليل الموردين`
  });
}

/**
 * Update an existing supplier
 */
export function updateSupplier(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const {
    name,
    contact_person,
    phone,
    phone_secondary,
    email,
    tax_number,
    address,
    category,
    payment_terms,
    notes
  } = req.body;

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL`).get(id, workshopId) as any;
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود' });
  }

  if (name && name.trim() !== supplier.name) {
    const existing = db.prepare(`SELECT id FROM suppliers WHERE workshop_id = ? AND name = ? AND id != ? AND deleted_at IS NULL`).get(workshopId, name.trim(), id) as any;
    if (existing) {
      return res.status(400).json({ success: false, error: 'يوجد مورد آخر مسجل بنفس هذا الاسم' });
    }
  }

  db.prepare(`
    UPDATE suppliers SET
      name = COALESCE(?, name),
      contact_person = ?,
      phone = ?,
      phone_secondary = ?,
      email = ?,
      tax_number = ?,
      address = ?,
      category = COALESCE(?, category),
      payment_terms = COALESCE(?, payment_terms),
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(
    name?.trim() || supplier.name,
    contact_person !== undefined ? contact_person?.trim() || null : supplier.contact_person,
    phone !== undefined ? phone?.trim() || null : supplier.phone,
    phone_secondary !== undefined ? phone_secondary?.trim() || null : supplier.phone_secondary,
    email !== undefined ? email?.trim() || null : supplier.email,
    tax_number !== undefined ? tax_number?.trim() || null : supplier.tax_number,
    address !== undefined ? address?.trim() || null : supplier.address,
    category?.trim() || supplier.category,
    payment_terms?.trim() || supplier.payment_terms,
    notes !== undefined ? notes?.trim() || null : supplier.notes,
    id,
    workshopId
  );

  logActivity(req, 'UPDATE', 'supplier', id, { name: name?.trim() || supplier.name });

  broadcastEvent({
    workshopId,
    entity: 'suppliers',
    entityId: id,
    action: 'UPDATE',
    payload: { id, name: name?.trim() || supplier.name },
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    message: 'تم تحديث بيانات المورد بنجاح'
  });
}

/**
 * Delete a supplier
 */
export function deleteSupplier(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL`).get(id, workshopId) as any;
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود' });
  }

  // Soft delete
  db.prepare(`UPDATE suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND workshop_id = ?`).run(id, workshopId);

  logActivity(req, 'DELETE', 'supplier', id, { name: supplier.name });

  broadcastEvent({
    workshopId,
    entity: 'suppliers',
    entityId: id,
    action: 'DELETE',
    payload: { id },
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    message: `تم حذف المورد "${supplier.name}" بنجاح`
  });
}

/**
 * Pay supplier balance (allocates lump sum payment to oldest unpaid invoices)
 */
export function paySupplierBalance(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { amount, payment_method, notes } = req.body;

  const paymentVal = parseFloat(amount || 0);
  if (paymentVal <= 0) {
    return res.status(400).json({ success: false, error: 'مبلغ السداد يجب أن يكون أكبر من صفر' });
  }

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL`).get(id, workshopId) as any;
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود' });
  }

  // Find all unpaid or partially paid invoices for this supplier in chronological order
  const invoices = db.prepare(`
    SELECT id, invoice_number, grand_total, paid_amount, balance_due 
    FROM purchase_invoices 
    WHERE (supplier_id = ? OR supplier_name = ?) AND workshop_id = ? AND balance_due > 0 AND deleted_at IS NULL
    ORDER BY invoice_date ASC, created_at ASC
  `).all(id, supplier.name, workshopId) as any[];

  if (invoices.length === 0) {
    return res.status(400).json({ success: false, error: 'لا توجد فواتير مستحقة الدفع لهذا المورد' });
  }

  let remainingToPay = paymentVal;
  const updatedInvoices: any[] = [];

  try {
    const tx = db.transaction(() => {
      for (const inv of invoices) {
        if (remainingToPay <= 0) break;

        const payForThisInv = Math.min(remainingToPay, inv.balance_due);
        const newPaid = inv.paid_amount + payForThisInv;
        const newBalance = Math.max(0, inv.balance_due - payForThisInv);
        const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';

        db.prepare(`
          UPDATE purchase_invoices 
          SET paid_amount = ?,
              balance_due = ?,
              payment_status = ?,
              payment_method = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND workshop_id = ?
        `).run(newPaid, newBalance, newStatus, payment_method || 'transfer', inv.id, workshopId);

        // Record payment in supplier_payments
        const payNum = `PAY-SUP-${Date.now().toString().slice(-6)}`;
        db.prepare(`
          INSERT INTO supplier_payments (
            id, workshop_id, payment_number, supplier_id, purchase_invoice_id,
            amount, payment_method, reference_number, payment_date, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          workshopId,
          payNum,
          id,
          inv.id,
          payForThisInv,
          payment_method || 'transfer',
          req.body.reference_number || null,
          req.body.payment_date || new Date().toISOString().slice(0, 10),
          notes || `سداد لحساب المورد عن فاتورة [${inv.invoice_number}]`,
          req.user?.id || 'admin'
        );

        remainingToPay -= payForThisInv;
        updatedInvoices.push({ id: inv.id, invoice_number: inv.invoice_number, paid: payForThisInv, remaining: newBalance });
      }
    });

    tx();

    logActivity(req, 'PAYMENT', 'supplier', id, {
      supplier_name: supplier.name,
      amount: paymentVal,
      settled_invoices: updatedInvoices
    });

    broadcastEvent({
      workshopId,
      entity: 'purchases',
      entityId: id,
      action: 'UPDATE',
      payload: { supplier_id: id, updatedInvoices },
      originUserId: req.user?.id
    });

    return res.json({
      success: true,
      data: {
        supplier_id: id,
        amount_paid: paymentVal - remainingToPay,
        settled_invoices: updatedInvoices
      },
      message: `تم سداد مبلغ ${(paymentVal - remainingToPay).toFixed(2)} ج.م لحساب المورد "${supplier.name}" بنجاح`
    });
  } catch (err: any) {
    console.error('Pay supplier balance error:', err);
    return res.status(500).json({ success: false, error: 'فشل في تسجيل سداد المورد: ' + err.message });
  }
}

// ==========================================
// 2. PURCHASE INVOICES (فواتير المشتريات)
// ==========================================

/**
 * Get all purchase / supplier invoices with filtering
 */
export function getPurchaseInvoices(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const search = (req.query.search as string || '').trim();
  const status = req.query.status as string;
  const supplierId = req.query.supplier_id as string;
  const supplier = req.query.supplier as string;

  let sql = `
    SELECT 
      pi.*,
      s.contact_person as supplier_contact,
      s.category as supplier_category,
      u.full_name as creator_name,
      (SELECT COUNT(*) FROM purchase_invoice_items pii WHERE pii.purchase_invoice_id = pi.id) as items_count
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    LEFT JOIN users u ON pi.created_by = u.id
    WHERE pi.workshop_id = ? AND pi.deleted_at IS NULL
  `;
  const params: any[] = [workshopId];

  if (status) {
    sql += ` AND pi.payment_status = ?`;
    params.push(status);
  }

  if (supplierId) {
    sql += ` AND pi.supplier_id = ?`;
    params.push(supplierId);
  } else if (supplier) {
    sql += ` AND pi.supplier_name = ?`;
    params.push(supplier);
  }

  if (search) {
    sql += ` AND (pi.invoice_number LIKE ? OR pi.supplier_name LIKE ? OR pi.supplier_phone LIKE ? OR pi.notes LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY pi.invoice_date DESC, pi.created_at DESC`;

  const invoices = db.prepare(sql).all(...params);

  // Calculate totals summary for dashboard/KPIs
  const summaryRow = db.prepare(`
    SELECT 
      COALESCE(SUM(grand_total), 0) as total_purchases,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(balance_due), 0) as total_balance_due,
      COUNT(*) as total_invoices,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now') THEN grand_total ELSE 0 END), 0) as this_month_purchases,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now', '-1 month') THEN grand_total ELSE 0 END), 0) as prev_month_purchases,
      COUNT(CASE WHEN balance_due > 0 AND due_date IS NOT NULL AND due_date < date('now') THEN 1 END) as overdue_invoices_count,
      COUNT(CASE WHEN balance_due > 0 THEN 1 END) as unpaid_invoices_count,
      (SELECT COUNT(*) FROM suppliers WHERE workshop_id = ? AND deleted_at IS NULL) as total_suppliers
    FROM purchase_invoices
    WHERE workshop_id = ? AND deleted_at IS NULL
  `).get(workshopId, workshopId) as any;

  return res.json({
    success: true,
    data: invoices,
    summary: summaryRow
  });
}

/**
 * Get single purchase invoice with all line items
 */
export function getPurchaseInvoiceById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const invoice = db.prepare(`
    SELECT 
      pi.*,
      s.contact_person as supplier_contact,
      s.category as supplier_category,
      s.address as supplier_address,
      u.full_name as creator_name
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    LEFT JOIN users u ON pi.created_by = u.id
    WHERE pi.id = ? AND pi.workshop_id = ? AND pi.deleted_at IS NULL
  `).get(id, workshopId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'فاتورة المورد غير موجودة' });
  }

  const items = db.prepare(`
    SELECT 
      pii.*,
      p.part_number as current_part_number,
      p.stock_quantity as current_stock,
      p.category as part_category
    FROM purchase_invoice_items pii
    LEFT JOIN parts p ON pii.part_id = p.id
    WHERE pii.purchase_invoice_id = ?
    ORDER BY pii.created_at ASC
  `).all(id);

  return res.json({
    success: true,
    data: {
      ...invoice,
      items
    }
  });
}

/**
 * Create a new purchase invoice from a supplier & update stock & optionally code new parts
 */
export function createPurchaseInvoice(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const userId = req.user?.id || 'usr_admin';

  const {
    invoice_number,
    supplier_id,
    supplier_name,
    supplier_phone,
    supplier_tax_number,
    invoice_date,
    due_date,
    tax_percent,
    paid_amount,
    payment_method,
    notes,
    invoice_image_url,
    items
  } = req.body;

  if (!supplier_name || !supplier_name.trim()) {
    return res.status(400).json({ success: false, error: 'اسم المورد حقل إلزامي' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'يجب إضافة صنف واحد على الأقل في فاتورة المورد' });
  }

  // Calculate totals
  let subtotal = 0;
  for (const item of items) {
    const qty = parseInt(item.quantity || 1, 10);
    const cost = parseFloat(item.unit_cost || 0);
    subtotal += qty * cost;
  }

  const taxPct = tax_percent !== undefined ? parseFloat(tax_percent) : 15.0;
  const taxAmount = (subtotal * taxPct) / 100.0;
  const grandTotal = subtotal + taxAmount;
  const paid = Math.min(parseFloat(paid_amount || 0), grandTotal);
  const balanceDue = Math.max(0, grandTotal - paid);

  let paymentStatus = 'paid';
  if (balanceDue > 0) {
    paymentStatus = paid > 0 ? 'partially_paid' : 'unpaid';
  }

  const invoiceId = uuidv4();
  const finalInvoiceNum = (invoice_number && invoice_number.trim()) || `INV-SUP-${Date.now().toString().slice(-6)}`;

  try {
    const tx = db.transaction(() => {
      // 1. Resolve or create supplier entry
      let finalSupplierId = supplier_id;
      if (!finalSupplierId) {
        const found = db.prepare(`
          SELECT id FROM suppliers 
          WHERE workshop_id = ? AND name = ? AND deleted_at IS NULL
        `).get(workshopId, supplier_name.trim()) as any;

        if (found) {
          finalSupplierId = found.id;
        } else {
          // Auto-create supplier so they exist in directory
          finalSupplierId = uuidv4();
          db.prepare(`
            INSERT INTO suppliers (
              id, workshop_id, name, phone, tax_number, category, payment_terms
            ) VALUES (?, ?, ?, ?, ?, 'قطع غيار', 'cash')
          `).run(
            finalSupplierId,
            workshopId,
            supplier_name.trim(),
            supplier_phone?.trim() || null,
            supplier_tax_number?.trim() || null
          );
        }
      }

      // 2. Insert Purchase Invoice Header
      db.prepare(`
        INSERT INTO purchase_invoices (
          id, workshop_id, invoice_number, supplier_id, supplier_name, supplier_phone, supplier_tax_number,
          subtotal, tax_percent, tax_amount, grand_total, paid_amount, balance_due,
          payment_status, payment_method, invoice_date, due_date, notes, invoice_image_url, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId,
        workshopId,
        finalInvoiceNum,
        finalSupplierId,
        supplier_name.trim(),
        supplier_phone?.trim() || null,
        supplier_tax_number?.trim() || null,
        subtotal,
        taxPct,
        taxAmount,
        grandTotal,
        paid,
        balanceDue,
        paymentStatus,
        payment_method || 'cash',
        invoice_date || new Date().toISOString().slice(0, 10),
        due_date || null,
        notes?.trim() || null,
        invoice_image_url || null,
        userId
      );

      // If initial payment was made with the invoice, record it in supplier_payments
      if (paid > 0) {
        const payNum = `PAY-SUP-${Date.now().toString().slice(-6)}`;
        db.prepare(`
          INSERT INTO supplier_payments (
            id, workshop_id, payment_number, supplier_id, purchase_invoice_id,
            amount, payment_method, payment_date, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          workshopId,
          payNum,
          finalSupplierId,
          invoiceId,
          paid,
          payment_method || 'cash',
          invoice_date || new Date().toISOString().slice(0, 10),
          `دفعة مسددة مع إصدار الفاتورة [${finalInvoiceNum}]`,
          userId
        );
      }

      // 3. Insert items and update inventory stock
      for (const item of items) {
        const itemId = uuidv4();
        const qty = parseInt(item.quantity || 1, 10);
        const cost = parseFloat(item.unit_cost || 0);
        const total = qty * cost;
        const updateInv = item.update_inventory !== false ? 1 : 0;

        let partId = item.part_id;

        // If user wants to create a new part or no partId provided
        if (!partId && (item.is_new_part || item.create_in_inventory)) {
          partId = uuidv4();
          const pNum = item.part_number?.trim() || `PRT-${Date.now().toString().slice(-6)}`;
          const pName = item.item_name.trim();
          const pSalePrice = parseFloat(item.sale_price || 0) || (cost * 1.3); // Default 30% margin if not specified

          db.prepare(`
            INSERT INTO parts (
              id, workshop_id, part_number, name, category, brand, supplier_name,
              cost_price, sale_price, stock_quantity, min_stock_alert, storage_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            partId,
            workshopId,
            pNum,
            pName,
            item.category || 'قطع غيار',
            item.brand || 'عام',
            supplier_name.trim(),
            cost,
            pSalePrice,
            qty, // initial stock from this invoice
            item.min_stock_alert || 2,
            item.storage_location || 'المستودع الرئيسي'
          );

          // Record initial stock movement
          const movementId = uuidv4();
          db.prepare(`
            INSERT INTO stock_movements (
              id, workshop_id, part_id, movement_type, quantity,
              unit_cost, unit_price, reference_type, reference_id, notes, created_by
            ) VALUES (?, ?, ?, 'purchase', ?, ?, 0, 'purchase_invoice', ?, ?, ?)
          `).run(
            movementId,
            workshopId,
            partId,
            qty,
            cost,
            invoiceId,
            `تكويد وتوريد أولي بفاتورة مشتريات [${finalInvoiceNum}] من المورد: ${supplier_name.trim()}`,
            userId
          );
        } else {
          // If no part_id provided, check if part_number matches an existing part
          if (!partId && item.part_number) {
            const matchPart = db.prepare(`
              SELECT id FROM parts 
              WHERE workshop_id = ? AND part_number = ? AND deleted_at IS NULL
            `).get(workshopId, item.part_number.trim()) as any;

            if (matchPart) {
              partId = matchPart.id;
            }
          }

          // If updating existing inventory part
          if (updateInv === 1 && partId) {
            db.prepare(`
              UPDATE parts 
              SET stock_quantity = stock_quantity + ?,
                  cost_price = ?,
                  supplier_name = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND workshop_id = ?
            `).run(qty, cost, supplier_name.trim(), partId, workshopId);

            // Record stock movement
            const movementId = uuidv4();
            db.prepare(`
              INSERT INTO stock_movements (
                id, workshop_id, part_id, movement_type, quantity,
                unit_cost, unit_price, reference_type, reference_id, notes, created_by
              ) VALUES (?, ?, ?, 'purchase', ?, ?, 0, 'purchase_invoice', ?, ?, ?)
            `).run(
              movementId,
              workshopId,
              partId,
              qty,
              cost,
              invoiceId,
              `توريد فاتورة مشتريات [${finalInvoiceNum}] من المورد: ${supplier_name.trim()}`,
              userId
            );
          }
        }

        // Insert item record
        db.prepare(`
          INSERT INTO purchase_invoice_items (
            id, purchase_invoice_id, part_id, item_name, part_number,
            quantity, unit_cost, total_cost, update_inventory
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          invoiceId,
          partId || null,
          item.item_name.trim(),
          item.part_number?.trim() || null,
          qty,
          cost,
          total,
          updateInv
        );
      }
    });

    tx();

    logActivity(req, 'CREATE', 'purchase_invoice', invoiceId, {
      invoice_number: finalInvoiceNum,
      supplier_name,
      grand_total: grandTotal,
      paid_amount: paid,
      balance_due: balanceDue
    });

    broadcastEvent({
      workshopId,
      entity: 'purchases',
      entityId: invoiceId,
      action: 'INSERT',
      payload: { id: invoiceId, invoice_number: finalInvoiceNum, supplier_name, grand_total: grandTotal },
      originUserId: userId
    });

    broadcastEvent({
      workshopId,
      entity: 'inventory',
      entityId: 'all',
      action: 'UPDATE',
      payload: { reason: 'purchase_invoice_created' },
      originUserId: userId
    });

    broadcastEvent({
      workshopId,
      entity: 'suppliers',
      entityId: 'all',
      action: 'UPDATE',
      payload: { reason: 'purchase_invoice_created' },
      originUserId: userId
    });

    return res.status(201).json({
      success: true,
      data: {
        id: invoiceId,
        invoice_number: finalInvoiceNum,
        grand_total: grandTotal,
        balance_due: balanceDue,
        payment_status: paymentStatus
      },
      message: `تم تسجيل فاتورة المشتريات [${finalInvoiceNum}] للمورد "${supplier_name}" بنجاح وتحديث أرصدة الأصناف بالمخزن`
    });
  } catch (err: any) {
    console.error('Create purchase invoice error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حفظ فاتورة المورد: ' + err.message });
  }
}

/**
 * Record payment to supplier for an outstanding invoice
 */
export function recordSupplierPayment(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { amount, payment_method, notes } = req.body;

  const paymentVal = parseFloat(amount || 0);
  if (paymentVal <= 0) {
    return res.status(400).json({ success: false, error: 'مبلغ السداد يجب أن يكون أكبر من صفر' });
  }

  const invoice = db.prepare(`
    SELECT * FROM purchase_invoices 
    WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL
  `).get(id, workshopId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'فاتورة المورد غير موجودة' });
  }

  if (invoice.balance_due <= 0) {
    return res.status(400).json({ success: false, error: 'الفاتورة مسددة بالكامل ولا يوجد مبالغ متبقية' });
  }

  const actualPay = Math.min(paymentVal, invoice.balance_due);
  const newPaid = invoice.paid_amount + actualPay;
  const newBalance = Math.max(0, invoice.balance_due - actualPay);
  const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';

  db.prepare(`
    UPDATE purchase_invoices 
    SET paid_amount = ?,
        balance_due = ?,
        payment_status = ?,
        payment_method = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(newPaid, newBalance, newStatus, payment_method || invoice.payment_method, id, workshopId);

  // Record payment in supplier_payments
  const payId = uuidv4();
  const payNum = `PAY-SUP-${Date.now().toString().slice(-6)}`;
  db.prepare(`
    INSERT INTO supplier_payments (
      id, workshop_id, payment_number, supplier_id, purchase_invoice_id,
      amount, payment_method, reference_number, payment_date, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payId,
    workshopId,
    payNum,
    invoice.supplier_id || 'general',
    id,
    actualPay,
    payment_method || invoice.payment_method || 'cash',
    req.body.reference_number || null,
    req.body.payment_date || new Date().toISOString().slice(0, 10),
    notes?.trim() || `سداد عن فاتورة مشتريات [${invoice.invoice_number}]`,
    req.user?.id || 'admin'
  );

  logActivity(req, 'PAYMENT', 'purchase_invoice', id, {
    invoice_number: invoice.invoice_number,
    amount_paid: actualPay,
    remaining_balance: newBalance
  });

  broadcastEvent({
    workshopId,
    entity: 'purchases',
    entityId: id,
    action: 'UPDATE',
    payload: { id, paid_amount: newPaid, balance_due: newBalance, payment_status: newStatus },
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    data: {
      id,
      paid_amount: newPaid,
      balance_due: newBalance,
      payment_status: newStatus
    },
    message: `تم سداد مبلغ ${actualPay} ج.م للمورد. المتبقي على الفاتورة: ${newBalance} ج.م`
  });
}

/**
 * Delete a purchase invoice
 */
export function deletePurchaseInvoice(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const invoice = db.prepare(`
    SELECT id, invoice_number, supplier_name FROM purchase_invoices 
    WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL
  `).get(id, workshopId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'فاتورة المورد غير موجودة' });
  }

  try {
    const tx = db.transaction(() => {
      // Revert inventory stock for parts that were updated by this invoice
      const items = db.prepare(`SELECT part_id, quantity, update_inventory FROM purchase_invoice_items WHERE purchase_invoice_id = ?`).all(id) as any[];
      for (const item of items) {
        if (item.update_inventory === 1 && item.part_id) {
          db.prepare(`
            UPDATE parts 
            SET stock_quantity = MAX(0, stock_quantity - ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND workshop_id = ?
          `).run(item.quantity, item.part_id, workshopId);

          const movementId = uuidv4();
          db.prepare(`
            INSERT INTO stock_movements (
              id, workshop_id, part_id, movement_type, quantity,
              unit_cost, unit_price, reference_type, reference_id, notes, created_by
            ) VALUES (?, ?, ?, 'return', ?, 0, 0, 'purchase_invoice', ?, ?, ?)
          `).run(
            movementId,
            workshopId,
            item.part_id,
            -item.quantity,
            id,
            `استرجاع مخزون بسبب إلغاء فاتورة المشتريات [${invoice.invoice_number}]`,
            req.user?.id || 'admin'
          );
        }
      }

      db.prepare(`DELETE FROM supplier_payments WHERE purchase_invoice_id = ?`).run(id);
      db.prepare(`DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = ?`).run(id);
      db.prepare(`DELETE FROM purchase_invoices WHERE id = ? AND workshop_id = ?`).run(id, workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'purchase_invoice', id, { invoice_number: invoice.invoice_number });

    broadcastEvent({
      workshopId,
      entity: 'purchases',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    broadcastEvent({
      workshopId,
      entity: 'inventory',
      entityId: 'all',
      action: 'UPDATE',
      payload: { reason: 'purchase_invoice_deleted' },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف فاتورة المشتريات واسترجاع المخزون بنجاح' });
  } catch (err: any) {
    console.error('Delete purchase invoice error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف فاتورة المورد: ' + err.message });
  }
}

/**
 * Update an existing purchase invoice
 */
export function updatePurchaseInvoice(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const { notes, due_date, payment_method, invoice_number } = req.body;

  const invoice = db.prepare(`SELECT * FROM purchase_invoices WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL`).get(id, workshopId) as any;
  if (!invoice) {
    return res.status(404).json({ success: false, error: 'فاتورة المشتريات غير موجودة' });
  }

  db.prepare(`
    UPDATE purchase_invoices
    SET notes = COALESCE(?, notes),
        due_date = ?,
        payment_method = COALESCE(?, payment_method),
        invoice_number = COALESCE(?, invoice_number),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(
    notes !== undefined ? notes?.trim() || null : invoice.notes,
    due_date !== undefined ? due_date || null : invoice.due_date,
    payment_method || invoice.payment_method,
    invoice_number?.trim() || invoice.invoice_number,
    id,
    workshopId
  );

  logActivity(req, 'UPDATE', 'purchase_invoice', id, { invoice_number: invoice.invoice_number });

  broadcastEvent({
    workshopId,
    entity: 'purchases',
    entityId: id,
    action: 'UPDATE',
    payload: { id },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم تحديث بيانات فاتورة المشتريات بنجاح' });
}
