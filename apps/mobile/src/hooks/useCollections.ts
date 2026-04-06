import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { generateId } from '../utils/generateId';

export interface CollectionItem {
  id: string;
  collectionNumber?: string;
  saleId: string;
  saleNumber?: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  status: string;
  checkNumber?: string;
  checkBank?: string;
  checkDate?: string;
  photoUrls?: string[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  synced?: boolean;
  createdAt?: string;
}

export function useCollections(search?: string) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFromDb = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ id: string; data: string; synced: number }>(
        'SELECT id, data, synced FROM collections ORDER BY rowid DESC'
      );
      let items = rows.map(r => ({ ...JSON.parse(r.data), synced: r.synced === 1 } as CollectionItem));
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(c =>
          (c.collectionNumber || '').toLowerCase().includes(s) ||
          (c.customerName || '').toLowerCase().includes(s)
        );
      }
      setCollections(items);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    await loadFromDb();
  }, [loadFromDb]);

  const createCollection = useCallback(async (data: {
    saleId: string;
    saleNumber?: string;
    customerId: string;
    customerName?: string;
    amount: number;
    paymentMethod: string;
    checkNumber?: string;
    checkBank?: string;
    checkDate?: string;
    photoUrls?: string[];
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const db = await getDatabase();
    const id = `local-${generateId()}`;
    const collection: CollectionItem = {
      id,
      saleId: data.saleId,
      saleNumber: data.saleNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: 'PENDING_APPROVAL',
      checkNumber: data.checkNumber,
      checkBank: data.checkBank,
      checkDate: data.checkDate,
      photoUrls: data.photoUrls,
      notes: data.notes,
      latitude: data.latitude,
      longitude: data.longitude,
      createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      "INSERT INTO collections (id, data, synced, updated_at) VALUES (?, ?, 0, datetime('now'))",
      [id, JSON.stringify(collection)]
    );
    const syncPayload = {
      saleId: data.saleId,
      customerId: data.customerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      checkNumber: data.checkNumber,
      checkBank: data.checkBank,
      checkDate: data.checkDate,
      photoUrls: data.photoUrls,
      notes: data.notes,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('collections', 'CREATE', ?, ?)",
      [id, JSON.stringify(syncPayload)]
    );
    await loadFromDb();
    return collection;
  }, [loadFromDb]);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return { collections, loading, refresh, createCollection };
}
