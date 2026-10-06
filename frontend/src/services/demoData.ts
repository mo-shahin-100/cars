// Interactive Mock Database for GitHub Pages & Offline Preview
// Allows the live link to be 100% interactive without needing a running backend

export interface DemoDatabase {
  users: any[];
  workshop: any;
  customers: any[];
  vehicles: any[];
  visits: any[];
  workOrders: any[];
  tasks: any[];
  inventory: any[];
  suppliers: any[];
  purchases: any[];
  expenses: any[];
  notifications: any[];
  inventoryLogs: any[];
}

const STORAGE_KEY = 'workshop_demo_db_v1';

export const initialDemoData: DemoDatabase = {
  users: [
    { id: '1', username: 'admin', full_name: 'م. محمد عاطف', role: 'owner', permissions: ['all'] },
    { id: '2', username: 'manager', full_name: 'أ. طارق عبد العزيز', role: 'manager', permissions: ['all'] },
    { id: '3', username: 'reception', full_name: 'سارة إبراهيم', role: 'reception', permissions: ['visits', 'customers', 'vehicles'] },
    { id: '4', username: 'ahmed', full_name: 'الأسطى أحمد - محركات', role: 'mechanic', permissions: ['work_orders'] },
    { id: '5', username: 'mahmoud', full_name: 'م. محمود - فحص وكهرباء', role: 'mechanic', permissions: ['work_orders', 'diagnostics'] },
    { id: '6', username: 'accountant', full_name: 'أ. حسام فؤاد', role: 'accountant', permissions: ['invoices', 'purchases', 'expenses', 'reports'] }
  ],
  workshop: {
    name: 'مركز العالمية لصيانة وهندسة السيارات',
    phone: '01001234567',
    address: 'القاهرة - التجمع الخامس - المنطقة الصناعية',
    tax_number: '123-456-789',
    cr_number: '98765',
    logo_url: ''
  },
  customers: [
    { id: 'c1', name: 'أحمد محمود رضوان', phone: '01012345678', email: 'ahmed.m@example.com', total_vehicles: 1, balance: 0, notes: 'عميل VIP مهتم بالصيانة الدورية' },
    { id: 'c2', name: 'خالد عبد الله المنشاوي', phone: '01123456789', email: 'khaled@example.com', total_vehicles: 2, balance: 350, notes: 'متبقي حساب صيانة سابقة' },
    { id: 'c3', name: 'م. مصطفى الشريف', phone: '01234567890', email: 'mostafa@example.com', total_vehicles: 1, balance: 0, notes: 'سيارة هيونداي توسان' }
  ],
  vehicles: [
    { id: 'v1', customer_id: 'c1', plate_number: 'أ ب ج 1 2 3', make: 'Toyota', model: 'Corolla', year: 2021, vin: 'JTDBU4EE3M9012345', mileage: 65400, color: 'فضي', fuel_type: 'بنزين' },
    { id: 'v2', customer_id: 'c2', plate_number: 'س ص ع 4 5 6', make: 'Hyundai', model: 'Tucson', year: 2022, vin: 'KMHJT81DBNU543210', mileage: 42000, color: 'أسود', fuel_type: 'بنزين' },
    { id: 'v3', customer_id: 'c3', plate_number: 'ط ك ل 7 8 9', make: 'Mercedes-Benz', model: 'C200', year: 2020, vin: 'WDD2050421R987654', mileage: 78000, color: 'أبيض لؤلؤي', fuel_type: 'بنزين' }
  ],
  inventory: [
    { id: 'inv1', item_code: 'OIL-5W30-SYN', name: 'زيت محرك موبيل وان 5W-30 تخليقي بالكامل', category: 'fluids', quantity: 24, min_quantity: 10, cost_price: 1350, sell_price: 1750, unit: 'قطعة', barcode: '622100100201' },
    { id: 'inv2', item_code: 'FLT-OIL-TY01', name: 'فلتر زيت تويوتا كورولا ياباني أصلي', category: 'filters', quantity: 18, min_quantity: 5, cost_price: 280, sell_price: 420, unit: 'قطعة', barcode: '622100100202' },
    { id: 'inv3', item_code: 'BRK-PAD-TY01', name: 'تيل فرامل أمامي تويوتا كورولا', category: 'brakes', quantity: 8, min_quantity: 4, cost_price: 850, sell_price: 1250, unit: 'طقم', barcode: '622100100203' },
    { id: 'inv4', item_code: 'SPK-PLUG-NGK', name: 'طقم بوجيهات إيريديوم NGK ليزر', category: 'ignition', quantity: 12, min_quantity: 4, cost_price: 950, sell_price: 1400, unit: 'طقم', barcode: '622100100204' },
    { id: 'inv5', item_code: 'OIL-TRANS-ATF', name: 'زيت ناقل حركة أوتوماتيك ATF WS', category: 'fluids', quantity: 15, min_quantity: 6, cost_price: 650, sell_price: 900, unit: 'قطعة', barcode: '622100100205' }
  ],
  suppliers: [
    { id: 'sup1', name: 'الشركة الهندسية للتوريدات وقطع الغيار', contact_person: 'م. إبراهيم الجمال', phone: '01099887766', email: 'eng.supplies@example.com', address: 'التوفيقية - القاهرة', balance: 0, total_invoices: 3 },
    { id: 'sup2', name: 'مؤسسة الأهرام للزيوت وفلاتر السيارات', contact_person: 'أ. حسام الباز', phone: '01155443322', email: 'ahram.oils@example.com', address: 'شبرا - القاهرة', balance: 3500, total_invoices: 2 }
  ],
  purchases: [
    {
      id: 'pur1',
      invoice_number: 'PUR-2026-001',
      supplier_id: 'sup1',
      supplier_name: 'الشركة الهندسية للتوريدات وقطع الغيار',
      supplier_phone: '01099887766',
      invoice_date: '2026-10-02',
      items_count: 2,
      subtotal: 10000,
      tax_amount: 1500,
      grand_total: 11500,
      paid_amount: 11500,
      balance_due: 0,
      payment_status: 'paid',
      notes: 'شحنة زيوت وتيل فرامل - مسددة بالكامل بشيك',
      items: [
        { item_code: 'OIL-5W30-SYN', item_name: 'زيت محرك موبيل وان 5W-30', quantity: 10, unit_price: 1350, total_price: 13500 }
      ]
    },
    {
      id: 'pur2',
      invoice_number: 'PUR-2026-002',
      supplier_id: 'sup2',
      supplier_name: 'مؤسسة الأهرام للزيوت وفلاتر السيارات',
      supplier_phone: '01155443322',
      invoice_date: '2026-10-04',
      items_count: 1,
      subtotal: 5000,
      tax_amount: 750,
      grand_total: 5750,
      paid_amount: 2250,
      balance_due: 3500,
      payment_status: 'partial',
      notes: 'دفعة توريد فلاتر - متبقي 3500 ج.م مستحق نهاية الشهر',
      items: [
        { item_code: 'FLT-OIL-TY01', item_name: 'فلاتر زيت ياباني', quantity: 20, unit_price: 250, total_price: 5000 }
      ]
    },
    {
      id: 'pur3',
      invoice_number: 'PUR-2026-003',
      supplier_id: 'sup1',
      supplier_name: 'الشركة الهندسية للتوريدات وقطع الغيار',
      supplier_phone: '01099887766',
      invoice_date: '2026-09-25',
      items_count: 3,
      subtotal: 8200,
      tax_amount: 1230,
      grand_total: 9430,
      paid_amount: 9430,
      balance_due: 0,
      payment_status: 'paid',
      notes: 'بوجيهات وفلاتر هواء لشهر سبتمبر',
      items: [
        { item_code: 'SPK-PLUG-NGK', item_name: 'طقم بوجيهات NGK', quantity: 6, unit_price: 950, total_price: 5700 }
      ]
    }
  ],
  visits: [
    {
      id: 'vis1',
      customer_id: 'c1',
      customer_name: 'أحمد محمود رضوان',
      customer_phone: '01012345678',
      vehicle_id: 'v1',
      vehicle_plate: 'أ ب ج 1 2 3',
      vehicle_name: 'Toyota Corolla 2021',
      status: 'in_progress',
      odometer_in: 65400,
      entry_time: '2026-10-06T08:30:00Z',
      reason_for_visit: 'صيانة دورية 60 ألف وتغيير زيت وفلاتر وفحص الفرامل',
      assigned_mechanic: 'الأسطى أحمد - محركات'
    }
  ],
  workOrders: [
    {
      id: 'wo1',
      visit_id: 'vis1',
      vehicle_plate: 'أ ب ج 1 2 3',
      status: 'in_progress',
      total_amount: 2350,
      created_at: '2026-10-06T08:45:00Z'
    }
  ],
  tasks: [
    { id: 't1', work_order_id: 'wo1', title: 'تغيير زيت المحرك والفلتر', mechanic: 'الأسطى أحمد', status: 'completed', labor_cost: 200 },
    { id: 't2', work_order_id: 'wo1', title: 'فحص دورة الفرامل وتيل الفرامل', mechanic: 'الأسطى أحمد', status: 'in_progress', labor_cost: 150 }
  ],
  expenses: [
    { id: 'exp1', category: 'utilities', description: 'فاتورة كهرباء الورشة لشهر سبتمبر', amount: 1450, expense_date: '2026-10-01', payment_method: 'cash' },
    { id: 'exp2', category: 'supplies', description: 'أدوات نظافة ومهمات ورشة', amount: 350, expense_date: '2026-10-03', payment_method: 'cash' }
  ],
  notifications: [
    { id: 'notif1', title: 'مشتريات جديدة', message: 'تم تسجيل فاتورة مشتريات رقم PUR-2026-002 بنجاح', created_at: '2026-10-04T11:00:00Z', is_read: true },
    { id: 'notif2', title: 'نقص مخزون', message: 'تيل فرامل تويوتا وصل للحد الأدنى (8 قطع)', created_at: '2026-10-05T14:30:00Z', is_read: false }
  ],
  inventoryLogs: [
    { id: 'log1', item_name: 'زيت محرك موبيل وان 5W-30', change_type: 'purchase_in', quantity_change: 10, remaining_quantity: 24, created_at: '2026-10-02T10:00:00Z', actor_name: 'أمين المخزن', reason: 'فاتورة توريد PUR-2026-001' },
    { id: 'log2', item_name: 'فلتر زيت تويوتا كورولا', change_type: 'purchase_in', quantity_change: 20, remaining_quantity: 18, created_at: '2026-10-04T11:00:00Z', actor_name: 'أمين المخزن', reason: 'فاتورة توريد PUR-2026-002' }
  ]
};

export function getDemoDb(): DemoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDemoData));
      return initialDemoData;
    }
    return JSON.parse(raw);
  } catch {
    return initialDemoData;
  }
}

export function saveDemoDb(db: DemoDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save demo db:', err);
  }
}

export function isStaticOrGithubPages(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.includes('pages.dev') ||
    window.location.search.includes('demo=true')
  );
}
