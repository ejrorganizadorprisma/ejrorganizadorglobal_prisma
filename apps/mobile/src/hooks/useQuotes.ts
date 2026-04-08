import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { generateId } from '../utils/generateId';

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

  const loadFromDb = useCallback(async () => {
    try {
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
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    await loadFromDb();
  }, [loadFromDb]);

  const createQuote = useCallback(async (data: {
    customerId: string;
    items: QuoteItem[];
    discount: number;
    validUntil: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const db = await getDatabase();
    const id = `local-${generateId()}`;
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
    const cleanItems = data.items.map(({ productName, ...item }) => item);
    const cleanValidUntil = data.validUntil.includes('T') ? data.validUntil : `${data.validUntil}T23:59:59.000Z`;
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('quotes', 'CREATE', ?, ?)",
      [id, JSON.stringify({ ...data, items: cleanItems, validUntil: cleanValidUntil })]
    );
    await loadFromDb();
    return quote;
  }, [loadFromDb]);

  const updateQuote = useCallback(async (id: string, data: {
    customerId: string;
    items: QuoteItem[];
    discount: number;
    validUntil: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const db = await getDatabase();
    const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const existing = await db.getFirstAsync<{ data: string }>('SELECT data FROM quotes WHERE id = ?', [id]);
    const existingQuote: Quote = existing ? JSON.parse(existing.data) : ({} as Quote);

    const updated: Quote = {
      ...existingQuote,
      id,
      customerId: data.customerId,
      items: data.items,
      subtotal,
      discount: data.discount,
      total: subtotal - data.discount,
      validUntil: data.validUntil,
      notes: data.notes,
    };

    await db.runAsync(
      "UPDATE quotes SET data = ?, synced = 0, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(updated), id]
    );

    const cleanItems = data.items.map(({ productName, ...item }: any) => item);
    const cleanValidUntil = data.validUntil.includes('T') ? data.validUntil : `${data.validUntil}T23:59:59.000Z`;
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('quotes', 'UPDATE', ?, ?)",
      [id, JSON.stringify({ ...data, items: cleanItems, validUntil: cleanValidUntil })]
    );

    await loadFromDb();
    return updated;
  }, [loadFromDb]);

  const deleteQuote = useCallback(async (id: string) => {
    const db = await getDatabase();
    const isLocalOnly = id.startsWith('local-');

    if (isLocalOnly) {
      // Unsynced local quote — remove from queue too
      await db.runAsync("DELETE FROM sync_queue WHERE entity = 'quotes' AND entity_id = ?", [id]);
    } else {
      // Synced quote — enqueue DELETE to push to server
      await db.runAsync(
        "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('quotes', 'DELETE', ?, ?)",
        [id, '{}']
      );
    }

    await db.runAsync("DELETE FROM quotes WHERE id = ?", [id]);
    await loadFromDb();
  }, [loadFromDb]);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return { quotes, loading, refresh, createQuote, updateQuote, deleteQuote };
}
