import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun, runInTransaction } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export const repRouter = Router();

// ==========================================
// 1. SHOPS MANAGEMENT
// ==========================================

// Get all shops (with optional route and search filter)
repRouter.get('/shops', async (req: Request, res: Response) => {
  try {
    const { route, search } = req.query;
    let query = 'SELECT * FROM shops WHERE 1=1';
    const params: any[] = [];

    if (route && typeof route === 'string' && route !== 'ALL') {
      query += ' AND route = ?';
      params.push(route);
    }

    if (search && typeof search === 'string') {
      query += ' AND (name LIKE ? OR phone LIKE ? OR owner_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';
    const shops = await dbAll(query, params);
    res.json(shops);
  } catch (err: any) {
    console.error('Error fetching shops:', err);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Add new shop
repRouter.post('/shops', async (req: Request, res: Response) => {
  try {
    const { name, owner_name, phone, route, address, credit_limit, notes, created_by_rep } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const id = `shp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const routeName = (route && route.trim()) ? route.trim() : 'General Route';
    const limit = credit_limit ? parseFloat(credit_limit) : 50000;

    await dbRun(
      `INSERT INTO shops (id, name, owner_name, phone, route, address, credit_limit, notes, created_by_rep)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), owner_name?.trim() || '', phone?.trim() || '', routeName, address?.trim() || '', limit, notes?.trim() || '', created_by_rep || 'rep']
    );

    const newShop = await dbGet('SELECT * FROM shops WHERE id = ?', [id]);
    res.status(201).json(newShop);
  } catch (err: any) {
    console.error('Error adding shop:', err);
    res.status(500).json({ error: 'Failed to add shop' });
  }
});

// Get single shop with order and collection history
repRouter.get('/shops/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shop = await dbGet('SELECT * FROM shops WHERE id = ?', [id]);
    if (!shop) {
      return res.status(400).json({ error: 'Shop not found' });
    }

    const orders = await dbAll(
      'SELECT * FROM rep_orders WHERE shop_id = ? ORDER BY created_at DESC LIMIT 20',
      [id]
    );

    const collections = await dbAll(
      'SELECT * FROM rep_collections WHERE shop_id = ? ORDER BY created_at DESC LIMIT 20',
      [id]
    );

    res.json({ shop, orders, collections });
  } catch (err: any) {
    console.error('Error fetching shop profile:', err);
    res.status(500).json({ error: 'Failed to fetch shop details' });
  }
});

// Update shop details
repRouter.put('/shops/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, owner_name, phone, route, address, credit_limit, notes } = req.body;

    await dbRun(
      `UPDATE shops SET
        name = COALESCE(?, name),
        owner_name = COALESCE(?, owner_name),
        phone = COALESCE(?, phone),
        route = COALESCE(?, route),
        address = COALESCE(?, address),
        credit_limit = COALESCE(?, credit_limit),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, owner_name, phone, route, address, credit_limit, notes, id]
    );

    const updated = await dbGet('SELECT * FROM shops WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating shop:', err);
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// ==========================================
// 2. PRODUCTS & STOCK FOR REPS
// ==========================================

// Get all products with current main stock
repRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT id, barcode, sku, name, cost_price, selling_price, mrp, stock_quantity, unit, brand, category_id
      FROM products
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      query += ' AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ? OR brand LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';
    const products = await dbAll(query, params);
    res.json(products);
  } catch (err: any) {
    console.error('Error fetching rep products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ==========================================
// 3. CREATE ORDER / ISSUE BILL TO SHOP
// (Deducts directly from Main Stock!)
// ==========================================

repRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const {
      shop_id,
      rep_id = 'usr_rep1',
      rep_name = 'Sales Rep',
      payment_method = 'CASH', // 'CASH', 'CREDIT', 'CHEQUE', 'PARTIAL'
      paid_amount = 0,
      discount = 0,
      cheque_number = '',
      cheque_date = '',
      notes = '',
      items,
    } = req.body;

    if (!shop_id) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Execute in serialized transaction for bulletproof inventory integrity
    const result = await runInTransaction(async () => {
      // 1. Verify shop exists
      const shop = await dbGet('SELECT * FROM shops WHERE id = ?', [shop_id]);
      if (!shop) {
        throw new Error('Shop not found');
      }

      // 2. Verify and validate items against Main Stock
      let subtotal = 0;
      const orderItemsToInsert: any[] = [];

      for (const item of items) {
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for product ${item.product_name || item.product_id}`);
        }

        const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (!product) {
          throw new Error(`Product not found with ID: ${item.product_id}`);
        }

        // Check if main stock has enough quantity
        const availableStock = parseFloat(product.stock_quantity || 0);
        if (availableStock < qty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${availableStock} ${product.unit || 'pcs'}, Requested: ${qty}`
          );
        }

        const unitPrice = item.unit_price ? parseFloat(item.unit_price) : parseFloat(product.selling_price);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;

        orderItemsToInsert.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku || '',
          unit_price: unitPrice,
          quantity: qty,
          total_price: lineTotal,
          previous_stock: availableStock,
          new_stock: availableStock - qty,
        });
      }

      const discountAmt = Math.max(0, parseFloat(discount) || 0);
      const totalAmount = Math.max(0, subtotal - discountAmt);
      const paidAmt = Math.min(totalAmount, Math.max(0, parseFloat(paid_amount) || 0));
      const balanceAmount = Math.max(0, totalAmount - paidAmt);

      // Generate order number e.g. REP-20261024-0001
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countRow = await dbGet<{ count: number }>(
        "SELECT count(*) as count FROM rep_orders WHERE order_number LIKE ?",
        [`REP-${dateStr}-%`]
      );
      const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
      const orderNumber = `REP-${dateStr}-${seq}`;
      const orderId = `rep_ord_${Date.now()}_${uuidv4().substring(0, 6)}`;

      // 3. Deduct stock from Main Stock
      for (const item of orderItemsToInsert) {
        await dbRun(
          'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // 4. Insert into rep_orders
      await dbRun(
        `INSERT INTO rep_orders (
          id, order_number, shop_id, shop_name, rep_id, rep_name,
          subtotal, discount, total_amount, paid_amount, balance_amount,
          payment_method, cheque_number, cheque_date, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
        [
          orderId,
          orderNumber,
          shop.id,
          shop.name,
          rep_id,
          rep_name,
          subtotal,
          discountAmt,
          totalAmount,
          paidAmt,
          balanceAmount,
          payment_method,
          cheque_number || null,
          cheque_date || null,
          notes || null,
        ]
      );

      // 5. Insert order items
      for (const item of orderItemsToInsert) {
        const itemId = `roi_${Date.now()}_${uuidv4().substring(0, 6)}`;
        await dbRun(
          `INSERT INTO rep_order_items (id, order_id, product_id, product_name, sku, unit_price, quantity, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.product_id,
            item.product_name,
            item.sku,
            item.unit_price,
            item.quantity,
            item.total_price,
          ]
        );
      }

      // 6. Update Shop outstanding balance if there is an unpaid balance
      let newOutstanding = parseFloat(shop.outstanding_balance || 0);
      if (balanceAmount > 0) {
        newOutstanding += balanceAmount;
        await dbRun(
          'UPDATE shops SET outstanding_balance = outstanding_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [balanceAmount, shop.id]
        );
      }

      return {
        order_id: orderId,
        order_number: orderNumber,
        shop: {
          id: shop.id,
          name: shop.name,
          phone: shop.phone,
          route: shop.route,
          outstanding_balance: newOutstanding,
        },
        subtotal,
        discount: discountAmt,
        total_amount: totalAmount,
        paid_amount: paidAmt,
        balance_amount: balanceAmount,
        payment_method,
        items: orderItemsToInsert,
        created_at: new Date().toISOString(),
      };
    });

    res.status(201).json({
      success: true,
      message: 'Order created and stock deducted from Main Stock successfully!',
      order: result,
    });
  } catch (err: any) {
    console.error('Error issuing rep order:', err);
    res.status(400).json({ error: err.message || 'Failed to process order' });
  }
});

// ==========================================
// 4. RECORD CREDIT COLLECTION FROM SHOP
// ==========================================

repRouter.post('/collections', async (req: Request, res: Response) => {
  try {
    const {
      shop_id,
      amount,
      payment_method = 'CASH',
      rep_id = 'usr_rep1',
      rep_name = 'Sales Rep',
      cheque_number = '',
      notes = '',
    } = req.body;

    const payAmount = parseFloat(amount);
    if (!shop_id || isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid shop ID and payment amount are required' });
    }

    const result = await runInTransaction(async () => {
      const shop = await dbGet('SELECT * FROM shops WHERE id = ?', [shop_id]);
      if (!shop) {
        throw new Error('Shop not found');
      }

      const collectionId = `col_${Date.now()}_${uuidv4().substring(0, 6)}`;
      await dbRun(
        `INSERT INTO rep_collections (id, shop_id, shop_name, rep_id, rep_name, amount, payment_method, cheque_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [collectionId, shop.id, shop.name, rep_id, rep_name, payAmount, payment_method, cheque_number || null, notes || null]
      );

      // Reduce outstanding balance (not below zero)
      const currentOutstanding = parseFloat(shop.outstanding_balance || 0);
      const updatedOutstanding = Math.max(0, currentOutstanding - payAmount);

      await dbRun(
        'UPDATE shops SET outstanding_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updatedOutstanding, shop.id]
      );

      return {
        collection_id: collectionId,
        shop_id: shop.id,
        shop_name: shop.name,
        amount_collected: payAmount,
        payment_method,
        previous_outstanding: currentOutstanding,
        new_outstanding: updatedOutstanding,
        created_at: new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      message: 'Collection recorded and shop outstanding balance updated!',
      collection: result,
    });
  } catch (err: any) {
    console.error('Error recording collection:', err);
    res.status(400).json({ error: err.message || 'Failed to record collection' });
  }
});

// ==========================================
// 5. REP DAILY SUMMARY & ORDERS LIST
// ==========================================

// Get rep orders
repRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const { shop_id, limit = 50 } = req.query;
    let query = `
      SELECT o.*,
        (SELECT json_group_array(json_object(
          'id', i.id,
          'product_id', i.product_id,
          'product_name', i.product_name,
          'unit_price', i.unit_price,
          'quantity', i.quantity,
          'total_price', i.total_price
        )) FROM rep_order_items i WHERE i.order_id = o.id) as items_json
      FROM rep_orders o
      WHERE 1=1
    `;
    const params: any[] = [];

    if (shop_id) {
      query += ' AND o.shop_id = ?';
      params.push(shop_id);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const orders = await dbAll(query, params);
    const parsedOrders = orders.map((o) => ({
      ...o,
      items: o.items_json ? JSON.parse(o.items_json) : [],
    }));

    res.json(parsedOrders);
  } catch (err: any) {
    console.error('Error fetching rep orders:', err);
    res.status(500).json({ error: 'Failed to fetch rep orders' });
  }
});

// Get Daily Summary for Rep
repRouter.get('/summary', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const todayOrders = await dbAll(
      `SELECT * FROM rep_orders WHERE date(created_at) = date('now', 'localtime')`
    );

    const todayCollections = await dbAll(
      `SELECT * FROM rep_collections WHERE date(created_at) = date('now', 'localtime')`
    );

    let totalSales = 0;
    let totalCashFromSales = 0;
    let totalCreditIssued = 0;
    let totalChequeFromSales = 0;
    const visitedShopsSet = new Set<string>();

    for (const o of todayOrders) {
      totalSales += parseFloat(o.total_amount || 0);
      if (o.payment_method === 'CASH') {
        totalCashFromSales += parseFloat(o.paid_amount || 0);
      } else if (o.payment_method === 'CHEQUE') {
        totalChequeFromSales += parseFloat(o.paid_amount || 0);
      } else if (o.payment_method === 'PARTIAL') {
        totalCashFromSales += parseFloat(o.paid_amount || 0);
      }
      totalCreditIssued += parseFloat(o.balance_amount || 0);
      visitedShopsSet.add(o.shop_id);
    }

    let collectionsCash = 0;
    let collectionsCheque = 0;
    for (const c of todayCollections) {
      if (c.payment_method === 'CHEQUE') {
        collectionsCheque += parseFloat(c.amount || 0);
      } else {
        collectionsCash += parseFloat(c.amount || 0);
      }
      visitedShopsSet.add(c.shop_id);
    }

    // Get distinct routes
    const routesRows = await dbAll<{ route: string }>('SELECT DISTINCT route FROM shops WHERE route IS NOT NULL');
    const routes = routesRows.map((r) => r.route);

    res.json({
      date: today,
      total_bills_count: todayOrders.length,
      shops_visited_count: visitedShopsSet.size,
      total_sales: totalSales,
      total_cash_in_hand: totalCashFromSales + collectionsCash,
      total_credit_issued: totalCreditIssued,
      total_cheques: totalChequeFromSales + collectionsCheque,
      total_collections_from_credit: collectionsCash + collectionsCheque,
      routes,
    });
  } catch (err: any) {
    console.error('Error fetching rep summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});
