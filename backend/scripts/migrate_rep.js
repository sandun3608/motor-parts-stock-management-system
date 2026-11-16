const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'src', 'db', 'database.ts');
let code = fs.readFileSync(dbFile, 'utf8');

const target = '// Seed default settings if empty';
const repTablesCode = `
  // -------------------------------------------------------------------------
  // Sales Rep / Distribution System Tables (Van Sales, Shop Billing, Mobile)
  // -------------------------------------------------------------------------
  await dbRun(\`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      route TEXT DEFAULT 'General Route',
      address TEXT,
      outstanding_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 50000,
      notes TEXT,
      created_by_rep TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`);
  await dbRun('CREATE INDEX IF NOT EXISTS idx_shops_route ON shops(route)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_shops_phone ON shops(phone)');

  await dbRun(\`
    CREATE TABLE IF NOT EXISTS rep_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      shop_id TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      rep_id TEXT,
      rep_name TEXT,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      cheque_number TEXT,
      cheque_date TEXT,
      notes TEXT,
      status TEXT DEFAULT 'COMPLETED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  \`);
  await dbRun('CREATE INDEX IF NOT EXISTS idx_rep_orders_shop ON rep_orders(shop_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_rep_orders_rep ON rep_orders(rep_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_rep_orders_date ON rep_orders(created_at)');

  await dbRun(\`
    CREATE TABLE IF NOT EXISTS rep_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT,
      unit_price REAL NOT NULL,
      quantity REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES rep_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  \`);
  await dbRun('CREATE INDEX IF NOT EXISTS idx_rep_order_items_order ON rep_order_items(order_id)');

  await dbRun(\`
    CREATE TABLE IF NOT EXISTS rep_collections (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      rep_id TEXT,
      rep_name TEXT,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'CASH',
      cheque_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  \`);
  await dbRun('CREATE INDEX IF NOT EXISTS idx_rep_collections_shop ON rep_collections(shop_id)');

  // Seed default rep user and initial demo shops / products if empty
  const repUser = await dbGet('SELECT id FROM users WHERE username = ?', ['rep1']);
  if (!repUser) {
    await dbRun('INSERT INTO users (id, username, pin, role, permissions) VALUES (?, ?, ?, ?, ?)', [
      'usr_rep1',
      'rep1',
      '1234',
      'rep',
      JSON.stringify(['rep', 'wholesale', 'catalog', 'inventory']),
    ]);
  }

  const shopsCount = await dbGet<{ count: number }>('SELECT count(*) as count FROM shops');
  if (shopsCount && shopsCount.count === 0) {
    const demoShops = [
      { id: 'shp_1', name: 'Nimal Grocery Store', owner_name: 'Nimal Perera', phone: '0771234567', route: 'Route A - Colombo Suburbs', address: '12 Main St, Maharagama', outstanding: 12500 },
      { id: 'shp_2', name: 'City Mini Mart', owner_name: 'Kamal Jayawardena', phone: '0719876543', route: 'Route A - Colombo Suburbs', address: '45 Station Rd, Nugegoda', outstanding: 0 },
      { id: 'shp_3', name: 'Bandara & Sons Traders', owner_name: 'Sunil Bandara', phone: '0765551234', route: 'Route B - Gampaha Line', address: '88 Kandy Rd, Kadawatha', outstanding: 28400 },
      { id: 'shp_4', name: 'Saman Super Corner', owner_name: 'Saman Silva', phone: '0703339999', route: 'Route B - Gampaha Line', address: '104 High Level Rd, Kirillawala', outstanding: 5600 },
    ];
    for (const s of demoShops) {
      await dbRun(
        'INSERT INTO shops (id, name, owner_name, phone, route, address, outstanding_balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.name, s.owner_name, s.phone, s.route, s.address, s.outstanding]
      );
    }
  }

  const currentProductsCount = await dbGet<{ count: number }>('SELECT count(*) as count FROM products');
  if (currentProductsCount && currentProductsCount.count === 0) {
    const demoProducts = [
      { id: 'prd_1', barcode: '4791010008334', sku: 'SKU-RZ-01', name: 'BIC Body Single Razor (Pack 5)', cost_price: 280, selling_price: 350, mrp: 380, stock: 150, unit: 'pk' },
      { id: 'prd_2', barcode: '4791010004558', sku: 'SKU-SNK-02', name: 'Candyman Strawberry Chewee Jar 120s', cost_price: 950, selling_price: 1200, mrp: 1300, stock: 80, unit: 'jar' },
      { id: 'prd_3', barcode: '4791010006354', sku: 'SKU-HSH-03', name: 'Amritha Pineapple Essence 100ml', cost_price: 190, selling_price: 240, mrp: 260, stock: 200, unit: 'btl' },
      { id: 'prd_4', barcode: '4791111155265', sku: 'SKU-PC-04', name: 'Goya Ruby Red Herbal Soap 70g', cost_price: 110, selling_price: 145, mrp: 160, stock: 350, unit: 'pcs' },
      { id: 'prd_5', barcode: '4792020001122', sku: 'SKU-TEA-05', name: 'Watawala Pure Ceylon BOPF Tea 200g', cost_price: 340, selling_price: 420, mrp: 450, stock: 120, unit: 'pk' },
      { id: 'prd_6', barcode: '4793030002233', sku: 'SKU-BIS-06', name: 'Munchee Super Cream Cracker 500g', cost_price: 490, selling_price: 610, mrp: 650, stock: 95, unit: 'pk' },
      { id: 'prd_7', barcode: '4794040003344', sku: 'SKU-BEV-07', name: 'Elephant House Cream Soda 1.5L', cost_price: 290, selling_price: 380, mrp: 400, stock: 110, unit: 'btl' },
      { id: 'prd_8', barcode: '4795050004455', sku: 'SKU-OIL-08', name: 'Marina Coconut Oil 1L Pouch', cost_price: 620, selling_price: 760, mrp: 800, stock: 65, unit: 'pouch' },
    ];
    for (const p of demoProducts) {
      await dbRun(
        \`INSERT INTO products (id, barcode, sku, name, cost_price, selling_price, mrp, stock_quantity, unit, is_in_inventory, min_stock_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 10)\`,
        [p.id, p.barcode, p.sku, p.name, p.cost_price, p.selling_price, p.mrp, p.stock, p.unit]
      );
    }
  }

  // Seed default settings if empty
`;

if (code.includes(target)) {
  code = code.replace(target, repTablesCode);
  fs.writeFileSync(dbFile, code, 'utf8');
  console.log('Successfully injected rep tables into database.ts');
} else {
  console.error('Target not found');
}
