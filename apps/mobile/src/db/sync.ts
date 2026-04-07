import { getDatabase } from './migrations';
import { apiRequest } from '../api/client';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncStatus {
  pendingCustomers: number;
  pendingQuotes: number;
  pendingSales: number;
  pendingCollections: number;
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
    pendingCollections: counts['collections'] || 0,
    totalPending: Object.values(counts).reduce((a, b) => a + b, 0),
    lastSync: logResult?.created_at || null,
  };
}

function sanitizePayload(entity: string, payload: any): any {
  if (entity === 'quotes') {
    const clean = { ...payload };
    if (clean.validUntil && !clean.validUntil.includes('T')) {
      clean.validUntil = `${clean.validUntil}T23:59:59.000Z`;
    }
    if (Array.isArray(clean.items)) {
      clean.items = clean.items.map((item: any) => {
        if (item.itemType === 'PRODUCT') {
          return { itemType: item.itemType, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice };
        } else {
          return { itemType: item.itemType, serviceName: item.serviceName, serviceDescription: item.serviceDescription, quantity: item.quantity, unitPrice: item.unitPrice };
        }
      });
    }
    return clean;
  }

  if (entity === 'sales') {
    const clean = { ...payload };
    if (Array.isArray(clean.items)) {
      clean.items = clean.items.map((item: any) => ({
        itemType: item.itemType,
        productId: item.productId,
        serviceName: item.serviceName,
        serviceDescription: item.serviceDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
      }));
    }
    return clean;
  }

  if (entity === 'collections') {
    const clean = { ...payload };
    delete clean.saleNumber;
    delete clean.customerName;
    delete clean.collectionNumber;
    delete clean.status;
    delete clean.synced;
    delete clean.createdAt;
    // Map legacy PT payment methods to EN enum values
    const methodMap: Record<string, string> = {
      DINHEIRO: 'CASH', CHEQUE: 'CHECK', TRANSFERENCIA: 'BANK_TRANSFER', OUTRO: 'OTHER',
    };
    if (clean.paymentMethod && methodMap[clean.paymentMethod]) {
      clean.paymentMethod = methodMap[clean.paymentMethod];
    }
    if (clean.checkDate && !clean.checkDate.includes('T')) {
      clean.checkDate = `${clean.checkDate}T00:00:00.000Z`;
    }
    return clean;
  }

  return payload;
}

export async function pushPendingChanges(): Promise<{ pushed: number; errors: number }> {
  const db = await getDatabase();
  const token = await getToken();
  if (!token) return { pushed: 0, errors: 0 };

  const queue = await db.getAllAsync<{
    id: number; entity: string; action: string; entity_id: string; payload: string; attempts: number;
  }>("SELECT * FROM sync_queue WHERE attempts < 5 ORDER BY id ASC");

  let pushed = 0;
  let errors = 0;

  for (const item of queue) {
    const entityMap: Record<string, string> = {
      customers: '/customers',
      quotes: '/quotes',
      sales: '/sales',
      collections: '/collections',
    };
    const endpoint = entityMap[item.entity];
    if (!endpoint) continue;

    const rawPayload = JSON.parse(item.payload);
    const payload = sanitizePayload(item.entity, rawPayload);
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
        if (item.action === 'CREATE' && result.data) {
          const serverData = result.data;
          const serverId = (serverData as any).id || item.entity_id;
          await db.runAsync(
            `INSERT OR REPLACE INTO ${item.entity} (id, data, synced, updated_at) VALUES (?, ?, 1, datetime('now'))`,
            [serverId, JSON.stringify(serverData)]
          );
          if (serverId !== item.entity_id) {
            await db.runAsync(`DELETE FROM ${item.entity} WHERE id = ?`, [item.entity_id]);
            if (item.entity === 'customers') {
              const remaining = await db.getAllAsync<{ id: number; payload: string }>(
                "SELECT id, payload FROM sync_queue WHERE entity IN ('sales','quotes','collections')"
              );
              for (const r of remaining) {
                const p = JSON.parse(r.payload);
                if (p.customerId === item.entity_id) {
                  p.customerId = serverId;
                  await db.runAsync("UPDATE sync_queue SET payload = ? WHERE id = ?", [JSON.stringify(p), r.id]);
                }
              }
            }
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
        const errMsg = result?.error?.message || 'Erro desconhecido';
        await db.runAsync("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?", [item.id]);
        await db.runAsync(
          "INSERT INTO sync_log (action, status, message) VALUES (?, 'ERROR', ?)",
          [`PUSH:${item.entity}:${item.action}`, `${item.entity}/${item.entity_id}: ${errMsg}`]
        );
        errors++;
      }
    } catch (error: any) {
      const errMsg = error?.message || 'Erro de rede';
      await db.runAsync("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?", [item.id]);
      await db.runAsync(
        "INSERT INTO sync_log (action, status, message) VALUES (?, 'ERROR', ?)",
        [`PUSH:${item.entity}:${item.action}`, `${item.entity}/${item.entity_id}: ${errMsg}`]
      );
      errors++;
    }
  }

  return { pushed, errors };
}

async function pullEntity(
  db: any,
  token: string,
  endpoint: string,
  table: string,
  hasSynced: boolean
): Promise<number> {
  const result = await apiRequest<any[]>(`${endpoint}?limit=1000`, { token, timeoutMs: 30000 });
  if (!result.success || !result.data) return 0;

  const items = Array.isArray(result.data) ? result.data : [];

  // IDs retornados pelo servidor para esta entidade
  const serverIds = new Set<string>(items.map((it: any) => String(it.id)));

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const cols = hasSynced
        ? "(id, data, synced, updated_at)"
        : "(id, data, updated_at)";
      const vals = hasSynced
        ? "VALUES (?, ?, 1, datetime('now'))"
        : "VALUES (?, ?, datetime('now'))";
      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} ${cols} ${vals}`,
        [item.id, JSON.stringify(item)]
      );
    }

    // Detectar exclusões: linhas locais sincronizadas (synced=1) que nao
    // existem mais na resposta do servidor devem ser removidas. Linhas com
    // synced=0 sao novas criadas offline e nao podem ser apagadas aqui.
    // Para tabelas sem coluna synced (products), todas as linhas locais
    // ausentes do servidor sao removidas.
    const localRows = hasSynced
      ? await db.getAllAsync<{ id: string }>(
          `SELECT id FROM ${table} WHERE synced = 1`
        )
      : await db.getAllAsync<{ id: string }>(`SELECT id FROM ${table}`);

    for (const row of localRows) {
      if (!serverIds.has(String(row.id))) {
        await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [row.id]);
      }
    }
  });

  return items.length;
}

export async function pullServerData(): Promise<{ pulled: number }> {
  const db = await getDatabase();
  const token = await getToken();
  if (!token) return { pulled: 0 };

  const permsStr = await AsyncStorage.getItem('@ejr_mobile_permissions');
  const perms = permsStr ? JSON.parse(permsStr) : { customers: true, quotes: true, sales: true, products: true, collections: true };

  let pulled = 0;

  if (perms.products !== false) {
    try { pulled += await pullEntity(db, token, '/products', 'products', false); } catch { /* skip */ }
  }
  if (perms.customers !== false) {
    try { pulled += await pullEntity(db, token, '/customers', 'customers', true); } catch { /* skip */ }
  }
  if (perms.quotes !== false) {
    try { pulled += await pullEntity(db, token, '/quotes', 'quotes', true); } catch { /* skip */ }
  }
  if (perms.sales !== false) {
    try { pulled += await pullEntity(db, token, '/sales', 'sales', true); } catch { /* skip */ }
  }
  if (perms.collections !== false) {
    try { pulled += await pullEntity(db, token, '/collections', 'collections', true); } catch { /* skip */ }
  }

  // Fetch company name from document settings
  try {
    const settingsResult = await apiRequest<any>('/document-settings/default', { token, timeoutMs: 10000 });
    if (settingsResult.success && settingsResult.data?.companyName) {
      await AsyncStorage.setItem('@ejr_mobile_company_name', settingsResult.data.companyName);
    }
  } catch { /* skip */ }

  await db.runAsync(
    "INSERT INTO sync_log (action, status, message) VALUES ('PULL', 'SUCCESS', ?)",
    [`Pulled ${pulled} records`]
  );

  return { pulled };
}

let inFlightSync: Promise<{ pushed: number; pulled: number; errors: number }> | null = null;
let lastSyncFinishedAt = 0;
const MIN_SYNC_INTERVAL_MS = 3000;

export async function fullSync(force = false): Promise<{ pushed: number; pulled: number; errors: number }> {
  // Reuse in-flight sync if one is already running
  if (inFlightSync) return inFlightSync;

  // Throttle: skip if we just synced recently (unless forced)
  if (!force && Date.now() - lastSyncFinishedAt < MIN_SYNC_INTERVAL_MS) {
    return { pushed: 0, pulled: 0, errors: 0 };
  }

  inFlightSync = (async () => {
    try {
      const pushResult = await pushPendingChanges();
      const pullResult = await pullServerData();

      try {
        const token = await getToken();
        if (token) {
          await apiRequest('/mobile-app/sync-done', { method: 'POST', token });
        }
      } catch { /* ignore */ }

      return {
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        errors: pushResult.errors,
      };
    } finally {
      lastSyncFinishedAt = Date.now();
      inFlightSync = null;
    }
  })();

  return inFlightSync;
}
