import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { executeTransaction } from '../../database/db';
import { logActivity } from '../../middleware/audit';
import { broadcastEvent } from '../../websocket/socketServer';

export function getParts(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const search = (req.query.search as string || '').trim();
  const category = req.query.category as string;
  const lowStockOnly = req.query.low_stock === 'true';

  let sql = `
    SELECT * FROM parts 
    WHERE workshop_id = ? AND deleted_at IS NULL
  `;
  const params: any[] = [workshopId];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  if (lowStockOnly) {
    sql += ` AND stock_quantity <= min_stock_alert`;
  }

  if (search) {
    sql += ` AND (name LIKE ? OR part_number LIKE ? OR brand LIKE ? OR category LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY name ASC`;
  const parts = db.prepare(sql).all(...params);

  return res.json({ success: true, data: parts });
}

export function getPartById(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const part = db.prepare(`
    SELECT * FROM parts WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL
  `).get(id, workshopId) as any;

  if (!part) {
    return res.status(404).json({ success: false, error: 'القطعة غير موجودة' });
  }

  // Stock movements history
  part.movements = db.prepare(`
    SELECT sm.*, u.full_name as created_by_name
    FROM stock_movements sm
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.part_id = ?
    ORDER BY sm.created_at DESC
    LIMIT 50
  `).all(id);

  return res.json({ success: true, data: part });
}

const CATEGORY_PREFIXES: Record<string, string> = {
  'زيوت': 'OIL',
  'زيوت وسوائل': 'OIL',
  'لمبات': 'LMP',
  'لمبات وإضاءة': 'LMP',
  'إضاءة': 'LMP',
  'فلاتر': 'FLT',
  'فرامل': 'BRK',
  'كهرباء': 'ELE',
  'كهرباء وبواجي': 'ELE',
  'تبريد': 'COL',
  'تبريد ومكيف': 'COL',
  'عفشة': 'SUS',
  'عفشة وهيدروليك': 'SUS',
  'محرك': 'ENG',
  'محرك وجيربكس': 'ENG',
  'بطاريات': 'BAT',
  'إطارات': 'TIR',
  'مستهلكات': 'CON',
  'مستهلكات عامة': 'CON'
};

export function getCategoryPrefix(cat?: string): string {
  if (!cat) return 'PRT';
  const trimmed = cat.trim();
  for (const [key, pfx] of Object.entries(CATEGORY_PREFIXES)) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return pfx;
    }
  }
  return 'PRT';
}

export function generatePartCode(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const category = (req.query.category as string || '').trim();
  const prefix = getCategoryPrefix(category);

  const existingParts = db.prepare(`
    SELECT part_number FROM parts 
    WHERE workshop_id = ? AND part_number LIKE ? AND deleted_at IS NULL
  `).all(workshopId, `${prefix}-%`) as { part_number: string }[];

  let maxNum = 1000;
  for (const p of existingParts) {
    const match = p.part_number.match(new RegExp(`^${prefix}-(\\d+)`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextCode = `${prefix}-${maxNum + 1}`;

  return res.json({
    success: true,
    data: {
      code: nextCode,
      prefix,
      category
    }
  });
}

export function createPart(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    part_number, name, category, brand, type,
    supplier_name, cost_price, sale_price,
    stock_quantity, min_stock_alert, storage_location, warranty_months,
    description, image_url
  } = req.body;

  if (!name || cost_price === undefined || sale_price === undefined) {
    return res.status(400).json({ success: false, error: 'اسم الصنف، سعر التكلفة، وسعر البيع حقول إلزامية' });
  }

  let code = (part_number || '').trim();
  if (!code) {
    // Automatically generate item code if left blank
    const prefix = getCategoryPrefix(category);
    const existingParts = db.prepare(`
      SELECT part_number FROM parts 
      WHERE workshop_id = ? AND part_number LIKE ? AND deleted_at IS NULL
    `).all(workshopId, `${prefix}-%`) as { part_number: string }[];

    let maxNum = 1000;
    for (const p of existingParts) {
      const match = p.part_number.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    code = `${prefix}-${maxNum + 1}`;
  } else {
    // Check unique part_number in workshop
    const existing = db.prepare('SELECT id FROM parts WHERE part_number = ? AND workshop_id = ? AND deleted_at IS NULL').get(code, workshopId);
    if (existing) {
      return res.status(400).json({ success: false, error: 'كود الصنف / رقم القطعة مسجل مسبقاً في الدليل' });
    }
  }

  const partId = uuidv4();
  const initQty = parseInt(stock_quantity || 0, 10);
  const cost = parseFloat(cost_price);
  const sale = parseFloat(sale_price);

  executeTransaction(() => {
    // 1. Insert Part
    db.prepare(`
      INSERT INTO parts (
        id, workshop_id, part_number, name, category, brand, type,
        supplier_name, cost_price, sale_price, stock_quantity,
        min_stock_alert, storage_location, warranty_months, description, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      partId,
      workshopId,
      code,
      name.trim(),
      category?.trim() || 'عام',
      brand?.trim() || null,
      type || 'Original',
      supplier_name?.trim() || null,
      cost,
      sale,
      initQty,
      parseInt(min_stock_alert || 2, 10),
      storage_location?.trim() || null,
      parseInt(warranty_months || 0, 10),
      description?.trim() || null,
      image_url?.trim() || null
    );

    // 2. If initial stock > 0, log initial stock movement
    if (initQty > 0) {
      db.prepare(`
        INSERT INTO stock_movements (
          id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price, notes, created_by
        ) VALUES (?, ?, ?, 'purchase', ?, ?, ?, 'رصيد افتتاحي للمخزون', ?)
      `).run(
        uuidv4(),
        workshopId,
        partId,
        initQty,
        cost,
        sale,
        req.user?.id || 'usr_admin'
      );
    }
  });

  logActivity(req, 'CREATE', 'part', partId, { part_number: code, name, stock_quantity: initQty });
  broadcastEvent({
    workshopId,
    entity: 'inventory',
    entityId: partId,
    action: 'INSERT',
    payload: { id: partId, part_number: code, name, stock_quantity: initQty },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { id: partId, part_number: code, name },
    message: 'تم تكويد وإضافة الصنف إلى دليل المخزون بنجاح'
  });
}

export function updatePart(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;
  const {
    part_number, name, category, brand, type,
    supplier_name, cost_price, sale_price,
    stock_quantity, min_stock_alert, storage_location, warranty_months,
    description, image_url
  } = req.body;

  const existing = db.prepare('SELECT id FROM parts WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(id, workshopId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'القطعة غير موجودة' });
  }

  db.prepare(`
    UPDATE parts SET
      part_number = ?, name = ?, category = ?, brand = ?, type = ?,
      supplier_name = ?, cost_price = ?, sale_price = ?,
      stock_quantity = COALESCE(?, stock_quantity),
      min_stock_alert = ?, storage_location = ?, warranty_months = ?,
      description = ?, image_url = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workshop_id = ?
  `).run(
    part_number.trim(),
    name.trim(),
    category?.trim() || null,
    brand?.trim() || null,
    type || 'Original',
    supplier_name?.trim() || null,
    parseFloat(cost_price),
    parseFloat(sale_price),
    stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
    parseInt(min_stock_alert || 2, 10),
    storage_location?.trim() || null,
    parseInt(warranty_months || 0, 10),
    description !== undefined ? (description?.trim() || null) : null,
    image_url !== undefined ? (image_url?.trim() || null) : null,
    id,
    workshopId
  );

  logActivity(req, 'UPDATE', 'part', id, { part_number, name });
  broadcastEvent({
    workshopId,
    entity: 'inventory',
    entityId: id,
    action: 'UPDATE',
    payload: { id, part_number, name },
    originUserId: req.user?.id
  });

  return res.json({ success: true, message: 'تم تحديث بيانات القطعة بنجاح' });
}

/**
 * Restock / Inventory Adjustment (Purchase or Audit correction)
 */
export function recordStockMovement(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { part_id, movement_type, quantity, unit_cost, notes, reference_number, customer_id, customer_name } = req.body;

  if (!part_id || !movement_type || !quantity) {
    return res.status(400).json({ success: false, error: 'القطعة، نوع الحركة، والكمية حقول مطلوبة' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty === 0) {
    return res.status(400).json({ success: false, error: 'الكمية غير صالحة' });
  }

  const part = db.prepare('SELECT id, name, cost_price, sale_price, stock_quantity FROM parts WHERE id = ? AND workshop_id = ? AND deleted_at IS NULL').get(part_id, workshopId) as any;
  if (!part) {
    return res.status(404).json({ success: false, error: 'القطعة غير موجودة' });
  }

  // Prevent negative balance
  if (part.stock_quantity + qty < 0) {
    return res.status(400).json({ success: false, error: 'لا يمكن إتمام العملية لأنها ستؤدي إلى رصيد مخزون سالب' });
  }

  let resolvedCustName = customer_name ? String(customer_name).trim() : null;
  if (customer_id && !resolvedCustName) {
    const custRow = db.prepare('SELECT full_name FROM customers WHERE id = ?').get(customer_id) as any;
    if (custRow) resolvedCustName = custRow.full_name;
  }

  const movementId = uuidv4();
  const cost = unit_cost !== undefined ? parseFloat(unit_cost) : part.cost_price;

  executeTransaction(() => {
    db.prepare(`
      UPDATE parts 
      SET stock_quantity = stock_quantity + ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(qty, cost, part_id);

    db.prepare(`
      INSERT INTO stock_movements (
        id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price,
        reference_type, reference_id, notes, created_by, customer_id, customer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual_restock', ?, ?, ?, ?, ?)
    `).run(
      movementId,
      workshopId,
      part_id,
      movement_type,
      qty,
      cost,
      part.sale_price,
      reference_number || null,
      notes?.trim() || 'حركة توريد / تسوية مخزنية',
      req.user!.id,
      customer_id || null,
      resolvedCustName
    );
  });

  const updatedPart = db.prepare('SELECT stock_quantity FROM parts WHERE id = ?').get(part_id) as any;

  logActivity(req, 'UPDATE', 'stock_movement', movementId, { part_id, movement_type, quantity: qty });
  broadcastEvent({
    workshopId,
    entity: 'inventory',
    entityId: part_id,
    action: 'UPDATE',
    payload: { part_id, stock_quantity: updatedPart.stock_quantity },
    originUserId: req.user?.id
  });

  return res.status(201).json({
    success: true,
    data: { part_id, new_quantity: updatedPart.stock_quantity },
    message: `تم تحديث رصيد المخزون بنجاح. الرصيد الحالي: ${updatedPart.stock_quantity} قطعة`
  });
}

export function deletePart(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { id } = req.params;

  const part = db.prepare('SELECT id, part_number, name FROM parts WHERE id = ? AND workshop_id = ?').get(id, workshopId) as any;
  if (!part) {
    return res.status(404).json({ success: false, error: 'قطعة الغيار غير موجودة' });
  }

  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM used_parts WHERE part_id = ?').run(id);
      db.prepare('DELETE FROM stock_movements WHERE part_id = ?').run(id);
      db.prepare('DELETE FROM invoice_items WHERE part_id = ?').run(id);
      db.prepare('DELETE FROM parts WHERE id = ? AND workshop_id = ?').run(id, workshopId);
    });

    tx();

    logActivity(req, 'DELETE', 'part', id, { part_number: part.part_number, name: part.name });
    broadcastEvent({
      workshopId,
      entity: 'inventory',
      entityId: id,
      action: 'DELETE',
      payload: { id },
      originUserId: req.user?.id
    });

    return res.json({ success: true, message: 'تم حذف قطعة الغيار بنجاح' });
  } catch (err: any) {
    console.error('Delete part error:', err);
    return res.status(500).json({ success: false, error: 'فشل في حذف قطعة الغيار: ' + err.message });
  }
}

/**
 * Real-time Barcode Scanner Action
 * Directly dispenses (-) or receives (+) stock upon scanning with a physical barcode gun
 */
export function scanBarcodeAction(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const { barcode, action, quantity, notes, customer_id, customer_name, work_order_id } = req.body;

  if (!barcode || !String(barcode).trim()) {
    return res.status(400).json({ success: false, error: 'يرجى إرسال كود الصنف أو الباركود' });
  }

  const code = String(barcode).trim();
  const act = action === 'receive' ? 'receive' : 'dispense'; // dispense (-) or receive (+)
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  // Find part by exact part_number (case-insensitive) or id
  const part = db.prepare(`
    SELECT * FROM parts 
    WHERE workshop_id = ? AND deleted_at IS NULL AND (
      LOWER(part_number) = LOWER(?) OR id = ?
    )
  `).get(workshopId, code, code) as any;

  if (!part) {
    return res.status(404).json({
      success: false,
      error: `لم يتم العثور على صنف بالباركود أو الكود: ${code}`
    });
  }

  const prevQty = part.stock_quantity;
  const changeQty = act === 'receive' ? qty : -qty;
  const newQty = prevQty + changeQty;

  if (newQty < 0) {
    return res.status(400).json({
      success: false,
      error: `لا يمكن صرف ${qty} قطعة من "${part.name}". الرصيد المتاح بالمخزن هو ${prevQty} فقط!`,
      part,
      current_quantity: prevQty
    });
  }

  // Resolve customer name if customer_id is provided
  let resolvedCustName = customer_name ? String(customer_name).trim() : null;
  if (customer_id && !resolvedCustName) {
    const custRow = db.prepare('SELECT full_name FROM customers WHERE id = ?').get(customer_id) as any;
    if (custRow) resolvedCustName = custRow.full_name;
  }

  const movementId = uuidv4();
  const movementType = act === 'receive' ? 'purchase' : 'consumption';
  const defaultNotes = act === 'receive'
    ? `توريد فوري بمسح الباركود (+${qty})`
    : `صرف فوري بمسح الباركود (-${qty})${resolvedCustName ? ` - للعميل: ${resolvedCustName}` : ''}`;

  const refType = work_order_id ? 'work_order' : 'barcode_scan';
  const refId = work_order_id || code;

  executeTransaction(() => {
    // 1. Update part stock
    db.prepare(`
      UPDATE parts 
      SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQty, part.id);

    // 2. Insert stock movement log
    db.prepare(`
      INSERT INTO stock_movements (
        id, workshop_id, part_id, movement_type, quantity, unit_cost, unit_price,
        reference_type, reference_id, notes, created_by, customer_id, customer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movementId,
      workshopId,
      part.id,
      movementType,
      changeQty,
      part.cost_price,
      part.sale_price,
      refType,
      refId,
      notes?.trim() || defaultNotes,
      req.user?.id || 'usr_admin',
      customer_id || null,
      resolvedCustName
    );
  });

  logActivity(req, 'UPDATE', 'barcode_scan_stock', part.id, {
    part_number: part.part_number,
    action: act,
    previous_quantity: prevQty,
    new_quantity: newQty,
    quantity_changed: changeQty,
    customer_name: resolvedCustName
  });

  broadcastEvent({
    workshopId,
    entity: 'inventory',
    entityId: part.id,
    action: 'UPDATE',
    payload: {
      part_id: part.id,
      part_number: part.part_number,
      name: part.name,
      stock_quantity: newQty,
      action: act,
      change: changeQty,
      customer_name: resolvedCustName
    },
    originUserId: req.user?.id
  });

  return res.json({
    success: true,
    action: act,
    quantity_changed: changeQty,
    previous_quantity: prevQty,
    new_quantity: newQty,
    part: { ...part, stock_quantity: newQty },
    customer_name: resolvedCustName,
    message: act === 'receive'
      ? `تم توريد (+${qty}) إلى مخزون "${part.name}". الرصيد الجديد: ${newQty}`
      : `تم صرف (-${qty}) من مخزون "${part.name}"${resolvedCustName ? ` للعميل ${resolvedCustName}` : ''}. الرصيد المتبقي: ${newQty}`
  });
}

/**
 * تقرير حركات المخزون الشامل (Stock Movements & Audit Report)
 * يجلب تفاصيل كل حركة: التوقيت، المسؤول، العميل المستفيد، الصنف، والكمية والقيمة
 */
export function getStockMovementsReport(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const {
    search,
    movement_type,
    customer_id,
    start_date,
    end_date,
    part_id,
    limit = '300'
  } = req.query;

  let sql = `
    SELECT 
      sm.id,
      sm.workshop_id,
      sm.part_id,
      sm.movement_type,
      sm.quantity,
      sm.unit_cost,
      sm.unit_price,
      sm.reference_type,
      sm.reference_id,
      sm.notes,
      sm.created_at,
      p.name as part_name,
      p.part_number,
      p.category as part_category,
      p.brand as part_brand,
      p.storage_location,
      u.full_name as created_by_name,
      COALESCE(r.display_name, r.name, 'مسؤول') as created_by_role,
      COALESCE(sm.customer_name, c_direct.full_name, c_wo.full_name, NULL) as customer_name,
      COALESCE(c_direct.phone, c_wo.phone, NULL) as customer_phone,
      COALESCE(c_direct.id, c_wo.id, sm.customer_id, NULL) as resolved_customer_id,
      COALESCE(veh.plate_number, NULL) as vehicle_plate,
      COALESCE(veh.make || ' ' || veh.model, NULL) as vehicle_model,
      wo.order_number as work_order_number
    FROM stock_movements sm
    JOIN parts p ON sm.part_id = p.id
    LEFT JOIN users u ON sm.created_by = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN customers c_direct ON sm.customer_id = c_direct.id
    LEFT JOIN work_orders wo ON (sm.reference_type = 'work_order' AND sm.reference_id = wo.id)
    LEFT JOIN visits v ON wo.visit_id = v.id
    LEFT JOIN customers c_wo ON v.customer_id = c_wo.id
    LEFT JOIN vehicles veh ON (wo.vehicle_id = veh.id OR v.vehicle_id = veh.id)
    WHERE sm.workshop_id = ?
  `;

  const params: any[] = [workshopId];

  if (movement_type && movement_type !== 'all') {
    sql += ` AND sm.movement_type = ?`;
    params.push(movement_type);
  }

  if (part_id) {
    sql += ` AND sm.part_id = ?`;
    params.push(part_id);
  }

  if (customer_id && customer_id !== 'all') {
    sql += ` AND (sm.customer_id = ? OR c_wo.id = ? OR c_direct.id = ?)`;
    params.push(customer_id, customer_id, customer_id);
  }

  if (start_date) {
    sql += ` AND DATE(sm.created_at) >= DATE(?)`;
    params.push(start_date);
  }

  if (end_date) {
    sql += ` AND DATE(sm.created_at) <= DATE(?)`;
    params.push(end_date);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    sql += ` AND (
      LOWER(p.name) LIKE ? OR
      LOWER(p.part_number) LIKE ? OR
      LOWER(COALESCE(sm.customer_name, '')) LIKE ? OR
      LOWER(COALESCE(c_direct.full_name, '')) LIKE ? OR
      LOWER(COALESCE(c_wo.full_name, '')) LIKE ? OR
      LOWER(COALESCE(u.full_name, '')) LIKE ? OR
      LOWER(COALESCE(sm.notes, '')) LIKE ? OR
      LOWER(COALESCE(wo.order_number, '')) LIKE ?
    )`;
    params.push(term, term, term, term, term, term, term, term);
  }

  sql += ` ORDER BY sm.created_at DESC LIMIT ?`;
  params.push(parseInt(limit as string, 10) || 300);

  const movements = db.prepare(sql).all(...params) as any[];

  // Statistics
  let totalDispensedQty = 0;
  let totalReceivedQty = 0;
  let totalDispensedValue = 0;
  let totalReceivedCost = 0;
  const uniqueCustomers = new Set<string>();

  movements.forEach((m) => {
    const qty = m.quantity || 0;
    if (qty < 0) {
      totalDispensedQty += Math.abs(qty);
      totalDispensedValue += Math.abs(qty) * (m.unit_price || 0);
    } else {
      totalReceivedQty += qty;
      totalReceivedCost += qty * (m.unit_cost || 0);
    }
    if (m.customer_name) {
      uniqueCustomers.add(m.customer_name);
    }
  });

  return res.json({
    success: true,
    data: {
      movements,
      stats: {
        total_movements: movements.length,
        total_dispensed_qty: totalDispensedQty,
        total_received_qty: totalReceivedQty,
        total_dispensed_value: totalDispensedValue,
        total_received_cost: totalReceivedCost,
        unique_customers_count: uniqueCustomers.size
      }
    }
  });
}

