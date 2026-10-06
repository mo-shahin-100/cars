import { Request, Response } from 'express';
import db from '../../database/db';

export function getDashboardStats(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';

  // 1. Vehicle statuses in workshop (standard & detailed)
  const vehicleStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN 1 END) as total_in_workshop,
      COUNT(CASE WHEN status IN ('diagnosing', 'diagnostics') THEN 1 END) as diagnosing_count,
      COUNT(CASE WHEN status IN ('in_repair', 'maintenance', 'repairs', 'engine_overhaul') THEN 1 END) as in_repair_count,
      COUNT(CASE WHEN status = 'waiting_parts' THEN 1 END) as waiting_parts_count,
      COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_count,
      COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count,
      COUNT(CASE WHEN status NOT IN ('ready', 'delivered', 'cancelled') THEN 1 END) as maintenance_count,
      COUNT(CASE WHEN DATE(entry_datetime) = DATE('now') THEN 1 END) as today_vehicles_count
    FROM visits
    WHERE workshop_id = ?
  `).get(workshopId) as any;

  // 2. Workshop Live Pipeline Stages (استقبال -> فحص -> تشخيص -> صيانة -> قطع غيار -> اختبار -> جاهزة)
  const inspectionCount = (db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE workshop_id = ? AND status NOT IN ('delivered', 'cancelled') 
    AND (status = 'inspection' OR (initial_inspection IS NOT NULL AND status = 'received'))
  `).get(workshopId) as any)?.count || 0;

  const testingCount = (db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE workshop_id = ? AND status = 'testing'
  `).get(workshopId) as any)?.count || 0;

  const pipeline = {
    received: Math.max(0, (vehicleStats.received_count || 0) - (inspectionCount > 0 ? 1 : 0)),
    inspection: inspectionCount,
    diagnostics: vehicleStats.diagnosing_count || 0,
    repair: vehicleStats.in_repair_count || 0,
    waiting_parts: vehicleStats.waiting_parts_count || 0,
    testing: testingCount,
    ready: vehicleStats.ready_count || 0
  };

  // 3. Tasks stats
  const taskStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as tasks_in_progress,
      COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as tasks_pending,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed
    FROM tasks t
    JOIN work_orders wo ON t.work_order_id = wo.id
    WHERE wo.workshop_id = ?
  `).get(workshopId) as any;

  // 4. Low stock alerts
  const lowStockCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM parts 
    WHERE workshop_id = ? AND stock_quantity <= min_stock_alert AND deleted_at IS NULL
  `).get(workshopId) as { count: number };

  // 5. Financial stats (All-time + Today)
  const financialOverview = db.prepare(`
    SELECT 
      COALESCE(SUM(grand_total), 0) as total_invoiced,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(balance_due), 0) as total_outstanding,
      COALESCE(SUM(CASE WHEN DATE(issue_date) = DATE('now') THEN grand_total ELSE 0 END), 0) as today_invoiced
    FROM invoices
    WHERE workshop_id = ? AND status != 'cancelled'
  `).get(workshopId) as any;

  const todayCollections = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE workshop_id = ? AND DATE(payment_date) = DATE('now')
  `).get(workshopId) as { total: number };

  const todayExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE workshop_id = ? AND DATE(expense_date) = DATE('now')
  `).get(workshopId) as { total: number };

  const expensesOverview = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE workshop_id = ?
  `).get(workshopId) as { total_expenses: number };

  // 6. Actionable Alerts (يحتاج انتباهك الآن)
  const overdueVisitsCount = (db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE workshop_id = ? AND status NOT IN ('ready', 'delivered', 'cancelled')
    AND entry_datetime <= datetime('now', '-2 days')
  `).get(workshopId) as any)?.count || 0;

  const unpaidInvoices = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(balance_due), 0) as total_balance
    FROM invoices
    WHERE workshop_id = ? AND status IN ('unpaid', 'partially_paid') AND balance_due > 0
  `).get(workshopId) as any;

  const unbilledReadyVehiclesCount = (db.prepare(`
    SELECT COUNT(*) as count FROM visits v
    WHERE v.workshop_id = ? AND v.status = 'ready'
    AND v.id NOT IN (SELECT visit_id FROM invoices WHERE visit_id IS NOT NULL AND status != 'cancelled')
  `).get(workshopId) as any)?.count || 0;

  const upcomingMaintenanceCount = (db.prepare(`
    SELECT COUNT(*) as count FROM vehicles
    WHERE workshop_id = ? AND deleted_at IS NULL AND next_maintenance_date IS NOT NULL 
    AND next_maintenance_date <= DATE('now', '+7 days')
  `).get(workshopId) as any)?.count || 0;

  const alerts = [
    {
      id: 'ready_vehicles',
      type: 'ready',
      title: 'سيارات جاهزة للتسليم',
      count: vehicleStats.ready_count || 0,
      description: 'سيارات تم الانتهاء من فحصها وصيانتها وجاهزة للتسليم للعميل',
      severity: (vehicleStats.ready_count || 0) > 0 ? 'success' : 'info',
      actionLabel: 'تسليم السيارة',
      targetTab: 'visits',
      filter: 'ready'
    },
    {
      id: 'overdue_repair',
      type: 'overdue',
      title: 'سيارات متأخرة بالصيانة',
      count: overdueVisitsCount,
      description: 'سيارات بالورشة منذ أكثر من 48 ساعة وتتطلب تسريع العمل',
      severity: overdueVisitsCount > 0 ? 'danger' : 'info',
      actionLabel: 'متابعة الفنيين',
      targetTab: 'visits',
      filter: 'maintenance'
    },
    {
      id: 'waiting_parts',
      type: 'parts',
      title: 'سيارات تنتظر قطع غيار',
      count: vehicleStats.waiting_parts_count || 0,
      description: 'سيارات متوقفة على وصول قطع غيار أو استلام من المورد',
      severity: (vehicleStats.waiting_parts_count || 0) > 0 ? 'warning' : 'info',
      actionLabel: 'طلب القطع / المشتريات',
      targetTab: 'purchases',
      filter: 'waiting_parts'
    },
    {
      id: 'unpaid_invoices',
      type: 'invoice',
      title: 'فواتير مستحقة وغير مدفوعة',
      count: unpaidInvoices.count || 0,
      description: `إجمالي المستحق ${Number(unpaidInvoices.total_balance || 0).toLocaleString()} ج.م`,
      severity: unpaidInvoices.count > 0 ? 'warning' : 'info',
      actionLabel: 'تحصيل الدفعة',
      targetTab: 'invoices',
      filter: 'unpaid'
    },
    {
      id: 'unbilled_ready',
      type: 'billing',
      title: 'سيارات جاهزة لم تُصدر فاتورتها',
      count: unbilledReadyVehiclesCount,
      description: 'سيارات أصبحت جاهزة ولكن لم يتم إصدار فاتورة نهائية لها بعد',
      severity: unbilledReadyVehiclesCount > 0 ? 'danger' : 'info',
      actionLabel: 'إصدار الفاتورة',
      targetTab: 'invoices',
      filter: 'unbilled'
    },
    {
      id: 'low_stock',
      type: 'stock',
      title: 'قطع غيار أوشكت على النفاد',
      count: lowStockCount.count || 0,
      description: 'أصناف في المخزن وصلت إلى الحد الأدنى لإعادة الطلب',
      severity: lowStockCount.count > 0 ? 'warning' : 'info',
      actionLabel: 'عرض المخزون',
      targetTab: 'inventory',
      filter: 'low_stock'
    },
    {
      id: 'upcoming_maintenance',
      type: 'maintenance',
      title: 'صيانات دورية مستحقة هذا الأسبوع',
      count: upcomingMaintenanceCount,
      description: 'عملاء حان أو قرب موعد صيانتهم الدورية القادمة',
      severity: upcomingMaintenanceCount > 0 ? 'info' : 'info',
      actionLabel: 'استعراض المواعيد',
      targetTab: 'fluids',
      filter: 'upcoming'
    }
  ].filter(a => a.count > 0);

  const totalAttentionCount = alerts.reduce((acc, a) => acc + (a.severity === 'danger' || a.severity === 'warning' ? a.count : 0), 0);

  // 7. Recent Activity (Audit logs, max 10)
  const rawActivities = db.prepare(`
    SELECT a.id, a.action, a.entity_name, a.entity_id, a.details_json, a.created_at,
           u.full_name as user_name
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.workshop_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all(workshopId) as any[];

  const formatActivityDescription = (act: any) => {
    let details: any = {};
    try {
      if (act.details_json) details = JSON.parse(act.details_json);
    } catch (e) {}

    const action = act.action;
    const entity = act.entity_name;

    if (entity === 'visit') {
      if (action === 'CREATE') return `تم تسجيل زيارة جديدة (${details.visit_number || 'سيارة'})`;
      if (action === 'STATUS_CHANGE') return `تم تحديث حالة الزيارة (${details.visit_number || ''}) إلى ${details.status || ''}`;
      if (action === 'DELETE') return `تم حذف الزيارة (${details.visit_number || ''})`;
    }
    if (entity === 'work_order') {
      if (action === 'CREATE') return `تم فتح أمر صيانة جديد (${details.order_number || ''})`;
      if (action === 'STATUS_CHANGE') return `تم تحديث حالة أمر الصيانة (${details.order_number || ''})`;
      if (action === 'DELETE') return `تم حذف أمر صيانة (${details.order_number || ''})`;
    }
    if (entity === 'invoice') {
      if (action === 'CREATE') return `تم إصدار فاتورة جديدة (${details.invoice_number || ''}) بمبلغ ${details.grandTotal ? Number(details.grandTotal).toLocaleString() + ' ج.م' : ''}`;
      if (action === 'PAYMENT') return `تم تسجيل دفعة لفاتورة بمبلغ ${details.amount ? Number(details.amount).toLocaleString() + ' ج.م' : ''}`;
      if (action === 'DELETE') return `تم إلغاء فاتورة (${details.invoice_number || ''})`;
    }
    if (entity === 'payment') {
      return `تم استلام وتحصيل دفعة نقدية/بنكية بمبلغ ${details.amount ? Number(details.amount).toLocaleString() + ' ج.م' : ''}`;
    }
    if (entity === 'customer') {
      if (action === 'CREATE') return `تمت إضافة عميل جديد (${details.full_name || ''})`;
      if (action === 'UPDATE') return `تم تعديل بيانات العميل (${details.full_name || ''})`;
    }
    if (entity === 'vehicle') {
      if (action === 'CREATE') return `تم تسجيل سيارة جديدة (${details.plate_number || ''} ${details.make || ''})`;
      if (action === 'UPDATE') return `تم تعديل بيانات السيارة (${details.plate_number || ''})`;
    }
    if (entity === 'expense') {
      return `تم تسجيل مصروف جديد (${details.category || ''}) بقيمة ${details.amount ? Number(details.amount).toLocaleString() + ' ج.م' : ''}`;
    }
    if (entity === 'part') {
      if (action === 'CREATE') return `تمت إضافة صنف جديد للمخزون (${details.name || details.part_number || ''})`;
      if (action === 'UPDATE') return `تم تعديل صنف بالمخزن (${details.name || ''})`;
    }
    if (entity === 'supplier') {
      if (action === 'CREATE') return `تمت إضافة مورد جديد (${details.name || ''})`;
    }
    if (entity === 'purchase_invoice') {
      if (action === 'CREATE') return `تم إنشاء فاتورة شراء وتوريد (${details.invoice_number || ''})`;
    }

    return `${action} ${entity}`;
  };

  const recentActivity = rawActivities.map(act => ({
    id: act.id,
    action: act.action,
    entity_name: act.entity_name,
    entity_id: act.entity_id,
    description: formatActivityDescription(act),
    user_name: act.user_name || 'النظام',
    created_at: act.created_at
  }));

  // 8. Active visits with detailed work orders, replaced parts, tasks, and invoice info
  const recentVisits = db.prepare(`
    SELECT 
      v.id, v.visit_number, v.status, v.entry_datetime, v.customer_complaint,
      v.vehicle_id, v.customer_id,
      veh.plate_number, veh.make, veh.model, veh.year,
      c.full_name as customer_name, c.phone as customer_phone,
      wo.id as work_order_id, wo.order_number, wo.category as work_order_category, wo.description as work_order_desc,
      wo.estimated_cost, wo.actual_cost,
      inv.id as invoice_id, inv.invoice_number, inv.grand_total as invoice_total, inv.paid_amount, inv.balance_due, inv.status as invoice_status
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    JOIN customers c ON v.customer_id = c.id
    LEFT JOIN work_orders wo ON wo.visit_id = v.id
    LEFT JOIN invoices inv ON inv.visit_id = v.id
    WHERE v.workshop_id = ? AND v.status != 'delivered'
    ORDER BY v.entry_datetime DESC
    LIMIT 50
  `).all(workshopId) as any[];

  // Attach tasks (what was repaired/checked) and used parts (what was replaced) for each visit
  for (const v of recentVisits) {
    if (v.work_order_id) {
      v.tasks = db.prepare(`
        SELECT t.id, t.title, t.description, t.price, t.status, u.full_name as mechanic_name
        FROM tasks t
        LEFT JOIN users u ON t.lead_mechanic_id = u.id
        WHERE t.work_order_id = ?
      `).all(v.work_order_id);

      v.usedParts = db.prepare(`
        SELECT up.id, up.quantity, up.unit_price, up.total_price, p.name as part_name, p.part_number, p.brand
        FROM used_parts up
        JOIN parts p ON up.part_id = p.id
        WHERE up.work_order_id = ?
      `).all(v.work_order_id);

      // Find first assigned mechanic name for quick display
      const firstMechanic = (v.tasks || []).find((t: any) => t.mechanic_name)?.mechanic_name;
      v.mechanic_name = firstMechanic || null;
    } else {
      v.tasks = [];
      v.usedParts = [];
      v.mechanic_name = null;
    }

    // Compute effective total price
    const tasksCost = (v.tasks || []).reduce((acc: number, t: any) => acc + (Number(t.price) || 0), 0);
    const partsCost = (v.usedParts || []).reduce((acc: number, p: any) => acc + (Number(p.total_price) || 0), 0);
    v.total_cost = Number(v.invoice_total) || Number(v.actual_cost) || Number(v.estimated_cost) || (tasksCost + partsCost) || 0;
  }

  // 9. Financial Snapshot
  const financialSnapshot = {
    today_invoiced: Number(financialOverview.today_invoiced || 0),
    today_collected: Number(todayCollections.total || 0),
    today_expenses: Number(todayExpenses.total || 0),
    today_net: Number(todayCollections.total || 0) - Number(todayExpenses.total || 0),
    total_outstanding: Number(financialOverview.total_outstanding || 0),
    total_invoiced_all: Number(financialOverview.total_invoiced || 0),
    total_collected_all: Number(financialOverview.total_collected || 0),
    total_expenses_all: Number(expensesOverview.total_expenses || 0)
  };

  // 10. Summary 4 Cards
  const summary = {
    today_vehicles: vehicleStats.today_vehicles_count || 0,
    total_in_workshop: vehicleStats.total_in_workshop || 0,
    today_collections: Number(todayCollections.total || 0),
    today_invoiced: Number(financialOverview.today_invoiced || 0),
    attention_count: totalAttentionCount
  };

  return res.json({
    success: true,
    data: {
      summary,
      pipeline,
      alerts,
      financialSnapshot,
      recentActivity,
      currentVehicles: recentVisits,
      // Backwards compatibility with existing callers
      vehicles: vehicleStats,
      tasks: taskStats,
      lowStockAlerts: lowStockCount.count,
      financials: {
        ...financialOverview,
        total_expenses: expensesOverview.total_expenses,
        net_collected_profit: financialOverview.total_collected - expensesOverview.total_expenses
      },
      recentVisits
    }
  });
}

/**
 * Section 15: Audited Financial Report with clear accounting indicators
 */
export function getFinancialReport(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;

  let invoiceFilter = `WHERE workshop_id = ? AND status != 'cancelled'`;
  let expenseFilter = `WHERE workshop_id = ?`;
  let usedPartsFilter = `WHERE wo.workshop_id = ?`;
  const params: any[] = [workshopId];
  const expenseParams: any[] = [workshopId];
  const partsParams: any[] = [workshopId];

  if (startDate) {
    invoiceFilter += ` AND issue_date >= ?`;
    expenseFilter += ` AND expense_date >= ?`;
    usedPartsFilter += ` AND up.created_at >= ?`;
    params.push(startDate);
    expenseParams.push(startDate);
    partsParams.push(startDate);
  }
  if (endDate) {
    invoiceFilter += ` AND issue_date <= ?`;
    expenseFilter += ` AND expense_date <= ?`;
    usedPartsFilter += ` AND up.created_at <= ?`;
    params.push(endDate);
    expenseParams.push(endDate);
    partsParams.push(endDate);
  }

  // Sales & Collections
  const salesSummary = db.prepare(`
    SELECT 
      COUNT(id) as total_invoices_count,
      COALESCE(SUM(labor_total), 0) as total_labor_revenue,
      COALESCE(SUM(parts_total), 0) as total_parts_billed,
      COALESCE(SUM(fluids_total), 0) as total_fluids_billed,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(tax_amount), 0) as total_vat,
      COALESCE(SUM(grand_total), 0) as gross_sales,
      COALESCE(SUM(paid_amount), 0) as cash_collections,
      COALESCE(SUM(balance_due), 0) as outstanding_receivables
    FROM invoices
    ${invoiceFilter}
  `).get(...params) as any;

  // Actual Cost of Spare Parts used
  const partsCostSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(up.quantity * up.unit_cost), 0) as total_parts_actual_cost,
      COALESCE(SUM(up.total_price), 0) as total_parts_billed_revenue
    FROM used_parts up
    JOIN work_orders wo ON up.work_order_id = wo.id
    ${usedPartsFilter}
  `).get(...partsParams) as any;

  // General Expenses
  const expensesSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_operating_expenses
    FROM expenses
    ${expenseFilter}
  `).get(...expenseParams) as any;

  // Parts gross profit margin
  const partsGrossProfit = partsCostSummary.total_parts_billed_revenue - partsCostSummary.total_parts_actual_cost;

  // Net Operating Profit calculation: (Labor Revenue + Parts Profit + Fluids - Discounts - Operating Expenses)
  const netOperatingProfit = (
    salesSummary.total_labor_revenue + 
    partsGrossProfit + 
    salesSummary.total_fluids_billed - 
    salesSummary.total_discounts - 
    expensesSummary.total_operating_expenses
  );

  return res.json({
    success: true,
    data: {
      sales: salesSummary,
      partsAccounting: {
        billed: partsCostSummary.total_parts_billed_revenue,
        cost: partsCostSummary.total_parts_actual_cost,
        margin: partsGrossProfit
      },
      expenses: expensesSummary.total_operating_expenses,
      netProfit: Math.round(netOperatingProfit * 100) / 100
    }
  });
}

/**
 * Mechanics Productivity & Hours Report
 */
export function getMechanicsProductivity(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';

  const mechanics = db.prepare(`
    SELECT 
      u.id, u.full_name, u.phone, u.specialty, u.hourly_rate,
      COUNT(DISTINCT ta.task_id) as total_assigned_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      COALESCE(SUM(ta.hours_worked), 0) as total_hours_logged
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN task_assignments ta ON ta.user_id = u.id
    LEFT JOIN tasks t ON ta.task_id = t.id
    WHERE u.workshop_id = ? AND r.name = 'mechanic' AND u.deleted_at IS NULL
    GROUP BY u.id
    ORDER BY completed_tasks DESC
  `).all(workshopId);

  return res.json({ success: true, data: mechanics });
}
