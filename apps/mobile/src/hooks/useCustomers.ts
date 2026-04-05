import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';
import { generateId } from '../utils/generateId';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  ci?: string;
  ruc?: string;
  type: 'INDIVIDUAL' | 'BUSINESS';
  synced?: boolean;
}

export function useCustomers(search?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  const loadFromDb = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string; data: string; synced: number }>(
      'SELECT id, data, synced FROM customers ORDER BY rowid DESC'
    );
    let items = rows.map(r => ({ ...JSON.parse(r.data), synced: r.synced === 1 } as Customer));
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(c => c.name.toLowerCase().includes(s) || (c.phone || '').includes(s));
    }
    setCustomers(items);
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected && token) {
      try {
        const result = await apiRequest('/customers?limit=1000', { token });
        if (result.success && result.data) {
          const db = await getDatabase();
          const list = Array.isArray(result.data) ? result.data : [];
          for (const c of list) {
            await db.runAsync(
              "INSERT OR REPLACE INTO customers (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))",
              [c.id, JSON.stringify(c)]
            );
          }
        }
      } catch (e) { /* offline */ }
    }
    await loadFromDb();
  }, [token, loadFromDb]);

  const createCustomer = useCallback(async (data: Omit<Customer, 'id' | 'synced'>) => {
    const db = await getDatabase();
    const id = `local-${generateId()}`;
    const customer = { ...data, id };
    await db.runAsync(
      "INSERT INTO customers (id, data, synced, updated_at) VALUES (?, ?, 0, datetime('now'))",
      [id, JSON.stringify(customer)]
    );
    await db.runAsync(
      "INSERT INTO sync_queue (entity, action, entity_id, payload) VALUES ('customers', 'CREATE', ?, ?)",
      [id, JSON.stringify(data)]
    );
    await loadFromDb();
    return customer;
  }, [loadFromDb]);

  useEffect(() => { refresh(); }, [search]);

  return { customers, loading, refresh, createCustomer };
}
