-- ==========================================================
-- PharmaCare Management System - Supabase PostgreSQL Schema
-- Migration from SQLite to Supabase PostgreSQL
-- ==========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Pharmacy Information Table
CREATE TABLE IF NOT EXISTS pharmacy_info (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(255) NOT NULL DEFAULT 'PharmaCare',
    address TEXT NOT NULL DEFAULT 'Madurai, Tamil Nadu',
    phone VARCHAR(50) NOT NULL DEFAULT '+91 9876543210',
    email VARCHAR(255) NOT NULL DEFAULT 'pharmacare@example.com',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_pharmacy_row CHECK (id = 1)
);

-- 2. Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    expiry_date VARCHAR(50) NOT NULL,
    batch_no VARCHAR(100) DEFAULT '',
    manufacturer VARCHAR(255) DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    purchase_count INT NOT NULL DEFAULT 0 CHECK (purchase_count >= 0),
    total_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_purchase >= 0),
    last_purchase VARCHAR(50) DEFAULT 'None',
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Purchases Table (Customer Purchases)
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    medicine VARCHAR(255) NOT NULL,
    medicine_id VARCHAR(50) REFERENCES medicines(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sales & Billing Table (Transactions)
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    items_count INT NOT NULL DEFAULT 1,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
    status VARCHAR(50) NOT NULL DEFAULT 'Paid',
    date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sale Items Detail Table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(50) REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id VARCHAR(50) REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0)
);

-- Row Level Security (RLS) Configuration
ALTER TABLE pharmacy_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Allow public read/write policies for service/anon access in Pharmacy Staff portal
CREATE POLICY "Allow full access to pharmacy_info" ON pharmacy_info FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to medicines" ON medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to sale_items" ON sale_items FOR ALL USING (true) WITH CHECK (true);

-- Initial Seed Data
INSERT INTO pharmacy_info (id, name, address, phone, email)
VALUES (1, 'PharmaCare', 'Madurai, Tamil Nadu', '+91 9876543210', 'pharmacare@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicines (id, name, category, stock, price, expiry_date, batch_no, manufacturer, status)
VALUES
    ('MED001', 'Paracetamol', 'Tablet', 120, 25.00, 'Dec 2027', 'PCM-2024-01', 'GSK Health', 'Available'),
    ('MED002', 'Amoxicillin', 'Capsule', 18, 85.00, 'Oct 2026', 'AMX-1024', 'Sun Pharma', 'Low Stock'),
    ('MED003', 'Cetirizine', 'Tablet', 6, 30.00, 'Oct 2026', 'CTZ-2054', 'Cipla Ltd', 'Low Stock'),
    ('MED004', 'Azithromycin', 'Tablet', 45, 120.00, 'Nov 2026', 'AZT-3055', 'Pfizer', 'Available'),
    ('MED005', 'Metformin', 'Tablet', 95, 45.00, 'Jan 2028', 'MET-4091', 'Dr. Reddy', 'Available'),
    ('MED006', 'Omeprazole', 'Capsule', 60, 55.00, 'Sep 2027', 'OMP-5022', 'Zydus', 'Available'),
    ('MED007', 'Ibuprofen', 'Tablet', 8, 35.00, 'Oct 2026', 'IBU-6019', 'Abbott', 'Low Stock')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, name, address, phone, email, purchase_count, total_purchase, last_purchase, status)
VALUES
    ('CUS001', 'Arun Kumar', 'Madurai', '+91 9845123456', 'arun.k@example.com', 12, 8450.00, '28 Aug 2026', 'Active'),
    ('CUS002', 'Priya Devi', 'Chennai', '+91 9789123456', 'priya.d@example.com', 8, 5720.00, '25 Aug 2026', 'Active'),
    ('CUS003', 'Rahul S', 'Coimbatore', '+91 9443123456', 'rahul.s@example.com', 5, 3250.00, '21 Aug 2026', 'Active'),
    ('CUS004', 'Meena R', 'Trichy', '+91 9942123456', 'meena.r@example.com', 3, 1890.00, '15 Aug 2026', 'Inactive'),
    ('CUS005', 'Suresh K', 'Salem', '+91 9841234567', 'suresh.k@example.com', 7, 4500.00, '01 Sep 2026', 'Active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchases (id, customer_id, customer_name, medicine, medicine_id, quantity, amount, date)
VALUES
    ('PUR001', 'CUS001', 'Arun Kumar', 'Paracetamol', 'MED001', 5, 125.00, '28 Aug 2026'),
    ('PUR002', 'CUS002', 'Priya Devi', 'Amoxicillin', 'MED002', 2, 170.00, '27 Aug 2026'),
    ('PUR003', 'CUS003', 'Rahul S', 'Cetirizine', 'MED003', 3, 90.00, '26 Aug 2026'),
    ('PUR004', 'CUS001', 'Arun Kumar', 'Azithromycin', 'MED004', 2, 240.00, '25 Aug 2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales (id, customer_name, customer_id, items_count, amount, payment_method, status, date)
VALUES
    ('BILL001', 'Arun Kumar', 'CUS001', 3, 450.00, 'Cash', 'Paid', '02 Sep 2026'),
    ('BILL002', 'Priya Devi', 'CUS002', 2, 320.00, 'UPI', 'Paid', '02 Sep 2026'),
    ('BILL003', 'Walk-in Customer', NULL, 1, 85.00, 'Card', 'Paid', '01 Sep 2026')
ON CONFLICT (id) DO NOTHING;
