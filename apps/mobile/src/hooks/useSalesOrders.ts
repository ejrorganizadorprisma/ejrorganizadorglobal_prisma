import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { generateId } from '../utils/generateId';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { fullSync } from '../db/sync';

export interface SalesOrderItem {
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string;
  productName?: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface SalesOrder {
  id: string;
  orderNumber?: string;
  customerId: string;
  customerName?: string;
  sellerId?: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  orderDate: string;
  notes?: string;
  synced?: boolean;
  createdAt?: string;
}

export function useSalesOrders(search?: string) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFromDb = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ id: string; data: string; synced: number }>(
        'SELECT id, data, synced FROM sales_orders ORDER BY rowid DESC'
      );
      let items = rows.map(r => ({ ...JSON.parse(r.data), synced: r.synced === 1 } as SalesOrder));
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(o =>
          (o.orderNumber || '').toLowerCase().includes(s) ||
          (o.customerName || '').toLowerCase().includes(s)
        );
      }
      setOrders(items);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    await loadFromDb();
  }, [loadFromDb]);

  const createOrder = useCallback(async (data: {
    customerId: string;
    items: SalesOrderItem[];
    discount?: number;
    orderDate: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const db = await getDatabase();
    const id = `local-${generateId()}`;
    const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const discount = data.discount || 0;
    const order: SalesOrder = {
      id,
      customerId: data.customerId,
      items: data.items,
      subtotal,
      discount,
      total: subtotal - discount,
      status: 'PENDING',
      orderDate: data.orderDate,
      createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      "INSERT INTO sales_orders (id, data, synced, updated_at) VALUES (?, ?, 0, datetime('now'))",
      [id, JSON.stringify(order)]
    );
    const cleanItems = data.items.map(({ productName, ...item }) => item);
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('sales_orders', 'CREATE', ?, ?)",
      [id, JSON.stringify({ ...data, items: cleanItems, discount })]
    );
    await loadFromDb();
    return order;
  }, [loadFromDb]);

  const convertFromQuote = useCallback(async (
    quoteId: string,
    extra: { orderDate: string; notes?: string }
  ) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    const result = await apiRequest<any>('/sales-orders/convert-from-quote', {
      method: 'POST',
      token,
      body: {
        quoteId,
        orderDate: extra.orderDate,
        notes: extra.notes,
      },
    });

    if (!result.success) {
      const msg = result.error?.message || 'Nao foi possivel converter o orcamento em pedido.';
      throw new Error(msg);
    }

    try {
      await fullSync({ force: true, resetAttempts: true });
    } catch { /* ignore */ }
    await loadFromDb();

    return result.data;
  }, [loadFromDb]);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return { orders, loading, refresh, createOrder, convertFromQuote };
}
