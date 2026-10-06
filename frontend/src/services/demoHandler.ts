import { getDemoDb, saveDemoDb } from './demoData';

export function handleDemoRequest(endpoint: string, options: RequestInit = {}): any {
  const method = (options.method || 'GET').toUpperCase();
  const db = getDemoDb();
  let body: any = {};
  if (options.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      // ignore
    }
  }

  // 1. Auth
  if (endpoint.startsWith('/auth/login')) {
    const user = db.users.find((u) => u.username === body.username) || db.users[0];
    return {
      success: true,
      data: {
        token: `demo-token-${user.id}`,
        user
      }
    };
  }

  if (endpoint.startsWith('/auth/me')) {
    const token = localStorage.getItem('workshop_token') || '';
    const userId = token.replace('demo-token-', '');
    const user = db.users.find((u) => u.id === userId) || db.users[0];
    return { success: true, data: user };
  }

  if (endpoint.startsWith('/auth/users')) {
    if (method === 'POST') {
      const newUser = { id: `u_${Date.now()}`, ...body, permissions: body.permissions || [] };
      db.users.push(newUser);
      saveDemoDb(db);
      return { success: true, data: newUser };
    }
    return { success: true, data: db.users };
  }

  // 2. Workshop Profile
  if (endpoint.startsWith('/workshop')) {
    if (method === 'PUT') {
      db.workshop = { ...db.workshop, ...body };
      saveDemoDb(db);
      return { success: true, data: db.workshop };
    }
    return { success: true, data: db.workshop };
  }

  // 3. Customers
  if (endpoint.startsWith('/customers')) {
    if (method === 'POST') {
      const newCust = { id: `c_${Date.now()}`, ...body, total_vehicles: 0, balance: 0 };
      db.customers.unshift(newCust);
      saveDemoDb(db);
      return { success: true, data: newCust };
    }
    if (method === 'PUT') {
      const id = endpoint.split('/')[2];
      db.customers = db.customers.map((c) => (c.id === id ? { ...c, ...body } : c));
      saveDemoDb(db);
      return { success: true, data: body };
    }
    if (method === 'DELETE') {
      const id = endpoint.split('/')[2];
      db.customers = db.customers.filter((c) => c.id !== id);
      saveDemoDb(db);
      return { success: true };
    }
    return { success: true, data: db.customers };
  }

  // 4. Vehicles
  if (endpoint.startsWith('/vehicles')) {
    if (method === 'POST') {
      const newVeh = { id: `v_${Date.now()}`, ...body };
      db.vehicles.unshift(newVeh);
      saveDemoDb(db);
      return { success: true, data: newVeh };
    }
    if (method === 'PUT') {
      const id = endpoint.split('/')[2];
      db.vehicles = db.vehicles.map((v) => (v.id === id ? { ...v, ...body } : v));
      saveDemoDb(db);
      return { success: true, data: body };
    }
    if (method === 'DELETE') {
      const id = endpoint.split('/')[2];
      db.vehicles = db.vehicles.filter((v) => v.id !== id);
      saveDemoDb(db);
      return { success: true };
    }
    return { success: true, data: db.vehicles };
  }

  // 5. Visits
  if (endpoint.startsWith('/visits')) {
    if (method === 'POST') {
      const newVisit = {
        id: `vis_${Date.now()}`,
        status: 'in_progress',
        entry_time: new Date().toISOString(),
        ...body
      };
      db.visits.unshift(newVisit);
      saveDemoDb(db);
      return { success: true, data: newVisit };
    }
    return { success: true, data: db.visits };
  }

  // 6. Work Orders
  if (endpoint.startsWith('/work-orders')) {
    if (endpoint.includes('/tasks/consume-part')) {
      return { success: true, message: 'Part consumed' };
    }
    return { success: true, data: db.workOrders };
  }

  // 7. Inventory
  if (endpoint.startsWith('/inventory')) {
    if (endpoint.includes('/logs')) {
      return { success: true, data: db.inventoryLogs || [] };
    }
    if (method === 'POST') {
      const newItem = { id: `inv_${Date.now()}`, ...body };
      db.inventory.unshift(newItem);
      saveDemoDb(db);
      return { success: true, data: newItem };
    }
    if (method === 'PUT') {
      const id = endpoint.split('/')[2];
      db.inventory = db.inventory.map((item) => (item.id === id ? { ...item, ...body } : item));
      saveDemoDb(db);
      return { success: true, data: body };
    }
    if (method === 'DELETE') {
      const id = endpoint.split('/')[2];
      db.inventory = db.inventory.filter((item) => item.id !== id);
      saveDemoDb(db);
      return { success: true };
    }
    return { success: true, data: db.inventory };
  }

  // 8. Purchases & Suppliers
  if (endpoint.startsWith('/purchases')) {
    if (endpoint.includes('/suppliers')) {
      if (method === 'POST') {
        const newSup = { id: `sup_${Date.now()}`, balance: 0, total_invoices: 0, ...body };
        db.suppliers.unshift(newSup);
        saveDemoDb(db);
        return { success: true, data: newSup };
      }
      return { success: true, data: db.suppliers };
    }

    if (method === 'POST') {
      const newPur = {
        id: `pur_${Date.now()}`,
        created_at: new Date().toISOString(),
        ...body
      };
      db.purchases.unshift(newPur);
      saveDemoDb(db);
      return { success: true, data: newPur };
    }
    return { success: true, data: db.purchases };
  }

  // 9. Expenses
  if (endpoint.startsWith('/expenses')) {
    if (method === 'POST') {
      const newExp = { id: `exp_${Date.now()}`, ...body };
      db.expenses.unshift(newExp);
      saveDemoDb(db);
      return { success: true, data: newExp };
    }
    return { success: true, data: db.expenses };
  }

  // 10. Reports / Dashboard
  if (endpoint.startsWith('/reports/dashboard')) {
    const visits = [
      {
        id: 'vis1',
        visit_number: 'V-00001',
        status: 'in_repair',
        entry_datetime: '2026-10-06T09:15:00Z',
        customer_complaint: 'صيانة دورية وتغيير زيت وفحص عفشة',
        vehicle_id: 'v1',
        plate_number: 'أ ب ج 1 2 3',
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        customer_name: 'أحمد محمود رضوان',
        customer_phone: '01012345678',
        work_order_id: 'wo1',
        work_order_desc: 'صيانة دورية شاملة 60,000 كم وفحص العفشة',
        total_cost: 2150,
        tasks: [
          { id: 't1', title: 'تغيير زيت المحرك والفلتر وفحص السيور', price: 200, status: 'completed', mechanic_name: 'الأسطى أحمد' },
          { id: 't2', title: 'فحص دورة الفرامل وتغيير الفحمات وتجربة الطريق', price: 250, status: 'in_progress', mechanic_name: 'الأسطى أحمد' }
        ],
        usedParts: [
          { id: 'up1', part_name: 'زيت محرك موبيل وان 5W-30 (4 لتر)', quantity: 1, unit_price: 1350, total_price: 1350 },
          { id: 'up2', part_name: 'فلتر زيت تويوتا أصلي', quantity: 1, unit_price: 350, total_price: 350 }
        ]
      },
      {
        id: 'vis2',
        visit_number: 'V-00002',
        status: 'ready',
        entry_datetime: '2026-10-05T14:30:00Z',
        customer_complaint: 'صوت خشونة بالفرامل وفحص كمبيوتر للمحرك',
        vehicle_id: 'v2',
        plate_number: 'س ص ع 4 5 6',
        make: 'Hyundai',
        model: 'Tucson',
        year: 2022,
        customer_name: 'خالد عبد الله المنشاوي',
        customer_phone: '01123456789',
        work_order_id: 'wo2',
        work_order_desc: 'فحص كمبيوتر وتغيير فحمات فرامل أمامية أصلية',
        invoice_id: 'inv_ready_01',
        invoice_number: 'INV-2026-088',
        invoice_total: 1650,
        total_cost: 1650,
        tasks: [
          { id: 't3', title: 'فحص كمبيوتر مسح أعطال DTC', price: 250, status: 'completed', mechanic_name: 'م. محمود' },
          { id: 't4', title: 'خرط طنابير وتركيب فحمات فرامل وضبط ABS', price: 400, status: 'completed', mechanic_name: 'الأسطى أحمد' }
        ],
        usedParts: [
          { id: 'up3', part_name: 'طقم تيل فرامل بريمبو سيراميك', quantity: 1, unit_price: 1000, total_price: 1000 }
        ]
      },
      {
        id: 'vis3',
        visit_number: 'V-00003',
        status: 'diagnosing',
        entry_datetime: '2026-10-06T10:20:00Z',
        customer_complaint: 'عمرة موتور - تقطيع وضعف عزم وظهور لمبة المحرك Check Engine',
        vehicle_id: 'v3',
        plate_number: 'ط ك ل 7 8 9',
        make: 'Mercedes-Benz',
        model: 'C200',
        year: 2020,
        customer_name: 'م. مصطفى الشريف',
        customer_phone: '01234567890',
        work_order_id: 'wo3',
        work_order_desc: 'فحص ضغط البساتم واختبار تسريب الصبابات وتغيير بوجيهات',
        total_cost: 3800,
        tasks: [
          { id: 't5', title: 'تشخيص كمبيوتر متقدم واختبار حساسات الوقود', price: 400, status: 'in_progress', mechanic_name: 'م. محمود' },
          { id: 't6', title: 'فك وفحص البوجيهات والكويلات وكشف ضغط السلندر', price: 600, status: 'in_progress', mechanic_name: 'الأسطى أحمد' }
        ],
        usedParts: [
          { id: 'up4', part_name: 'طقم بوجيهات إيريديوم NGK ليزر أصلي (4 شمعات)', quantity: 1, unit_price: 1400, total_price: 1400 },
          { id: 'up5', part_name: 'سائل تنظيف دورة الوقود والبخاخات Liqui Moly', quantity: 1, unit_price: 400, total_price: 400 }
        ]
      }
    ];

    return {
      success: true,
      data: {
        vehicles: {
          total_in_workshop: 3,
          in_repair_count: 1,
          diagnosing_count: 1,
          waiting_parts_count: 0,
          ready_count: 1,
          received_count: 0
        },
        financials: {
          total_invoiced: 48500,
          total_collected: 36200,
          total_outstanding: 12300,
          total_expenses: 1800,
          net_collected_profit: 34400
        },
        tasks: {
          tasks_in_progress: 3,
          tasks_pending: 1,
          tasks_completed: 6
        },
        lowStockAlerts: 1,
        recentVisits: visits
      }
    };
  }

  // 11. Notifications
  if (endpoint.startsWith('/notifications')) {
    return { success: true, data: db.notifications };
  }

  // Default fallback for any other GET/POST endpoint
  return { success: true, data: [] };
}
