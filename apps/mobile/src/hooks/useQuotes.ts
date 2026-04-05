import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';

export interface QuoteItem {
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string;
  productName?: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  quoteNumber?: string;
  customerId: string;
  customerName?: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  validUntil?: string;
  notes?: string;
  synced?: boolean;
  createdAt?: string;
}

export function useQuotes(search?: string) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  const loadFromDb = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string; data: string; synced: number }>(
      'SELECT id, data, synced FROM quotes ORDER BY rowid DESC'
    );
    let items = rows.map(r => ({ ...JSON.parse(r.data), synced: r.synced === 1 } as Quote));
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(q => (q.quoteNumber || '').toLowerCase().includes(s) || (q.customerName || '').toLowerCase().includes(s));
    }
    setQuotes(items);
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected && token) {
      try {
        const result = await apiRequest('/quotes?limit=1000', { token });
        if (result.success && result.data) {
          const db = await getDatabase();
          const list = Array.isArray(result.data) ? result.data : [];
          for (const q of list) {
            await db.runAsync(
              "INSERT OR REPLACE INTO quotes (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))",
              [q.id, JSON.stringify(q)]
            );
          }
        }
      } catch (e) {}
    }
    await loadFromDb();
  }, [token, loadFromDb]);

  const createQuote = useCallback(async (data: {
    customerId: string;
    items: QuoteItem[];
    discount: number;
    validUntil: string;
    notes?: string;
  }) => {
    const db = await getDatabase();
    const id = `local-${uuidv4()}`;
    const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const quote: Quote = {
      id,
      customerId: data.customerId,
      items: data.items,
      subtotal,
      discount: data.discount,
      total: subtotal - data.discount,
      status: 'DRAFT',
      validUntil: data.validUntil,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      "INSERT INTO quotes (id, data, synced, updated_at) VALUES (?, ?, 0, datetime('now'))",
      [id, JSON.stringify(quote)]
    );
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('quotes', 'CREATE', ?, ?)",
      [id, JSON.stringify(data)]
    );
    await loadFromDb();
    return quote;
  }, [loadFromDb]);

  useEffect(() => { refresh(); }, [search]);

  return { quotes, loading, refresh, createQuote };
}
