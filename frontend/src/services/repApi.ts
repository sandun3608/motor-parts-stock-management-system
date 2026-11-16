import type { Shop, RepOrder, RepCollection, RepSummary, Product } from '../types';

const API_BASE = '/api/rep';

export const repApi = {
  // Get all shops
  async getShops(params?: { route?: string; search?: string }): Promise<Shop[]> {
    const query = new URLSearchParams();
    if (params?.route && params.route !== 'ALL') query.append('route', params.route);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/shops?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load shops');
    return res.json();
  },

  // Add new shop
  async addShop(payload: {
    name: string;
    owner_name?: string;
    phone?: string;
    route?: string;
    address?: string;
    credit_limit?: number;
    notes?: string;
    created_by_rep?: string;
  }): Promise<Shop> {
    const res = await fetch(`${API_BASE}/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add shop');
    }
    return res.json();
  },

  // Get shop details & history
  async getShopProfile(id: string): Promise<{ shop: Shop; orders: RepOrder[]; collections: RepCollection[] }> {
    const res = await fetch(`${API_BASE}/shops/${id}`);
    if (!res.ok) throw new Error('Failed to load shop details');
    return res.json();
  },

  // Get products with stock for sales rep
  async getProducts(search?: string): Promise<Product[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/products${query}`);
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  },

  // Issue order / bill to shop (automatically deducts from Main Stock!)
  async createOrder(payload: {
    shop_id: string;
    rep_id?: string;
    rep_name?: string;
    payment_method: 'CASH' | 'CREDIT' | 'CHEQUE' | 'PARTIAL';
    paid_amount: number;
    discount?: number;
    cheque_number?: string;
    cheque_date?: string;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<{ success: boolean; message: string; order: any }> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to issue order');
    }
    return data;
  },

  // Record credit collection
  async recordCollection(payload: {
    shop_id: string;
    amount: number;
    payment_method?: string;
    rep_id?: string;
    rep_name?: string;
    cheque_number?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; collection: any }> {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to record collection');
    }
    return data;
  },

  // Get Rep orders history
  async getOrders(shopId?: string): Promise<RepOrder[]> {
    const query = shopId ? `?shop_id=${encodeURIComponent(shopId)}` : '';
    const res = await fetch(`${API_BASE}/orders${query}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  // Get Daily Summary
  async getDailySummary(): Promise<RepSummary> {
    const res = await fetch(`${API_BASE}/summary`);
    if (!res.ok) throw new Error('Failed to fetch daily summary');
    return res.json();
  },
};
