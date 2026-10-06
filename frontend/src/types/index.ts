export interface User {
  id: string;
  workshop_id: string;
  username: string;
  full_name: string;
  phone?: string;
  email?: string;
  role: 'owner' | 'manager' | 'reception' | 'mechanic' | 'accountant';
  role_display: string;
  specialty?: string;
  hourly_rate?: number;
  permissions: string[];
}

export interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  notes?: string;
  total_balance_due: number;
  visit_count: number;
  last_visit_at?: string;
  vehicles_count?: number;
  vehicles?: Vehicle[];
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  engine_number?: string;
  engine_capacity?: string;
  fuel_type: string;
  transmission_type: string;
  current_odometer: number;
  current_owner_id: string;
  owner_name?: string;
  owner_phone?: string;
  owner_code?: string;
  notes?: string;
  first_visit_at?: string;
  last_visit_at?: string;
  total_spent?: number;
  next_maintenance_date?: string;
  next_maintenance_km?: number;
  visits_count?: number;
  created_at: string;
}

export interface Visit {
  id: string;
  visit_number: string;
  vehicle_id: string;
  customer_id: string;
  plate_number?: string;
  make?: string;
  model?: string;
  year?: number;
  customer_name?: string;
  customer_phone?: string;
  entry_datetime: string;
  exit_datetime?: string;
  odometer_in: number;
  odometer_out?: number;
  fuel_level?: string;
  customer_complaint: string;
  intake_condition?: string;
  initial_inspection?: string;
  status: 'received' | 'maintenance' | 'repairs' | 'in_repair' | 'engine_overhaul' | 'diagnostics' | 'diagnosing' | 'waiting_parts' | 'ready' | 'delivered' | 'cancelled' | string;
  notes?: string;
  received_by_name?: string;
  work_orders_count?: number;
  vin?: string;
  color?: string;
  fuel_type?: string;
  transmission_type?: string;
  invoice_id?: string;
  invoice_number?: string;
  invoice_status?: string;
}

export interface WorkshopProfile {
  id: string;
  name: string;
  commercial_reg?: string;
  tax_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  tax_rate?: number;
}

export interface WorkOrder {
  id: string;
  order_number: string;
  visit_id: string;
  vehicle_id: string;
  plate_number?: string;
  make?: string;
  model?: string;
  year?: number;
  customer_name?: string;
  customer_phone?: string;
  visit_number?: string;
  visit_status?: string;
  category?: string;
  description: string;
  inspection_result?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'new' | 'diagnosing' | 'customer_approval' | 'in_progress' | 'waiting_parts' | 'paused' | 'completed' | 'ready' | 'delivered' | 'cancelled';
  estimated_cost: number;
  actual_cost: number;
  estimated_hours: number;
  actual_hours: number;
  created_by_name?: string;
  created_at: string;
  total_tasks?: number;
  completed_tasks?: number;
  tasks?: Task[];
  usedParts?: UsedPart[];
}

export interface Task {
  id: string;
  work_order_id: string;
  title: string;
  description?: string;
  price?: number;
  lead_mechanic_id?: string;
  lead_mechanic_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  start_time?: string;
  end_time?: string;
  notes?: string;
  assignments?: {
    id: string;
    user_id: string;
    mechanic_name: string;
    specialty?: string;
    role_in_task: string;
  }[];
}

export interface UsedPart {
  id: string;
  work_order_id: string;
  task_id?: string;
  part_id: string;
  part_name: string;
  part_number: string;
  brand?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface DiagnosticReport {
  id: string;
  visit_id: string;
  vehicle_id: string;
  plate_number?: string;
  make?: string;
  model?: string;
  visit_number?: string;
  scanner_manufacturer?: string;
  scanner_model?: string;
  test_datetime: string;
  system_tested: string;
  freeze_frame_json?: string;
  live_data_json?: string;
  technician_notes?: string;
  technician_name?: string;
  dtc_count?: number;
  codes?: DiagnosticCode[];
}

export interface DiagnosticCode {
  id: string;
  diagnostic_id: string;
  vehicle_id: string;
  dtc_code: string;
  description: string;
  system?: string;
  status_at_test: 'Current' | 'Pending' | 'History' | 'Permanent';
  is_confirmed_by_tech: number;
  resolution_status: 'detected' | 'repairing' | 'resolved_verified' | 'persisted';
}

export interface FluidRecord {
  id: string;
  visit_id: string;
  vehicle_id: string;
  plate_number?: string;
  make?: string;
  model?: string;
  customer_name?: string;
  fluid_type: string;
  brand: string;
  product_name?: string;
  viscosity?: string;
  quantity_liters: number;
  filter_part_number?: string;
  filter_replaced: number;
  cost: number;
  price: number;
  service_date: string;
  current_odometer: number;
  next_due_date?: string;
  next_due_km?: number;
  technician_name?: string;
}

export interface Part {
  id: string;
  part_number: string;
  name: string;
  category?: string;
  brand?: string;
  type: string;
  supplier_name?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  storage_location?: string;
  warranty_months: number;
  description?: string;
  image_url?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  visit_id: string;
  customer_id: string;
  vehicle_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_code?: string;
  customer_address?: string;
  plate_number?: string;
  make?: string;
  model?: string;
  labor_total: number;
  parts_total: number;
  fluids_total: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  issue_date: string;
  notes?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  workshop_name?: string;
  commercial_reg?: string;
  tax_number?: string;
}

export interface InvoiceItem {
  id: string;
  item_type: 'labor' | 'part' | 'fluid' | 'fee';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Payment {
  id: string;
  receipt_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  received_by_name?: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  recipient?: string;
  description: string;
  created_by_name?: string;
}

export interface DashboardAlert {
  id: string;
  type: string;
  title: string;
  count: number;
  description: string;
  severity: 'danger' | 'warning' | 'success' | 'info';
  actionLabel: string;
  targetTab: string;
  filter?: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  entity_name: string;
  entity_id: string;
  description: string;
  user_name: string;
  created_at: string;
}

export interface DashboardStats {
  summary?: {
    today_vehicles: number;
    total_in_workshop: number;
    today_collections: number;
    today_invoiced: number;
    attention_count: number;
  };
  pipeline?: {
    received: number;
    inspection: number;
    diagnostics: number;
    repair: number;
    waiting_parts: number;
    testing: number;
    ready: number;
  };
  alerts?: DashboardAlert[];
  financialSnapshot?: {
    today_invoiced: number;
    today_collected: number;
    today_expenses: number;
    today_net: number;
    total_outstanding: number;
    total_invoiced_all: number;
    total_collected_all: number;
    total_expenses_all: number;
  };
  recentActivity?: DashboardActivity[];
  currentVehicles?: any[];
  vehicles: {
    total_in_workshop: number;
    diagnosing_count: number;
    in_repair_count: number;
    waiting_parts_count: number;
    ready_count: number;
    received_count: number;
    maintenance_count?: number;
    today_vehicles_count?: number;
  };
  tasks: {
    tasks_in_progress: number;
    tasks_pending: number;
    tasks_completed: number;
  };
  lowStockAlerts: number;
  financials: {
    total_invoiced: number;
    total_collected: number;
    total_outstanding: number;
    total_expenses: number;
    net_collected_profit: number;
  };
  recentVisits: any[];
}

export interface Supplier {
  id: string;
  workshop_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  phone_secondary?: string;
  email?: string;
  tax_number?: string;
  address?: string;
  category: string;
  payment_terms: string;
  notes?: string;
  invoice_count?: number;
  total_purchases?: number;
  total_paid?: number;
  balance_due?: number;
  last_invoice_date?: string;
  last_payment_date?: string;
  overdue_count?: number;
  account_status?: 'paid' | 'unpaid' | 'overdue';
  created_at: string;
  updated_at: string;
  invoices?: PurchaseInvoice[];
  parts?: any[];
  payments?: SupplierPayment[];
  ledger?: any[];
}

export interface PurchaseInvoiceItem {
  id?: string;
  purchase_invoice_id?: string;
  part_id?: string;
  item_name: string;
  part_number?: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  discount?: number;
  total_cost?: number;
  update_inventory?: number | boolean;
  current_part_number?: string;
  current_stock?: number;
  category?: string;
  is_new_part?: boolean;
  sale_price?: number;
  min_stock_alert?: number;
  storage_location?: string;
}

export interface PurchaseInvoice {
  id: string;
  workshop_id: string;
  invoice_number: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_phone?: string;
  supplier_tax_number?: string;
  supplier_contact?: string;
  supplier_category?: string;
  supplier_address?: string;
  subtotal: number;
  discount_amount?: number;
  tax_percent: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  payment_status: 'paid' | 'partially_paid' | 'unpaid';
  payment_method: string;
  invoice_date: string;
  due_date?: string;
  notes?: string;
  invoice_image_url?: string;
  creator_name?: string;
  items_count?: number;
  items?: PurchaseInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface SupplierPayment {
  id: string;
  workshop_id: string;
  payment_number: string;
  supplier_id: string;
  purchase_invoice_id?: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
  invoice_number?: string;
}

