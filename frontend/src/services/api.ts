import { isStaticOrGithubPages } from './demoData';
import { handleDemoRequest } from './demoHandler';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('workshop_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('workshop_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('workshop_token');
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // If hosted on GitHub Pages or static host without backend, use interactive demo engine
  if (isStaticOrGithubPages()) {
    return handleDemoRequest(endpoint, options) as T;
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';

    let data: any;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // If server returned HTML (like 404 or 502), extract clean message
      throw new Error(`خطأ في الخادم (${res.status}): ${text.replace(/<[^>]*>/g, '').trim().slice(0, 150) || 'استجابة غير صالحة'}`);
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'حدث خطأ في استجابة الخادم');
    }

    return data;
  } catch (err: any) {
    // If backend is not running or network failed, fallback gracefully to interactive local store so UI doesn't crash
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('404'))) {
      console.warn(`[API Fallback] Backend unreachable at ${endpoint}, using interactive local store.`);
      return handleDemoRequest(endpoint, options) as T;
    }
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request<any>('/auth/me'),
  getUsers: (role?: string) => request<any>(`/auth/users${role ? `?role=${role}` : ''}`),
  createUser: (userData: any) =>
    request<any>('/auth/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id: string, userData: any) =>
    request<any>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  deleteUser: (id: string) =>
    request<any>(`/auth/users/${id}`, { method: 'DELETE' }),

  // Workshop Profile & Settings
  getWorkshopProfile: () => request<any>('/workshop'),
  updateWorkshopProfile: (data: any) =>
    request<any>('/workshop', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard & Reports
  getDashboardStats: () => request<any>('/reports/dashboard'),
  getFinancialReport: (params?: { start_date?: string; end_date?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/reports/financial${q ? `?${q}` : ''}`);
  },
  getMechanicsProductivity: () => request<any>('/reports/mechanics-productivity'),

  // Customers
  getCustomers: (search?: string) =>
    request<any>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomerById: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (data: any) =>
    request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) =>
    request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) =>
    request<any>(`/customers/${id}`, { method: 'DELETE' }),

  // Vehicles & Full Timeline
  getVehicles: (search?: string, ownerId?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (ownerId) params.append('owner_id', ownerId);
    const q = params.toString();
    return request<any>(`/vehicles${q ? `?${q}` : ''}`);
  },
  getVehicleById: (id: string) => request<any>(`/vehicles/${id}`),
  getVehicleTimeline: (id: string) => request<any>(`/vehicles/${id}/timeline`),
  createVehicle: (data: any) =>
    request<any>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (id: string, data: any) =>
    request<any>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  transferOwnership: (id: string, data: any) =>
    request<any>(`/vehicles/${id}/transfer-ownership`, { method: 'POST', body: JSON.stringify(data) }),
  deleteVehicle: (id: string) =>
    request<any>(`/vehicles/${id}`, { method: 'DELETE' }),

  // Visits
  getVisits: (status?: string, vehicleId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (vehicleId) params.append('vehicle_id', vehicleId);
    const q = params.toString();
    return request<any>(`/visits${q ? `?${q}` : ''}`);
  },
  getVisitById: (id: string) => request<any>(`/visits/${id}`),
  createVisit: (data: any) =>
    request<any>('/visits', { method: 'POST', body: JSON.stringify(data) }),
  updateVisitStatus: (id: string, status: string, notes?: string, odometer_out?: number | string) =>
    request<any>(`/visits/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes, odometer_out }) }),
  getVisitWhatsAppReady: (id: string) =>
    request<any>(`/visits/${id}/whatsapp-ready`),
  deleteVisit: (id: string) =>
    request<any>(`/visits/${id}`, { method: 'DELETE' }),

  // Work Orders & Tasks
  getWorkOrders: (status?: string, mechanicId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (mechanicId) params.append('mechanic_id', mechanicId);
    const q = params.toString();
    return request<any>(`/work-orders${q ? `?${q}` : ''}`);
  },
  getWorkOrderById: (id: string) => request<any>(`/work-orders/${id}`),
  createWorkOrder: (data: any) =>
    request<any>('/work-orders', { method: 'POST', body: JSON.stringify(data) }),
  addTask: (data: any) =>
    request<any>('/work-orders/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId: string, data: any) =>
    request<any>(`/work-orders/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (taskId: string) =>
    request<any>(`/work-orders/tasks/${taskId}`, { method: 'DELETE' }),
  updateTaskStatus: (taskId: string, status: string, notes?: string, hours_worked?: number) =>
    request<any>(`/work-orders/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes, hours_worked }) }),
  consumePart: (data: any) =>
    request<any>('/work-orders/tasks/consume-part', { method: 'POST', body: JSON.stringify(data) }),
  removeUsedPart: (usedPartId: string) =>
    request<any>(`/work-orders/used-parts/${usedPartId}`, { method: 'DELETE' }),
  quickAddVisitItem: (data: any) =>
    request<any>('/work-orders/quick-item', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorkOrder: (id: string) =>
    request<any>(`/work-orders/${id}`, { method: 'DELETE' }),

  // Diagnostics & DTC
  getDiagnostics: (vehicleId?: string) =>
    request<any>(`/diagnostics${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
  getDiagnosticById: (id: string) => request<any>(`/diagnostics/${id}`),
  createDiagnostic: (data: any) =>
    request<any>('/diagnostics', { method: 'POST', body: JSON.stringify(data) }),
  getDtcHistory: (code: string, vehicleId?: string) =>
    request<any>(`/diagnostics/code-history/${encodeURIComponent(code)}${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),

  // Fluids
  getFluids: (vehicleId?: string) =>
    request<any>(`/fluids${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
  getUpcomingMaintenance: () => request<any>('/fluids/upcoming'),
  createFluidRecord: (data: any) =>
    request<any>('/fluids', { method: 'POST', body: JSON.stringify(data) }),

  // Parts & Inventory
  getParts: (search?: string, lowStock?: boolean, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (lowStock) params.append('low_stock', 'true');
    if (category) params.append('category', category);
    const q = params.toString();
    return request<any>(`/parts${q ? `?${q}` : ''}`);
  },
  generatePartCode: (category?: string) =>
    request<any>(`/parts/generate-code${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  getPartById: (id: string) => request<any>(`/parts/${id}`),
  createPart: (data: any) =>
    request<any>('/parts', { method: 'POST', body: JSON.stringify(data) }),
  updatePart: (id: string, data: any) =>
    request<any>(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordStockMovement: (data: any) =>
    request<any>('/parts/movements', { method: 'POST', body: JSON.stringify(data) }),
  scanBarcode: (data: {
    barcode: string;
    action: 'dispense' | 'receive';
    quantity?: number;
    notes?: string;
    customer_id?: string;
    customer_name?: string;
    work_order_id?: string;
  }) =>
    request<any>('/parts/barcode-scan', { method: 'POST', body: JSON.stringify(data) }),
  getStockMovementsReport: (params?: {
    search?: string;
    movement_type?: string;
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    part_id?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.movement_type) sp.append('movement_type', params.movement_type);
    if (params?.customer_id) sp.append('customer_id', params.customer_id);
    if (params?.start_date) sp.append('start_date', params.start_date);
    if (params?.end_date) sp.append('end_date', params.end_date);
    if (params?.part_id) sp.append('part_id', params.part_id);
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString();
    return request<any>(`/parts/movements/report${q ? `?${q}` : ''}`);
  },
  deletePart: (id: string) =>
    request<any>(`/parts/${id}`, { method: 'DELETE' }),

  // Invoices & Payments
  getInvoices: (status?: string, customerId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (customerId) params.append('customer_id', customerId);
    const q = params.toString();
    return request<any>(`/invoices${q ? `?${q}` : ''}`);
  },
  getInvoiceById: (id: string) => request<any>(`/invoices/${id}`),
  createInvoice: (data: any) =>
    request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  registerPayment: (data: any) =>
    request<any>('/invoices/payments', { method: 'POST', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) =>
    request<any>(`/invoices/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (category?: string) =>
    request<any>(`/invoices/expenses/list${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  createExpense: (data: any) =>
    request<any>('/invoices/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) =>
    request<any>(`/invoices/expenses/${id}`, { method: 'DELETE' }),

  // Attachments (Upload files / photos)
  uploadAttachment: (formData: FormData) =>
    request<any>('/attachments/upload', { method: 'POST', body: formData }),
  getAttachments: (vehicleId?: string, visitId?: string) => {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicle_id', vehicleId);
    if (visitId) params.append('visit_id', visitId);
    const q = params.toString();
    return request<any>(`/attachments${q ? `?${q}` : ''}`);
  },

  // Backups & System Reset
  createBackup: () => `${API_BASE}/backup/create`,
  listBackups: () => request<any>('/backup/list'),
  resetDemoData: () => request<any>('/backup/reset-data', { method: 'POST' }),

  // Suppliers & Purchases (الموردين والمشتريات)
  getSuppliers: (params?: { search?: string; category?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString();
    return request<any>(`/purchases/suppliers${qs ? `?${qs}` : ''}`);
  },
  getSupplierById: (id: string) => request<any>(`/purchases/suppliers/${id}`),
  getSupplierPayments: (id: string) => request<any>(`/purchases/suppliers/${id}/payments`),
  getSupplierLedger: (id: string) => request<any>(`/purchases/suppliers/${id}/ledger`),
  createSupplier: (data: any) => request<any>('/purchases/suppliers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateSupplier: (id: string, data: any) => request<any>(`/purchases/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteSupplier: (id: string) => request<any>(`/purchases/suppliers/${id}`, {
    method: 'DELETE'
  }),
  paySupplierBalance: (id: string, data: { amount: number; payment_method?: string; notes?: string }) => request<any>(`/purchases/suppliers/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Purchase Invoices
  getPurchaseInvoices: (params?: { search?: string; status?: string; supplier_id?: string; supplier?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.supplier_id) q.append('supplier_id', params.supplier_id);
    if (params?.supplier) q.append('supplier', params.supplier);
    const qs = q.toString();
    return request<any>(`/purchases${qs ? `?${qs}` : ''}`);
  },
  getPurchaseInvoiceById: (id: string) => request<any>(`/purchases/${id}`),
  createPurchaseInvoice: (data: any) => request<any>('/purchases', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePurchaseInvoice: (id: string, data: any) => request<any>(`/purchases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  recordSupplierPayment: (invoiceId: string, data: { amount: number; payment_method?: string; notes?: string }) => request<any>(`/purchases/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deletePurchaseInvoice: (id: string) => request<any>(`/purchases/${id}`, {
    method: 'DELETE'
  }),

  // Global Unified Search (بحث موحد في العملاء والسيارات والأعطال وأوامر الشغل والفحص)
  globalSearch: (query: string) =>
    request<{
      success: boolean;
      data: {
        customers: any[];
        vehicles: any[];
        visits: any[];
        workOrders: any[];
        diagnosticCodes: any[];
        totalResults: number;
      };
    }>(`/search?q=${encodeURIComponent(query)}`)
};

