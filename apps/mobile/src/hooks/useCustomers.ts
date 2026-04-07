import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
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
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  responsibleUserId?: string | null;
  allowedPaymentMethods?: string[] | null;
  synced?: boolean;
}

export function useCustomers(search?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFromDb = useCallback(async () => {
    try {
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
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    await loadFromDb();
  }, [loadFromDb]);

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

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return { customers, loading, refresh, createCustomer };
}
