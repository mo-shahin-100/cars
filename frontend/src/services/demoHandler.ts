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
    return {
      success: true,
      data: {
        active_visits_count: db.visits.length,
        today_completed_count: 3,
        total_monthly_revenue: 48500,
        pending_invoices_count: 2,
        low_stock_count: db.inventory.filter((i) => i.quantity <= i.min_quantity).length,
        revenue_today: 3200,
        technicians_working: 3
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
