-- 1. Products Table (With Wholesale Supplier Mapping)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL,
    mrp NUMERIC(10, 2) NOT NULL,
    wholesale_cost NUMERIC(10, 2) NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    supplier_api_endpoint TEXT,
    image_url TEXT,
    stock_qty INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    shipping_address TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- 'UPI', 'CARD', 'COD'
    payment_status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'COD_PENDING', 'FAILED'
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    fulfillment_status VARCHAR(50) DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'ROUTED_TO_SUPPLIER', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'
    awb_tracking_number VARCHAR(100),
    courier_partner VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    wholesale_cost NUMERIC(10, 2) NOT NULL
);

-- 4. Live Tracking Logs (Updated via Shiprocket/Courier Webhooks)
CREATE TABLE IF NOT EXISTS tracking_events (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    status_title VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    event_time TIMESTAMP DEFAULT NOW()
);

-- Sample Seed Products for India B2B White-Label Dropshipping
INSERT INTO products (sku, name, category, selling_price, mrp, wholesale_cost, supplier_name, image_url, stock_qty)
VALUES
  ('UK-ELEC-101', 'UrbanPods ANC Wireless Earbuds', 'Electronics', 1499.00, 2999.00, 820.00, 'Udaan Electronics Hub', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600', 80),
  ('UK-FASH-202', 'Surat Handloom Cotton Kurta Set', 'Fashion', 1199.00, 2199.00, 640.00, 'Surat Weaves B2B', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', 120),
  ('UK-HOME-303', 'Khurja Ceramic Dinner & Chai Set (6 Pc)', 'Home & Living', 899.00, 1599.00, 490.00, 'Khurja Artisan Supply', 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600', 95),
  ('UK-ELEC-404', 'Smart Fit AMOLED Fitness Band', 'Electronics', 1799.00, 3499.00, 1050.00, 'Udaan Electronics Hub', 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600', 60)
ON CONFLICT (sku) DO NOTHING;
