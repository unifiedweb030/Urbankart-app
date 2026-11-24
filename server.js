require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Pool } = require('pg');
const { routeOrderToSupplier } = require('./fulfillment');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

function verifyAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized: Invalid Admin Key' });
  }
  next();
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'UrbanKart India Backend' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 1. PUBLIC ROUTE: Fetch Products (Hides wholesale_cost from public buyers)
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, name, category, selling_price, mrp, image_url, stock_qty
       FROM products WHERE stock_qty > 0 ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADMIN ROUTE: Fetch Products with Wholesale Cost & Profit Margins
app.get('/api/admin/products', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, (selling_price - wholesale_cost) AS net_profit
      FROM products ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CHECKOUT ROUTE: Create Order & Razorpay Payment Intent
app.post('/api/orders/create', async (req, res) => {
  const { customer_name, customer_phone, shipping_address, pincode, payment_method, items } = req.body;

  if (!customer_name || !customer_phone || !shipping_address || !pincode || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required order fields or cart items' });
  }

  try {
    let totalAmount = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (prodRes.rows.length === 0) {
        return res.status(400).json({ error: `Invalid product ID: ${item.product_id}` });
      }
      const product = prodRes.rows[0];
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      totalAmount += Number(product.selling_price) * qty;
      verifiedItems.push({ ...product, quantity: qty });
    }

    if (totalAmount < 999) totalAmount += 49;

    const orderNumber = 'UK-' + Math.floor(100000 + Math.random() * 900000);
    let razorpayOrder = null;

    if (payment_method !== 'COD') {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: orderNumber
      });
    }

    const orderInsert = await pool.query(
      `INSERT INTO orders (
        order_number, customer_name, customer_phone, shipping_address, pincode,
        total_amount, payment_method, payment_status, razorpay_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        orderNumber,
        customer_name,
        customer_phone,
        shipping_address,
        pincode,
        totalAmount,
        payment_method || 'UPI',
        payment_method === 'COD' ? 'COD_PENDING' : 'PENDING',
        razorpayOrder ? razorpayOrder.id : null
      ]
    );

    const newOrder = orderInsert.rows[0];

    await pool.query(
      `INSERT INTO tracking_events (order_id, status_title, location) VALUES ($1, $2, $3)`,
      [newOrder.id, 'Order Placed on Storefront', pincode]
    );

    for (const vItem of verifiedItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, wholesale_cost)
         VALUES ($1, $2, $3, $4, $5)`,
        [newOrder.id, vItem.id, vItem.quantity, vItem.selling_price, vItem.wholesale_cost]
      );
    }

    if (payment_method === 'COD') {
      await routeOrderToSupplier(newOrder, verifiedItems, pool);
    }

    res.json({
      order: newOrder,
      razorpay_order_id: razorpayOrder ? razorpayOrder.id : null,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PAYMENT VERIFICATION ROUTE
app.post('/api/orders/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  try {
    const orderRes = await pool.query(
      `UPDATE orders SET payment_status = 'PAID', razorpay_payment_id = $1
       WHERE razorpay_order_id = $2 RETURNING *`,
      [razorpay_payment_id, razorpay_order_id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found for payment' });
    }

    const order = orderRes.rows[0];
    const itemsRes = await pool.query(
      `SELECT oi.*, p.sku FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1`,
      [order.id]
    );

    await routeOrderToSupplier(order, itemsRes.rows, pool);

    res.json({ success: true, order_number: order.order_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. COURIER TRACKING WEBHOOK
app.post('/api/webhooks/courier-tracking', async (req, res) => {
  const token = req.headers['x-api-key'];
  if (token !== process.env.SHIPROCKET_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Invalid webhook token' });
  }

  const { order_number, current_status, awb, courier_name, location } = req.body;

  try {
    const orderRes = await pool.query(
      `UPDATE orders
       SET fulfillment_status = $1,
           awb_tracking_number = COALESCE($2, awb_tracking_number),
           courier_partner = COALESCE($3, courier_partner)
       WHERE order_number = $4 RETURNING id`,
      [current_status, awb, courier_name, order_number]
    );

    if (orderRes.rows.length > 0) {
      await pool.query(
        `INSERT INTO tracking_events (order_id, status_title, location) VALUES ($1, $2, $3)`,
        [orderRes.rows[0].id, current_status, location || 'In Transit']
      );
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. CUSTOMER ORDER TRACKING ROUTE
app.get('/api/orders/track/:orderNumber', async (req, res) => {
  try {
    const orderRes = await pool.query(
      `SELECT id, order_number, customer_name, shipping_address, pincode, total_amount,
              payment_method, payment_status, fulfillment_status, awb_tracking_number,
              courier_partner, created_at
       FROM orders WHERE order_number = $1`,
      [req.params.orderNumber]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderRow = orderRes.rows[0];
    const eventsRes = await pool.query(
      'SELECT status_title, location, event_time FROM tracking_events WHERE order_id = $1 ORDER BY event_time ASC',
      [orderRow.id]
    );

    delete orderRow.id;
    res.json({ order: orderRow, timeline: eventsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`UrbanKart Production Server running on port ${PORT}`));
