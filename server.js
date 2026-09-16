import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// 1. Health & Database Status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/db-status', (req, res) => {
  res.json(db.getMode());
});

// 2. Dashboard Aggregates
app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await db.getDashboardData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Pharmacy Information
app.get('/api/pharmacy', async (req, res) => {
  try {
    const info = await db.getPharmacyInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pharmacy', async (req, res) => {
  try {
    const updated = await db.updatePharmacyInfo(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Medicines
app.get('/api/medicines', async (req, res) => {
  try {
    const { search } = req.query;
    let medicines = await db.getMedicines();
    if (search) {
      const q = search.toLowerCase();
      medicines = medicines.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.batch_no && m.batch_no.toLowerCase().includes(q)) ||
        (m.id && m.id.toLowerCase().includes(q))
      );
    }
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/medicines/:id', async (req, res) => {
  try {
    const med = await db.getMedicineById(req.params.id);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    res.json(med);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/medicines', async (req, res) => {
  try {
    const { name, category, stock, price, expiry_date, batch_no, manufacturer } = req.body;
    if (!name) return res.status(400).json({ error: 'Medicine name is required' });
    const newMed = await db.createMedicine({ name, category, stock, price, expiry_date, batch_no, manufacturer });
    res.status(201).json(newMed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/medicines/:id', async (req, res) => {
  try {
    const updated = await db.updateMedicine(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Medicine not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/medicines/:id', async (req, res) => {
  try {
    const result = await db.deleteMedicine(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Customers
app.get('/api/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let customers = await db.getCustomers();
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q))
      );
    }
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, address, phone, email, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });
    const customer = await db.createCustomer({ name, address, phone, email, status });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const updated = await db.updateCustomer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const result = await db.deleteCustomer(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Purchases
app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await db.getPurchases();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { customer_id, customer_name, medicine, medicine_id, quantity, amount, date } = req.body;
    if (!medicine) return res.status(400).json({ error: 'Medicine name is required' });
    const purchase = await db.createPurchase({
      customer_id,
      customer_name,
      medicine,
      medicine_id,
      quantity,
      amount,
      date
    });
    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Sales & Billing (Transactions)
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await db.getSales();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { customer_name, customer_id, items_count, amount, payment_method, status, date } = req.body;
    const sale = await db.createSale({
      customer_name,
      customer_id,
      items_count,
      amount,
      payment_method,
      status,
      date
    });
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Global Search
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) return res.json({ medicines: [], customers: [], purchases: [], sales: [] });

    const [medicines, customers, purchases, sales] = await Promise.all([
      db.getMedicines(),
      db.getCustomers(),
      db.getPurchases(),
      db.getSales()
    ]);

    const matchedMedicines = medicines.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.category && m.category.toLowerCase().includes(q)) ||
      m.id.toLowerCase().includes(q)
    );

    const matchedCustomers = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );

    const matchedPurchases = purchases.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q) ||
      p.medicine.toLowerCase().includes(q)
    );

    const matchedSales = sales.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q)
    );

    res.json({
      query: q,
      totalMatches: matchedMedicines.length + matchedCustomers.length + matchedPurchases.length + matchedSales.length,
      medicines: matchedMedicines,
      customers: matchedCustomers,
      purchases: matchedPurchases,
      sales: matchedSales
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PharmaCare server running at http://0.0.0.0:${PORT}`);
});
