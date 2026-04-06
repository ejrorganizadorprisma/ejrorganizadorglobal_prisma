import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';
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
  const { token } = useAuthStore();

  const loadFromDb = useCallback(async () => {
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
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected && token) {
      try {
        const result = await apiRequest('/collections?limit=1000', { token });
        if (result.success && result.data) {
          const db = await getDatabase();
          const list = Array.isArray(result.data) ? result.data : [];
          for (const c of list) {
            await db.runAsync(
              "INSERT OR REPLACE INTO collections (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))",
              [c.id, JSON.stringify(c)]
            );
          }
        }
      } catch (e) { /* offline */ }
    }
    await loadFromDb();
  }, [token, loadFromDb]);

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
    // Clean payload for sync: strip display-only fields
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

  useEffect(() => { refresh(); }, [search]);

  return { collections, loading, refresh, createCollection };
}
