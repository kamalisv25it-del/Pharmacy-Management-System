import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../db.js';

describe('Pharmacy Management System - SRS & Supabase Database Verification', () => {

  // 1. Database Status & Mode
  test('Database status reports mode and record counts', () => {
    const mode = db.getMode();
    assert.ok(mode.type);
    assert.strictEqual(typeof mode.connected, 'boolean');
    assert.ok(mode.recordCounts.medicines >= 7, 'Should have at least 7 seeded medicines');
    assert.ok(mode.recordCounts.customers >= 5, 'Should have at least 5 seeded customers');
    assert.ok(mode.recordCounts.purchases >= 4, 'Should have at least 4 seeded purchases');
    assert.ok(mode.recordCounts.sales >= 3, 'Should have at least 3 seeded sales');
  });

  // 2. Pharmacy Information (FR-01 to FR-04)
  test('Pharmacy Information can be retrieved and updated', async () => {
    const info = await db.getPharmacyInfo();
    assert.ok(info.name);
    assert.ok(info.address);

    const updated = await db.updatePharmacyInfo({
      phone: '+91 9999988888',
      email: 'contact@pharmacare.org'
    });
    assert.strictEqual(updated.phone, '+91 9999988888');
    assert.strictEqual(updated.email, 'contact@pharmacare.org');
  });

  // 3. Medicine Inventory Management & Constraints (FR-09 to FR-15, FR-32)
  describe('Medicine Management & Constraints', () => {
    test('Lists all medicines with expected schema fields', async () => {
      const meds = await db.getMedicines();
      assert.ok(Array.isArray(meds));
      assert.ok(meds.length >= 7);

      const first = meds[0];
      assert.ok(first.id);
      assert.ok(first.name);
      assert.ok(first.category);
      assert.strictEqual(typeof first.stock, 'number');
      assert.strictEqual(typeof first.price, 'number');
      assert.ok(first.expiry_date);
      assert.ok(first.status);
    });

    test('Rejects medicine creation with negative stock (FR-13)', async () => {
      await assert.rejects(
        async () => {
          await db.createMedicine({
            name: 'Negative Stock Med',
            category: 'Tablet',
            stock: -10,
            price: 50.00
          });
        },
        { message: /cannot be negative/i }
      );
    });

    test('Rejects medicine creation with negative unit price (FR-13)', async () => {
      await assert.rejects(
        async () => {
          await db.createMedicine({
            name: 'Negative Price Med',
            category: 'Tablet',
            stock: 20,
            price: -5.00
          });
        },
        { message: /cannot be negative/i }
      );
    });

    test('Rejects duplicate batch number for same medicine name (FR-32)', async () => {
      // Create initial medicine
      await db.createMedicine({
        id: 'TEST_MED_BATCH',
        name: 'BatchTestCillin',
        category: 'Capsule',
        stock: 50,
        price: 40.00,
        batch_no: 'BATCH-XYZ-999',
        expiry_date: 'Dec 2028'
      });

      // Attempt duplicate batch for same medicine name
      await assert.rejects(
        async () => {
          await db.createMedicine({
            name: 'BatchTestCillin',
            category: 'Capsule',
            stock: 30,
            price: 40.00,
            batch_no: 'BATCH-XYZ-999',
            expiry_date: 'Dec 2028'
          });
        },
        { message: /Duplicate batch number/i }
      );
    });

    test('Blocks medicine deletion if linked purchase records exist (FR-10)', async () => {
      // MED001 is referenced in PUR001
      await assert.rejects(
        async () => {
          await db.deleteMedicine('MED001');
        },
        { message: /active customer purchase records depend on it/i }
      );
    });

    test('Allows deleting unlinked medicine', async () => {
      const created = await db.createMedicine({
        id: 'UNLINKED_MED',
        name: 'Temporary Syrups',
        category: 'Syrup',
        stock: 15,
        price: 60.00,
        batch_no: 'TMP-001'
      });
      assert.strictEqual(created.id, 'UNLINKED_MED');

      const delResult = await db.deleteMedicine('UNLINKED_MED');
      assert.strictEqual(delResult.success, true);

      const found = await db.getMedicineById('UNLINKED_MED');
      assert.strictEqual(found, null);
    });
  });

  // 4. Customer Management & Constraints (FR-16 to FR-20)
  describe('Customer Management & Constraints', () => {
    test('Lists all customers', async () => {
      const customers = await db.getCustomers();
      assert.ok(Array.isArray(customers));
      assert.ok(customers.length >= 5);
      const first = customers[0];
      assert.ok(first.id);
      assert.ok(first.name);
      assert.ok(first.address);
    });

    test('Rejects customer creation without name', async () => {
      await assert.rejects(
        async () => {
          await db.createCustomer({ name: '   ', address: 'Madurai' });
        },
        { message: /Customer name is required/i }
      );
    });

    test('Blocks customer deletion if purchase or sales records exist (FR-19)', async () => {
      // CUS001 has purchases (PUR001, PUR004) and sales (BILL001)
      await assert.rejects(
        async () => {
          await db.deleteCustomer('CUS001');
        },
        { message: /Cannot delete customer/i }
      );
    });

    test('Allows deleting unlinked customer', async () => {
      const customer = await db.createCustomer({
        id: 'CUS_TEMP',
        name: 'Temporary Customer',
        address: 'Coimbatore',
        phone: '+91 9999900000'
      });
      assert.strictEqual(customer.id, 'CUS_TEMP');

      const del = await db.deleteCustomer('CUS_TEMP');
      assert.strictEqual(del.success, true);
    });
  });

  // 5. Purchases & Live Stock Deductions (FR-21 to FR-24)
  describe('Purchase Transactions & Stock Linkage', () => {
    test('Prevents purchasing quantity exceeding available inventory (FR-22)', async () => {
      const meds = await db.getMedicines();
      const med = meds.find(m => m.id === 'MED002'); // Amoxicillin has 18 units
      assert.ok(med);

      await assert.rejects(
        async () => {
          await db.createPurchase({
            customer_name: 'Overbuy Customer',
            medicine_id: med.id,
            quantity: med.stock + 100
          });
        },
        { message: /Insufficient inventory/i }
      );
    });

    test('Purchase reduces medicine inventory stock and updates customer totals (FR-23)', async () => {
      const medBefore = await db.getMedicineById('MED004'); // Azithromycin
      const initialStock = medBefore.stock;
      const purchaseQty = 3;

      const custBefore = await db.getCustomerById('CUS002');
      const initialPurchases = Number(custBefore.purchase_count) || 0;
      const initialTotal = Number(custBefore.total_purchase) || 0;

      const purchase = await db.createPurchase({
        customer_id: 'CUS002',
        customer_name: custBefore.name,
        medicine_id: 'MED004',
        quantity: purchaseQty,
        amount: medBefore.price * purchaseQty,
        date: '10 Sep 2026'
      });

      assert.ok(purchase.id);
      assert.strictEqual(purchase.quantity, purchaseQty);

      // Verify stock was reduced
      const medAfter = await db.getMedicineById('MED004');
      assert.strictEqual(medAfter.stock, initialStock - purchaseQty);

      // Verify customer stats updated
      const custAfter = await db.getCustomerById('CUS002');
      assert.strictEqual(custAfter.purchase_count, initialPurchases + 1);
      assert.strictEqual(custAfter.total_purchase, initialTotal + (medBefore.price * purchaseQty));
    });
  });

  // 6. Sales & Billing Transactions (FR-25 to FR-28)
  describe('Sales & Billing', () => {
    test('Lists all sales records', async () => {
      const sales = await db.getSales();
      assert.ok(Array.isArray(sales));
      assert.ok(sales.length >= 3);
    });

    test('Creates new bill/sale transaction', async () => {
      const sale = await db.createSale({
        customer_name: 'New Billing Customer',
        items_count: 2,
        amount: 250.00,
        payment_method: 'UPI',
        status: 'Paid'
      });
      assert.ok(sale.id);
      assert.strictEqual(sale.amount, 250.00);
      assert.strictEqual(sale.payment_method, 'UPI');
    });

    test('Rejects negative sale amount', async () => {
      await assert.rejects(
        async () => {
          await db.createSale({
            customer_name: 'Test',
            items_count: 1,
            amount: -50.00
          });
        },
        { message: /cannot be negative/i }
      );
    });
  });

  // 7. Dashboard KPI Aggregates (FR-06 to FR-08)
  describe('Dashboard Analytics', () => {
    test('Calculates consistent dashboard metrics', async () => {
      const dash = await db.getDashboardData();
      assert.ok(dash.totalMedicines > 0);
      assert.ok(dash.totalCustomers > 0);
      assert.ok(dash.totalSalesAmount >= 0);
      assert.ok(dash.totalPurchasesAmount >= 0);
      assert.ok(dash.totalTransactions >= 0);
      assert.ok(Array.isArray(dash.recentCustomers));
      assert.ok(Array.isArray(dash.stockList));
      assert.ok(Array.isArray(dash.monthlySales));
    });
  });

  // 8. Migration Verification
  describe('Supabase Migration Pipeline', () => {
    test('Migration method executes cleanly and returns status', async () => {
      const result = await db.migrateDataToSupabase();
      assert.strictEqual(result.attempted, true);
      assert.strictEqual(typeof result.message, 'string');
    });
  });

  // 9. AI Intelligence Assistant (Gemini 3.8 Flash)
  describe('AI Intelligence Assistant', () => {
    test('Generates stock and expiry inventory audit report', async () => {
      const { analyzePharmacyData } = await import('../ai.js');
      const res = await analyzePharmacyData('Audit low stock medicines', 'inventory_audit');
      assert.strictEqual(res.success, true);
      assert.ok(res.mode);
      assert.ok(res.model);
      assert.ok(res.data);
      assert.ok(res.data.title);
      assert.ok(res.data.summary);
      assert.ok(Array.isArray(res.data.insights));
      assert.ok(res.data.insights.length > 0);
      assert.ok(Array.isArray(res.data.recommendations));
    });

    test('Generates sales and financial intelligence summary', async () => {
      const { analyzePharmacyData } = await import('../ai.js');
      const res = await analyzePharmacyData('Summarize recent revenue and top customers', 'sales_summary');
      assert.strictEqual(res.success, true);
      assert.ok(res.data.summary);
      assert.ok(Array.isArray(res.data.insights));
      assert.ok(Array.isArray(res.data.recommendations));
    });

    test('Handles natural language custom inquiry safely', async () => {
      const { analyzePharmacyData } = await import('../ai.js');
      const res = await analyzePharmacyData('Which medicines have less than 20 items in stock?', 'custom');
      assert.strictEqual(res.success, true);
      assert.ok(res.data.title);
      assert.ok(res.data.insights);
    });
  });
});
