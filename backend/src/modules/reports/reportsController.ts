import { Request, Response } from 'express';
import db from '../../database/db';

export function getDashboardStats(req: Request, res: Response) {
  const workshopId = req.user?.workshop_id || 'ws_default_01';

  // 1. Vehicle statuses in workshop
  const vehicleStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN status != 'delivered' AND status != 'cancelled' THEN 1 END) as total_in_workshop,
      COUNT(CASE WHEN status = 'diagnosing' THEN 1 END) as diagnosing_count,
      COUNT(CASE WHEN status = 'in_repair' THEN 1 END) as in_repair_count,
      COUNT(CASE WHEN status = 'waiting_parts' THEN 1 END) as waiting_parts_count,
      COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_count,
      COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count
    FROM visits
    WHERE workshop_id = ?
  `).get(workshopId) as any;

  // 2. Tasks stats
  const taskStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as tasks_in_progress,
      COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as tasks_pending,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed
    FROM tasks t
    JOIN work_orders wo ON t.work_order_id = wo.id
    WHERE wo.workshop_id = ?
  `).get(workshopId) as any;

  // 3. Low stock alerts
  const lowStockCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM parts 
    WHERE workshop_id = ? AND stock_quantity <= min_stock_alert AND deleted_at IS NULL
  `).get(workshopId) as { count: number };

  // 4. Financial overview
  const financialOverview = db.prepare(`
    SELECT 
      COALESCE(SUM(grand_total), 0) as total_invoiced,
      COALESCE(SUM(paid_amount), 0) as total_collected,
      COALESCE(SUM(balance_due), 0) as total_outstanding
    FROM invoices
    WHERE workshop_id = ? AND status != 'cancelled'
  `).get(workshopId) as any;

  const expensesOverview = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE workshop_id = ?
  `).get(workshopId) as { total_expenses: number };

  // 5. Recent active visits
  const recentVisits = db.prepare(`
    SELECT 
      v.id, v.visit_number, v.status, v.entry_datetime, v.customer_complaint,
      veh.plate_number, veh.make, veh.model,
      c.full_name as customer_name
    FROM visits v
    JOIN vehicles veh ON v.vehicle_id = veh.id
    JOIN customers c ON v.customer_id = c.id
    WHERE v.workshop_id = ? AND v.status != 'delivered'
    ORDER BY v.entry_datetime DESC
    LIMIT 6
  `).all(workshopId);

  return res.json({
    success: true,
    data: {
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
