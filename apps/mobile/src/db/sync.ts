import { getDatabase } from './migrations';
import { apiRequest } from '../api/client';
import * as SecureStore from 'expo-secure-store';

export interface SyncStatus {
  pendingCustomers: number;
  pendingQuotes: number;
  pendingSales: number;
  totalPending: number;
  lastSync: string | null;
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = await getDatabase();
  const result = await db.getAllAsync<{ entity: string; cnt: number }>(
    "SELECT entity, COUNT(*) as cnt FROM sync_queue GROUP BY entity"
  );
  const counts: Record<string, number> = {};
  for (const row of result) {
    counts[row.entity] = row.cnt;
  }

  const logResult = await db.getFirstAsync<{ created_at: string }>(
    "SELECT created_at FROM sync_log WHERE status='SUCCESS' ORDER BY id DESC LIMIT 1"
  );

  return {
    pendingCustomers: counts['customers'] || 0,
    pendingQuotes: counts['quotes'] || 0,
    pendingSales: counts['sales'] || 0,
    totalPending: Object.values(counts).reduce((a, b) => a + b, 0),
    lastSync: logResult?.created_at || null,
  };
}

export async function pushPendingChanges(): Promise<{ pushed: number; errors: number }> {
  const db = await getDatabase();
  const token = await getToken();
  if (!token) return { pushed: 0, errors: 0 };

  const queue = await db.getAllAsync<{
    id: number; entity: string; action: string; entity_id: string; payload: string; attempts: number;
  }>("SELECT * FROM sync_queue ORDER BY id ASC");

  let pushed = 0;
  let errors = 0;

  for (const item of queue) {
    const entityMap: Record<string, string> = {
      customers: '/customers',
      quotes: '/quotes',
      sales: '/sales',
    };
    const endpoint = entityMap[item.entity];
    if (!endpoint) continue;

    const payload = JSON.parse(item.payload);
    let result;

    try {
      if (item.action === 'CREATE') {
        result = await apiRequest(endpoint, { method: 'POST', body: payload, token });
      } else if (item.action === 'UPDATE') {
        result = await apiRequest(`${endpoint}/${item.entity_id}`, { method: 'PATCH', body: payload, token });
      } else if (item.action === 'DELETE') {
        result = await apiRequest(`${endpoint}/${item.entity_id}`, { method: 'DELETE', token });
      }

      if (result?.success) {
        // Update local record with server data if CREATE
        if (item.action === 'CREATE' && result.data) {
          const serverData = result.data;
          const serverId = (serverData as any).id || item.entity_id;
          await db.runAsync(
            `INSERT OR REPLACE INTO ${item.entity} (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))`,
            [serverId, JSON.stringify(serverData)]
          );
          // Remove old local ID record if different
          if (serverId !== item.entity_id) {
            await db.runAsync(`DELETE FROM ${item.entity} WHERE id = ?`, [item.entity_id]);
          }
        } else {
          await db.runAsync(
            `UPDATE ${item.entity} SET synced = 1 WHERE id = ?`,
            [item.entity_id]
          );
        }
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
        pushed++;
      } else {
        await db.runAsync("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?", [item.id]);
        errors++;
      }
    } catch (error) {
      await db.runAsync("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?", [item.id]);
      errors++;
    }
  }

  return { pushed, errors };
}

export async function pullServerData(): Promise<{ pulled: number }> {
  const db = await getDatabase();
  const token = await getToken();
  if (!token) return { pulled: 0 };

  let pulled = 0;

  // Pull products (read-only cache)
  try {
    const productsResult = await apiRequest<any[]>('/products?limit=1000', { token });
    if (productsResult.success && productsResult.data) {
      const products = Array.isArray(productsResult.data) ? productsResult.data : [];
      for (const product of products) {
        await db.runAsync(
          "INSERT OR REPLACE INTO products (id, data, updated_at) VALUES (?, ?, datetime('now'))",
          [product.id, JSON.stringify(product)]
        );
      }
      pulled += products.length;
    }
  } catch (e) { /* ignore */ }

  // Pull customers
  try {
    const customersResult = await apiRequest<any[]>('/customers?limit=1000', { token });
    if (customersResult.success && customersResult.data) {
      const customers = Array.isArray(customersResult.data) ? customersResult.data : [];
      for (const customer of customers) {
        await db.runAsync(
          "INSERT OR REPLACE INTO customers (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))",
          [customer.id, JSON.stringify(customer)]
        );
      }
      pulled += customers.length;
    }
  } catch (e) { /* ignore */ }

  // Pull quotes
  try {
    const quotesResult = await apiRequest<any[]>('/quotes?limit=1000', { token });
    if (quotesResult.success && quotesResult.data) {
      const quotes = Array.isArray(quotesResult.data) ? quotesResult.data : [];
      for (const quote of quotes) {
        await db.runAsync(
          "INSERT OR REPLACE INTO quotes (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))",
          [quote.id, JSON.stringify(quote)]
        );
      }
      pulled += quotes.length;
    }
  } catch (e) { /* ignore */ }

  // Pull sales
  try {
    const salesResult = await apiRequest<any[]>('/sales?limit=1000', { token });
    if (salesResult.success && salesResult.data) {
      const sales = Array.isArray(salesResult.data) ? salesResult.data : [];
      for (const sale of sales) {
        await db.runAsync(
          "INSERT OR REPLACE INTO sales (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))",
          [sale.id, JSON.stringify(sale)]
        );
      }
      pulled += sales.length;
    }
  } catch (e) { /* ignore */ }

  // Log sync
  await db.runAsync(
    "INSERT INTO sync_log (action, status, message) VALUES ('PULL', 'SUCCESS', ?)",
    [`Pulled ${pulled} records`]
  );

  return { pulled };
}

export async function fullSync(): Promise<{ pushed: number; pulled: number; errors: number }> {
  const pushResult = await pushPendingChanges();
  const pullResult = await pullServerData();
  return {
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    errors: pushResult.errors,
  };
}
