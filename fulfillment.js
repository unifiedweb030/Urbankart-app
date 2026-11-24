const axios = require('axios');

/**
 * Routes confirmed orders to the B2B wholesale supplier for white-label dispatch.
 */
async function routeOrderToSupplier(order, items, dbPool) {
  try {
    const supplierPayload = {
      partner_order_id: order.order_number,
      branding: {
        store_name: process.env.STORE_NAME || 'UrbanKart India',
        gstin: process.env.STORE_GSTIN || 'PENDING_GSTIN',
        neutral_packaging: true
      },
      shipping_details: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.shipping_address,
        pincode: order.pincode
      },
      items: items.map((item) => ({
        sku: item.sku,
        qty: item.quantity,
        agreed_wholesale_price: item.wholesale_cost
      }))
    };

    if (process.env.SUPPLIER_WEBHOOK_URL) {
      await axios.post(process.env.SUPPLIER_WEBHOOK_URL, supplierPayload, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPPLIER_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      });
    }

    await dbPool.query(
      `UPDATE orders SET fulfillment_status = 'ROUTED_TO_SUPPLIER' WHERE id = $1`,
      [order.id]
    );

    await dbPool.query(
      `INSERT INTO tracking_events (order_id, status_title, location) VALUES ($1, $2, $3)`,
      [order.id, 'Order Auto-Routed to Fulfillment Hub', 'Central Warehouse']
    );

    console.log(`Order ${order.order_number} routed to supplier successfully.`);
  } catch (error) {
    console.error(`Supplier routing failed for ${order.order_number}:`, error.message);
  }
}

module.exports = { routeOrderToSupplier };
