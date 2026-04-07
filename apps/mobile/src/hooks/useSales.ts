import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { generateId } from '../utils/generateId';

export interface SaleItem {
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string;
  productName?: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface Sale {
  id: string;
  saleNumber?: string;
  customerId: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  saleDate: string;
  paymentMethod: string;
  installments: number;
  synced?: boolean;
  createdAt?: string;
}

export interface SaleStats {
  totalSales: number;
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  averageTicket: number;
}

export function useSales(search?: string) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFromDb = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ id: string; data: string; synced: number }>(
        'SELECT id, data, synced FROM sales ORDER BY rowid DESC'
      );
      let items = rows.map(r => ({ ...JSON.parse(r.data), synced: r.synced === 1 } as Sale));
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(sl => (sl.saleNumber || '').toLowerCase().includes(s) || (sl.customerName || '').toLowerCase().includes(s));
      }
      setSales(items);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    await loadFromDb();
  }, [loadFromDb]);

  const createSale = useCallback(async (data: {
    customerId: string;
    items: SaleItem[];
    discount?: number;
    paymentMethod: string;
    installments?: number;
    saleDate: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const db = await getDatabase();
    const id = `local-${generateId()}`;
    const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const discount = data.discount || 0;
    const sale: Sale = {
      id,
      customerId: data.customerId,
      items: data.items,
      subtotal,
      discount,
      total: subtotal - discount,
      status: 'PENDING',
      saleDate: data.saleDate,
      paymentMethod: data.paymentMethod,
      installments: data.installments || 1,
      createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      "INSERT INTO sales (id, data, synced, updated_at) VALUES (?, ?, 0, datetime('now'))",
      [id, JSON.stringify(sale)]
    );
    const cleanItems = data.items.map(({ productName, ...item }) => item);
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('sales', 'CREATE', ?, ?)",
      [id, JSON.stringify({ ...data, items: cleanItems, discount })]
    );
    await loadFromDb();
    return sale;
  }, [loadFromDb]);

  const getStats = useCallback(async (): Promise<SaleStats> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM sales');
    const allSales = rows.map(r => JSON.parse(r.data) as Sale);
    const active = allSales.filter(s => s.status !== 'CANCELLED');
    return {
      totalSales: active.length,
      totalRevenue: active.reduce((s, sl) => s + (sl.total || 0), 0),
      totalPaid: 0,
      totalPending: 0,
      averageTicket: active.length > 0 ? Math.round(active.reduce((s, sl) => s + (sl.total || 0), 0) / active.length) : 0,
    };
  }, []);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return { sales, loading, refresh, createSale, getStats };
}
