import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

let supabase = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    isSupabaseConfigured = true;
    console.log('[Database] Supabase PostgreSQL client initialized with provided credentials.');
  } catch (err) {
    console.error('[Database] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[Database] Running with PostgreSQL local mirror store. Set SUPABASE_URL and SUPABASE_ANON_KEY in settings to sync directly with Supabase.');
}

// Initial in-memory seed data representing the pharmacy database schema
const localStore = {
  pharmacyInfo: {
    id: 1,
    name: 'PharmaCare',
    address: 'Madurai, Tamil Nadu',
    phone: '+91 9876543210',
    email: 'pharmacare@example.com',
    updated_at: new Date().toISOString()
  },
  medicines: [
    { id: 'MED001', name: 'Paracetamol', category: 'Tablet', stock: 120, price: 25.00, expiry_date: 'Dec 2027', batch_no: 'PCM-2024-01', manufacturer: 'GSK Health', status: 'Available' },
    { id: 'MED002', name: 'Amoxicillin', category: 'Capsule', stock: 18, price: 85.00, expiry_date: 'Oct 2026', batch_no: 'AMX-1024', manufacturer: 'Sun Pharma', status: 'Low Stock' },
    { id: 'MED003', name: 'Cetirizine', category: 'Tablet', stock: 6, price: 30.00, expiry_date: 'Oct 2026', batch_no: 'CTZ-2054', manufacturer: 'Cipla Ltd', status: 'Low Stock' },
    { id: 'MED004', name: 'Azithromycin', category: 'Tablet', stock: 45, price: 120.00, expiry_date: 'Nov 2026', batch_no: 'AZT-3055', manufacturer: 'Pfizer', status: 'Available' },
    { id: 'MED005', name: 'Metformin', category: 'Tablet', stock: 95, price: 45.00, expiry_date: 'Jan 2028', batch_no: 'MET-4091', manufacturer: 'Dr. Reddy', status: 'Available' },
    { id: 'MED006', name: 'Omeprazole', category: 'Capsule', stock: 60, price: 55.00, expiry_date: 'Sep 2027', batch_no: 'OMP-5022', manufacturer: 'Zydus', status: 'Available' },
    { id: 'MED007', name: 'Ibuprofen', category: 'Tablet', stock: 8, price: 35.00, expiry_date: 'Oct 2026', batch_no: 'IBU-6019', manufacturer: 'Abbott', status: 'Low Stock' }
  ],
  customers: [
    { id: 'CUS001', name: 'Arun Kumar', address: 'Madurai', phone: '+91 9845123456', email: 'arun.k@example.com', purchase_count: 12, total_purchase: 8450.00, last_purchase: '28 Aug 2026', status: 'Active' },
    { id: 'CUS002', name: 'Priya Devi', address: 'Chennai', phone: '+91 9789123456', email: 'priya.d@example.com', purchase_count: 8, total_purchase: 5720.00, last_purchase: '25 Aug 2026', status: 'Active' },
    { id: 'CUS003', name: 'Rahul S', address: 'Coimbatore', phone: '+91 9443123456', email: 'rahul.s@example.com', purchase_count: 5, total_purchase: 3250.00, last_purchase: '21 Aug 2026', status: 'Active' },
    { id: 'CUS004', name: 'Meena R', address: 'Trichy', phone: '+91 9942123456', email: 'meena.r@example.com', purchase_count: 3, total_purchase: 1890.00, last_purchase: '15 Aug 2026', status: 'Inactive' },
    { id: 'CUS005', name: 'Suresh K', address: 'Salem', phone: '+91 9841234567', email: 'suresh.k@example.com', purchase_count: 7, total_purchase: 4500.00, last_purchase: '01 Sep 2026', status: 'Active' }
  ],
  purchases: [
    { id: 'PUR001', customer_id: 'CUS001', customer_name: 'Arun Kumar', medicine: 'Paracetamol', medicine_id: 'MED001', quantity: 5, amount: 125.00, date: '28 Aug 2026' },
    { id: 'PUR002', customer_id: 'CUS002', customer_name: 'Priya Devi', medicine: 'Amoxicillin', medicine_id: 'MED002', quantity: 2, amount: 170.00, date: '27 Aug 2026' },
    { id: 'PUR003', customer_id: 'CUS003', customer_name: 'Rahul S', medicine: 'Cetirizine', medicine_id: 'MED003', quantity: 3, amount: 90.00, date: '26 Aug 2026' },
    { id: 'PUR004', customer_id: 'CUS001', customer_name: 'Arun Kumar', medicine: 'Azithromycin', medicine_id: 'MED004', quantity: 2, amount: 240.00, date: '25 Aug 2026' }
  ],
  sales: [
    { id: 'BILL001', customer_name: 'Arun Kumar', customer_id: 'CUS001', items_count: 3, amount: 450.00, payment_method: 'Cash', status: 'Paid', date: '02 Sep 2026' },
    { id: 'BILL002', customer_name: 'Priya Devi', customer_id: 'CUS002', items_count: 2, amount: 320.00, payment_method: 'UPI', status: 'Paid', date: '02 Sep 2026' },
    { id: 'BILL003', customer_name: 'Walk-in Customer', customer_id: null, items_count: 1, amount: 85.00, payment_method: 'Card', status: 'Paid', date: '01 Sep 2026' }
  ]
};

function calculateMedicineStatus(stock, expiryDateStr) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 10) return 'Low Stock';
  return 'Available';
}

export const db = {
  getMode() {
    return {
      connected: isSupabaseConfigured,
      type: isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Local Mirror (Awaiting SUPABASE_URL)',
      urlConfigured: Boolean(SUPABASE_URL),
    };
  },

  // 1. Pharmacy Information
  async getPharmacyInfo() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('pharmacy_info').select('*').limit(1).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Database] Supabase query fallback to local store for pharmacyInfo:', e.message);
      }
    }
    return localStore.pharmacyInfo;
  },

  async updatePharmacyInfo(payload) {
    const updated = {
      ...localStore.pharmacyInfo,
      ...payload,
      id: 1,
      updated_at: new Date().toISOString()
    };
    localStore.pharmacyInfo = updated;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('pharmacy_info').upsert(updated).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Database] Supabase upsert error:', e.message);
      }
    }
    return updated;
  },

  // 2. Medicines
  async getMedicines() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('medicines').select('*').order('id', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[Database] Supabase getMedicines fallback:', e.message);
      }
    }
    return localStore.medicines;
  },

  async getMedicineById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('medicines').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Database] Supabase getMedicineById error:', e.message);
      }
    }
    return localStore.medicines.find(m => m.id === id) || null;
  },

  async createMedicine(data) {
    const newId = data.id || `MED${String(localStore.medicines.length + 1).padStart(3, '0')}`;
    const status = calculateMedicineStatus(Number(data.stock || 0), data.expiry_date);
    const medicine = {
      id: newId,
      name: data.name,
      category: data.category || 'Tablet',
      stock: Number(data.stock || 0),
      price: Number(data.price || 0),
      expiry_date: data.expiry_date || 'Dec 2027',
      batch_no: data.batch_no || '',
      manufacturer: data.manufacturer || '',
      status: data.status || status,
    };

    localStore.medicines.push(medicine);

    if (isSupabaseConfigured) {
      try {
        const { data: inserted, error } = await supabase.from('medicines').insert(medicine).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {
        console.warn('[Database] Supabase insert medicine error:', e.message);
      }
    }
    return medicine;
  },

  async updateMedicine(id, data) {
    const idx = localStore.medicines.findIndex(m => m.id === id);
    if (idx !== -1) {
      const current = localStore.medicines[idx];
      const stock = data.stock !== undefined ? Number(data.stock) : current.stock;
      const status = calculateMedicineStatus(stock, data.expiry_date || current.expiry_date);
      const updated = {
        ...current,
        ...data,
        id,
        stock,
        status: data.status || status
      };
      localStore.medicines[idx] = updated;

      if (isSupabaseConfigured) {
        try {
          const { data: supabaseUpdated, error } = await supabase.from('medicines').update(updated).eq('id', id).select().single();
          if (!error && supabaseUpdated) return supabaseUpdated;
        } catch (e) {
          console.warn('[Database] Supabase update medicine error:', e.message);
        }
      }
      return updated;
    }
    return null;
  },

  async deleteMedicine(id) {
    const idx = localStore.medicines.findIndex(m => m.id === id);
    if (idx !== -1) {
      localStore.medicines.splice(idx, 1);
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.from('medicines').delete().eq('id', id);
      } catch (e) {
        console.warn('[Database] Supabase delete medicine error:', e.message);
      }
    }
    return { success: true, id };
  },

  // 3. Customers
  async getCustomers() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[Database] Supabase getCustomers fallback:', e.message);
      }
    }
    return localStore.customers;
  },

  async createCustomer(data) {
    const newId = data.id || `CUS${String(localStore.customers.length + 1).padStart(3, '0')}`;
    const customer = {
      id: newId,
      name: data.name,
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      purchase_count: Number(data.purchase_count || 0),
      total_purchase: Number(data.total_purchase || 0),
      last_purchase: data.last_purchase || 'None',
      status: data.status || 'Active'
    };
    localStore.customers.push(customer);

    if (isSupabaseConfigured) {
      try {
        const { data: inserted, error } = await supabase.from('customers').insert(customer).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {
        console.warn('[Database] Supabase insert customer error:', e.message);
      }
    }
    return customer;
  },

  async updateCustomer(id, data) {
    const idx = localStore.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      const updated = { ...localStore.customers[idx], ...data, id };
      localStore.customers[idx] = updated;

      if (isSupabaseConfigured) {
        try {
          const { data: supabaseUpdated, error } = await supabase.from('customers').update(updated).eq('id', id).select().single();
          if (!error && supabaseUpdated) return supabaseUpdated;
        } catch (e) {
          console.warn('[Database] Supabase update customer error:', e.message);
        }
      }
      return updated;
    }
    return null;
  },

  async deleteCustomer(id) {
    const idx = localStore.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      localStore.customers.splice(idx, 1);
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch (e) {
        console.warn('[Database] Supabase delete customer error:', e.message);
      }
    }
    return { success: true, id };
  },

  // 4. Purchases (Customer Purchases & Stock Deductions)
  async getPurchases() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[Database] Supabase getPurchases fallback:', e.message);
      }
    }
    return localStore.purchases;
  },

  async createPurchase(data) {
    const newId = data.id || `PUR${String(localStore.purchases.length + 1).padStart(3, '0')}`;
    const qty = Number(data.quantity || 1);
    const amount = Number(data.amount || 0);

    const purchase = {
      id: newId,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || 'Customer',
      medicine: data.medicine || '',
      medicine_id: data.medicine_id || null,
      quantity: qty,
      amount: amount,
      date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    localStore.purchases.unshift(purchase);

    // Deduct stock for the medicine if medicine_id or medicine name is given
    let medToUpdate = null;
    if (purchase.medicine_id) {
      medToUpdate = localStore.medicines.find(m => m.id === purchase.medicine_id);
    } else if (purchase.medicine) {
      medToUpdate = localStore.medicines.find(m => m.name.toLowerCase() === purchase.medicine.toLowerCase());
    }

    if (medToUpdate) {
      medToUpdate.stock = Math.max(0, medToUpdate.stock - qty);
      medToUpdate.status = calculateMedicineStatus(medToUpdate.stock, medToUpdate.expiry_date);
    }

    // Update customer purchase stats if customer_id is provided
    if (purchase.customer_id) {
      const cust = localStore.customers.find(c => c.id === purchase.customer_id);
      if (cust) {
        cust.purchase_count = (cust.purchase_count || 0) + 1;
        cust.total_purchase = (Number(cust.total_purchase) || 0) + amount;
        cust.last_purchase = purchase.date;
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('purchases').insert(purchase);
        if (medToUpdate) {
          await supabase.from('medicines').update({ stock: medToUpdate.stock, status: medToUpdate.status }).eq('id', medToUpdate.id);
        }
        if (purchase.customer_id) {
          const cust = localStore.customers.find(c => c.id === purchase.customer_id);
          if (cust) {
            await supabase.from('customers').update({
              purchase_count: cust.purchase_count,
              total_purchase: cust.total_purchase,
              last_purchase: cust.last_purchase
            }).eq('id', cust.id);
          }
        }
      } catch (e) {
        console.warn('[Database] Supabase insert purchase error:', e.message);
      }
    }

    return purchase;
  },

  // 5. Sales & Billing (Transactions)
  async getSales() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[Database] Supabase getSales fallback:', e.message);
      }
    }
    return localStore.sales;
  },

  async createSale(data) {
    const newId = data.id || `BILL${String(localStore.sales.length + 1).padStart(3, '0')}`;
    const sale = {
      id: newId,
      customer_name: data.customer_name || 'Walk-in Customer',
      customer_id: data.customer_id || null,
      items_count: Number(data.items_count || 1),
      amount: Number(data.amount || 0),
      payment_method: data.payment_method || 'Cash',
      status: data.status || 'Paid',
      date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    localStore.sales.unshift(sale);

    // If customer is associated, update customer totals
    if (sale.customer_id) {
      const cust = localStore.customers.find(c => c.id === sale.customer_id);
      if (cust) {
        cust.purchase_count = (cust.purchase_count || 0) + 1;
        cust.total_purchase = (Number(cust.total_purchase) || 0) + sale.amount;
        cust.last_purchase = sale.date;
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales').insert(sale);
        if (sale.customer_id) {
          const cust = localStore.customers.find(c => c.id === sale.customer_id);
          if (cust) {
            await supabase.from('customers').update({
              purchase_count: cust.purchase_count,
              total_purchase: cust.total_purchase,
              last_purchase: cust.last_purchase
            }).eq('id', cust.id);
          }
        }
      } catch (e) {
        console.warn('[Database] Supabase insert sale error:', e.message);
      }
    }

    return sale;
  },

  // 6. Dashboard & Aggregated Reports
  async getDashboardData() {
    const [medicines, customers, purchases, sales] = await Promise.all([
      this.getMedicines(),
      this.getCustomers(),
      this.getPurchases(),
      this.getSales()
    ]);

    const totalMedicines = medicines.length;
    const totalCustomers = customers.length;
    const lowStock = medicines.filter(m => m.stock <= 10).length;
    const availableStock = medicines.filter(m => m.stock > 10).length;
    const expiringSoon = medicines.filter(m => m.expiry_date && (m.expiry_date.includes('2026') || m.status === 'Low Stock')).length;

    const totalSalesAmount = sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const totalPurchasesAmount = purchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalTransactions = sales.length;
    const avgPurchase = totalCustomers > 0 ? Math.round(totalSalesAmount / totalCustomers) : 0;

    return {
      totalMedicines,
      totalCustomers,
      lowStock,
      availableStock,
      expiringSoon,
      totalSalesAmount,
      totalPurchasesAmount,
      totalTransactions,
      avgPurchase,
      recentCustomers: customers.slice(0, 4),
      stockList: medicines.slice(0, 6),
      expiryList: medicines.filter(m => m.stock <= 20 || m.expiry_date.includes('2026')).slice(0, 5),
      monthlySales: [
        { month: 'Jan', height: 55, amount: '₹24,500' },
        { month: 'Feb', height: 70, amount: '₹31,200' },
        { month: 'Mar', height: 62, amount: '₹28,400' },
        { month: 'Apr', height: 80, amount: '₹35,800' },
        { month: 'May', height: 72, amount: '₹32,100' },
        { month: 'Jun', height: 90, amount: '₹45,850' }
      ]
    };
  }
};
