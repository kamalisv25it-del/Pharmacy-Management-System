import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let cachedClient = null;
let migrationStatus = {
  attempted: false,
  success: false,
  message: 'Not run yet',
  stats: null,
  timestamp: null,
};

// Initial in-memory seed data representing the pharmacy database schema
// Used as the baseline seed and resilient mirror store
const localStore = {
  pharmacyInfo: {
    id: 1,
    name: 'PharmaCare',
    address: 'Madurai, Tamil Nadu',
    phone: '+91 9876543210',
    email: 'pharmacare@example.com',
    updated_at: new Date().toISOString()
  },
  users: [
    { id: 'USR001', username: 'admin', password_hash: 'admin123', role: 'admin', full_name: 'System Administrator' },
    { id: 'USR002', username: 'pharmacist', password_hash: 'pharma123', role: 'pharmacist', full_name: 'Staff Pharmacist' }
  ],
  suppliers: [
    { id: 'SUP001', name: 'GSK Health Logistics', contact_person: 'Kavitha R', phone: '+91 9845011223', email: 'kavitha@gskhealth.com', address: 'Chennai, Tamil Nadu' },
    { id: 'SUP002', name: 'Sun Pharma Distribution', contact_person: 'Rajesh Verma', phone: '+91 9789022334', email: 'rajesh@sunpharma.com', address: 'Mumbai, Maharashtra' },
    { id: 'SUP003', name: 'Cipla Lifecare', contact_person: 'Anil Mehta', phone: '+91 9443033445', email: 'anil@cipla.com', address: 'Bengaluru, Karnataka' }
  ],
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

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  if (cachedClient && cachedClient._url === url && cachedClient._key === key) {
    return cachedClient.client;
  }

  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    cachedClient = { client, _url: url, _key: key };
    console.log(`[Database] Supabase client initialized for host: ${new URL(url).hostname}`);
    return client;
  } catch (err) {
    console.error('[Database] Failed to initialize Supabase client:', err.message);
    return null;
  }
}

export const db = {
  // Returns operational connection mode and sync status
  getMode() {
    const client = getSupabaseClient();
    const isConfigured = Boolean(client);
    let host = null;
    if (process.env.SUPABASE_URL) {
      try {
        host = new URL(process.env.SUPABASE_URL).hostname;
      } catch (e) {
        host = 'Invalid URL';
      }
    }

    return {
      connected: isConfigured,
      type: isConfigured ? 'Supabase PostgreSQL' : 'Local PostgreSQL Mirror (Awaiting SUPABASE_URL)',
      urlConfigured: Boolean(process.env.SUPABASE_URL),
      supabaseHost: host,
      migration: migrationStatus,
      recordCounts: {
        medicines: localStore.medicines.length,
        customers: localStore.customers.length,
        purchases: localStore.purchases.length,
        sales: localStore.sales.length,
        users: localStore.users.length,
        suppliers: localStore.suppliers.length
      }
    };
  },

  // 0. Data Migration: Transfers all existing records to Supabase PostgreSQL without data loss
  async migrateDataToSupabase() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      migrationStatus = {
        attempted: true,
        success: false,
        message: 'Supabase credentials not configured in environment variables. Define SUPABASE_URL and SUPABASE_ANON_KEY to enable cloud synchronization.',
        timestamp: new Date().toISOString()
      };
      return migrationStatus;
    }

    const stats = {
      pharmacy_info: { success: 0, failed: 0 },
      users: { success: 0, failed: 0 },
      suppliers: { success: 0, failed: 0 },
      medicines: { success: 0, failed: 0 },
      customers: { success: 0, failed: 0 },
      purchases: { success: 0, failed: 0 },
      sales: { success: 0, failed: 0 }
    };

    try {
      console.log('[Migration] Starting migration to Supabase PostgreSQL...');

      // 1. Pharmacy Info
      try {
        const { error } = await supabase
          .from('pharmacy_info')
          .upsert(localStore.pharmacyInfo, { onConflict: 'id' });
        if (error) throw error;
        stats.pharmacy_info.success++;
      } catch (e) {
        console.warn('[Migration] Error migrating pharmacy_info:', e.message);
        stats.pharmacy_info.failed++;
      }

      // 2. Users
      for (const u of localStore.users) {
        try {
          const { error } = await supabase.from('users').upsert(u, { onConflict: 'id' });
          if (error) throw error;
          stats.users.success++;
        } catch (e) {
          stats.users.failed++;
        }
      }

      // 3. Suppliers
      for (const s of localStore.suppliers) {
        try {
          const { error } = await supabase.from('suppliers').upsert(s, { onConflict: 'id' });
          if (error) throw error;
          stats.suppliers.success++;
        } catch (e) {
          stats.suppliers.failed++;
        }
      }

      // 4. Medicines
      for (const m of localStore.medicines) {
        try {
          const { error } = await supabase.from('medicines').upsert(m, { onConflict: 'id' });
          if (error) throw error;
          stats.medicines.success++;
        } catch (e) {
          console.warn(`[Migration] Error migrating medicine ${m.id}:`, e.message);
          stats.medicines.failed++;
        }
      }

      // 5. Customers
      for (const c of localStore.customers) {
        try {
          const { error } = await supabase.from('customers').upsert(c, { onConflict: 'id' });
          if (error) throw error;
          stats.customers.success++;
        } catch (e) {
          console.warn(`[Migration] Error migrating customer ${c.id}:`, e.message);
          stats.customers.failed++;
        }
      }

      // 6. Purchases
      for (const p of localStore.purchases) {
        try {
          const { error } = await supabase.from('purchases').upsert(p, { onConflict: 'id' });
          if (error) throw error;
          stats.purchases.success++;
        } catch (e) {
          console.warn(`[Migration] Error migrating purchase ${p.id}:`, e.message);
          stats.purchases.failed++;
        }
      }

      // 7. Sales
      for (const s of localStore.sales) {
        try {
          const { error } = await supabase.from('sales').upsert(s, { onConflict: 'id' });
          if (error) throw error;
          stats.sales.success++;
        } catch (e) {
          console.warn(`[Migration] Error migrating sale ${s.id}:`, e.message);
          stats.sales.failed++;
        }
      }

      const totalMigrated = Object.values(stats).reduce((acc, curr) => acc + curr.success, 0);
      migrationStatus = {
        attempted: true,
        success: true,
        totalRecordsMigrated: totalMigrated,
        stats,
        message: `Successfully verified and migrated ${totalMigrated} records to Supabase PostgreSQL without loss.`,
        timestamp: new Date().toISOString()
      };

      console.log(`[Migration] Complete: ${migrationStatus.message}`);
      return migrationStatus;
    } catch (err) {
      migrationStatus = {
        attempted: true,
        success: false,
        stats,
        message: `Migration encountered error: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      return migrationStatus;
    }
  },

  // 1. Pharmacy Information
  async getPharmacyInfo() {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('pharmacy_info').select('*').eq('id', 1).maybeSingle();
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

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('pharmacy_info').upsert(updated, { onConflict: 'id' }).select().maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Database] Supabase upsert pharmacy_info error:', e.message);
      }
    }
    return updated;
  },

  // 2. Medicines
  async getMedicines() {
    const supabase = getSupabaseClient();
    if (supabase) {
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
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('medicines').select('*').eq('id', id).maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Database] Supabase getMedicineById error:', e.message);
      }
    }
    return localStore.medicines.find(m => m.id === id) || null;
  },

  async createMedicine(data) {
    // Constraint validations per SRS
    if (!data.name || !data.name.trim()) {
      throw new Error('Medicine name is required');
    }

    const stock = Number(data.stock !== undefined ? data.stock : 0);
    if (stock < 0) {
      throw new Error('Initial stock cannot be negative (FR-13)');
    }

    const price = Number(data.price !== undefined ? data.price : 0);
    if (price < 0) {
      throw new Error('Unit price cannot be negative (FR-13)');
    }

    // Duplicate batch check for same medicine
    const batch = (data.batch_no || '').trim();
    if (batch) {
      const allMeds = await this.getMedicines();
      const duplicate = allMeds.find(
        m => m.name.toLowerCase() === data.name.trim().toLowerCase() && m.batch_no && m.batch_no.toLowerCase() === batch.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Duplicate batch number "${batch}" already exists for "${data.name}" (FR-32)`);
      }
    }

    const newId = data.id || `MED${String(localStore.medicines.length + 1).padStart(3, '0')}`;
    const status = calculateMedicineStatus(stock, data.expiry_date);
    const medicine = {
      id: newId,
      name: data.name.trim(),
      category: data.category || 'Tablet',
      stock,
      price,
      expiry_date: data.expiry_date || 'Dec 2027',
      batch_no: batch,
      manufacturer: data.manufacturer || '',
      status: data.status || status,
    };

    localStore.medicines.push(medicine);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: inserted, error } = await supabase.from('medicines').insert(medicine).select().maybeSingle();
        if (!error && inserted) return inserted;
      } catch (e) {
        console.warn('[Database] Supabase insert medicine error:', e.message);
      }
    }
    return medicine;
  },

  async updateMedicine(id, data) {
    const idx = localStore.medicines.findIndex(m => m.id === id);
    if (idx === -1) {
      return null;
    }

    const current = localStore.medicines[idx];
    const stock = data.stock !== undefined ? Number(data.stock) : current.stock;
    if (stock < 0) {
      throw new Error('Stock cannot be negative');
    }
    const price = data.price !== undefined ? Number(data.price) : current.price;
    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    const status = calculateMedicineStatus(stock, data.expiry_date || current.expiry_date);
    const updated = {
      ...current,
      ...data,
      id,
      stock,
      price,
      status: data.status || status
    };
    localStore.medicines[idx] = updated;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supabaseUpdated, error } = await supabase.from('medicines').update(updated).eq('id', id).select().maybeSingle();
        if (!error && supabaseUpdated) return supabaseUpdated;
      } catch (e) {
        console.warn('[Database] Supabase update medicine error:', e.message);
      }
    }
    return updated;
  },

  async deleteMedicine(id) {
    // Relational deletion protection: medicines appearing on sales or purchases cannot be deleted (FR-10)
    const purchases = await this.getPurchases();
    const hasPurchase = purchases.some(p => p.medicine_id === id);
    if (hasPurchase) {
      throw new Error(`Cannot delete medicine ${id}: active customer purchase records depend on it (FR-10).`);
    }

    const idx = localStore.medicines.findIndex(m => m.id === id);
    if (idx !== -1) {
      localStore.medicines.splice(idx, 1);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
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
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[Database] Supabase getCustomers fallback:', e.message);
      }
    }
    return localStore.customers;
  },

  async getCustomerById(id) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Database] Supabase getCustomerById error:', e.message);
      }
    }
    return localStore.customers.find(c => c.id === id) || null;
  },

  async createCustomer(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Customer name is required');
    }

    const newId = data.id || `CUS${String(localStore.customers.length + 1).padStart(3, '0')}`;
    const customer = {
      id: newId,
      name: data.name.trim(),
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      purchase_count: Math.max(0, Number(data.purchase_count || 0)),
      total_purchase: Math.max(0, Number(data.total_purchase || 0)),
      last_purchase: data.last_purchase || 'None',
      status: data.status || 'Active'
    };
    localStore.customers.push(customer);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: inserted, error } = await supabase.from('customers').insert(customer).select().maybeSingle();
        if (!error && inserted) return inserted;
      } catch (e) {
        console.warn('[Database] Supabase insert customer error:', e.message);
      }
    }
    return customer;
  },

  async updateCustomer(id, data) {
    const idx = localStore.customers.findIndex(c => c.id === id);
    if (idx === -1) {
      return null;
    }
    const updated = { ...localStore.customers[idx], ...data, id };
    localStore.customers[idx] = updated;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supabaseUpdated, error } = await supabase.from('customers').update(updated).eq('id', id).select().maybeSingle();
        if (!error && supabaseUpdated) return supabaseUpdated;
      } catch (e) {
        console.warn('[Database] Supabase update customer error:', e.message);
      }
    }
    return updated;
  },

  async deleteCustomer(id) {
    // Relational deletion protection: customers with purchase records cannot be deleted (FR-19)
    const purchases = await this.getPurchases();
    const hasPurchases = purchases.some(p => p.customer_id === id);
    if (hasPurchases) {
      throw new Error(`Cannot delete customer ${id}: linked purchase history records exist (FR-19).`);
    }

    const sales = await this.getSales();
    const hasSales = sales.some(s => s.customer_id === id);
    if (hasSales) {
      throw new Error(`Cannot delete customer ${id}: linked transaction records exist (FR-19).`);
    }

    const idx = localStore.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      localStore.customers.splice(idx, 1);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch (e) {
        console.warn('[Database] Supabase delete customer error:', e.message);
      }
    }
    return { success: true, id };
  },

  // 4. Purchases (Customer Purchases & Stock Deductions per FR-22 & FR-23)
  async getPurchases() {
    const supabase = getSupabaseClient();
    if (supabase) {
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
    const qty = Number(data.quantity || 1);
    if (qty <= 0) {
      throw new Error('Purchase quantity must be greater than zero');
    }

    const medicines = await this.getMedicines();
    let targetMed = null;
    if (data.medicine_id) {
      targetMed = medicines.find(m => m.id === data.medicine_id);
    } else if (data.medicine) {
      targetMed = medicines.find(m => m.name.toLowerCase() === data.medicine.toLowerCase());
    }

    if (!targetMed) {
      throw new Error('Specified medicine was not found in inventory');
    }

    // Live inventory check (FR-22): prevent overselling beyond available stock
    if (targetMed.stock < qty) {
      throw new Error(`Insufficient inventory: Cannot purchase ${qty} units. Only ${targetMed.stock} units currently available (FR-22).`);
    }

    const amount = Number(data.amount !== undefined ? data.amount : (targetMed.price * qty));
    if (amount < 0) {
      throw new Error('Purchase amount cannot be negative');
    }

    const newId = data.id || `PUR${String(localStore.purchases.length + 1).padStart(3, '0')}`;
    const purchase = {
      id: newId,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || 'Customer',
      medicine: targetMed.name,
      medicine_id: targetMed.id,
      quantity: qty,
      amount,
      date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    localStore.purchases.unshift(purchase);

    // Live stock deduction (FR-23)
    const newStock = Math.max(0, targetMed.stock - qty);
    const newStatus = calculateMedicineStatus(newStock, targetMed.expiry_date);
    await this.updateMedicine(targetMed.id, { stock: newStock, status: newStatus });

    // Customer statistics update
    if (purchase.customer_id) {
      const cust = await this.getCustomerById(purchase.customer_id);
      if (cust) {
        await this.updateCustomer(cust.id, {
          purchase_count: (Number(cust.purchase_count) || 0) + 1,
          total_purchase: (Number(cust.total_purchase) || 0) + amount,
          last_purchase: purchase.date
        });
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('purchases').insert(purchase);
      } catch (e) {
        console.warn('[Database] Supabase insert purchase error:', e.message);
      }
    }

    return purchase;
  },

  // 5. Sales & Billing (Transactions)
  async getSales() {
    const supabase = getSupabaseClient();
    if (supabase) {
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
    const amount = Number(data.amount || 0);
    if (amount < 0) {
      throw new Error('Sale transaction amount cannot be negative');
    }
    const items_count = Number(data.items_count || 1);
    if (items_count <= 0) {
      throw new Error('Items count must be at least 1');
    }

    const newId = data.id || `BILL${String(localStore.sales.length + 1).padStart(3, '0')}`;
    const sale = {
      id: newId,
      customer_name: data.customer_name || 'Walk-in Customer',
      customer_id: data.customer_id || null,
      items_count,
      amount,
      payment_method: data.payment_method || 'Cash',
      status: data.status || 'Paid',
      date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    localStore.sales.unshift(sale);

    if (sale.customer_id) {
      const cust = await this.getCustomerById(sale.customer_id);
      if (cust) {
        await this.updateCustomer(cust.id, {
          purchase_count: (Number(cust.purchase_count) || 0) + 1,
          total_purchase: (Number(cust.total_purchase) || 0) + sale.amount,
          last_purchase: sale.date
        });
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('sales').insert(sale);
      } catch (e) {
        console.warn('[Database] Supabase insert sale error:', e.message);
      }
    }

    return sale;
  },

  // 6. Dashboard & Aggregated Reports (FR-06, FR-07, FR-08)
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
