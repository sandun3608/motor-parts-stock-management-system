const fs = require('fs');
const path = require('path');

const typesFile = path.join(__dirname, '..', 'frontend', 'src', 'types', 'index.ts');
let code = fs.readFileSync(typesFile, 'utf8');

const oldAppModule = "export type AppModule = 'pos' | 'wholesale' | 'catalog' | 'inventory' | 'grn' | 'customers' | 'shifts' | 'expenses' | 'procurement' | 'reports' | 'staff' | 'settings';";
const newAppModule = "export type AppModule = 'pos' | 'wholesale' | 'catalog' | 'inventory' | 'grn' | 'customers' | 'shifts' | 'expenses' | 'procurement' | 'reports' | 'staff' | 'settings' | 'rep';";

code = code.replace(oldAppModule, newAppModule);

const repTypes = `
// ==========================================
// Sales Rep / Distribution System Interfaces
// ==========================================
export interface Shop {
  id: string;
  name: string;
  owner_name?: string;
  phone?: string;
  route?: string;
  address?: string;
  outstanding_balance: number;
  credit_limit?: number;
  notes?: string;
  created_by_rep?: string;
  created_at?: string;
}

export interface RepOrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  sku?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface RepOrder {
  id: string;
  order_number: string;
  shop_id: string;
  shop_name: string;
  rep_id?: string;
  rep_name?: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_method: 'CASH' | 'CREDIT' | 'CHEQUE' | 'PARTIAL';
  cheque_number?: string;
  notes?: string;
  status?: string;
  created_at: string;
  items?: RepOrderItem[];
}

export interface RepCollection {
  id: string;
  shop_id: string;
  shop_name: string;
  rep_id?: string;
  rep_name?: string;
  amount: number;
  payment_method: string;
  cheque_number?: string;
  notes?: string;
  created_at: string;
}

export interface RepSummary {
  date: string;
  total_bills_count: number;
  shops_visited_count: number;
  total_sales: number;
  total_cash_in_hand: number;
  total_credit_issued: number;
  total_cheques: number;
  total_collections_from_credit: number;
  routes: string[];
}
`;

if (!code.includes('export interface Shop')) {
  code = code + '\n' + repTypes;
}

fs.writeFileSync(typesFile, code, 'utf8');
console.log('Successfully updated frontend/src/types/index.ts');
