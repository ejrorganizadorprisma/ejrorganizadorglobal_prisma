import { getDatabase } from './migrations';
import { apiRequest } from '../api/client';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyConflict, buildConflictMessage } from '../lib/conflictNotifier';

// Subscribers notified whenever a fullSync finishes. Used by data screens
// to re-read from local SQLite the moment background sync pulls new data.
type SyncListener = () => void;
const syncListeners = new Set<SyncListener>();

export function onSyncComplete(cb: SyncListener): () => void {
  syncListeners.add(cb);
  return () => { syncListeners.delete(cb); };
}

export interface SyncStatus {
  pendingCustomers: number;
  pendingQuotes: number;
  pendingSales: number;
  pendingSalesOrders: number;
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
    pendingSalesOrders: counts['sales_orders'] || 0,
    pendingCollections: counts['collections'] || 0,
    totalPending: Object.values(counts).reduce((a, b) => a + b, 0),
    lastSync: logResult?.created_at || null,
  };
}

function sanitizePayload(entity: string, payload: any): any {
  if (entity === 'quotes') {
    const clean = { ...payload };
    if (clean.validUntil) {
      let v = String(clean.validUntil).trim();
      // Legacy DD/MM/YYYY format from old mobile versions → convert to YYYY-MM-DD
      const ddmm = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (ddmm) {
        v = `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
      }
      // Date-only → append time for ISO format
      if (!v.includes('T')) {
        v = `${v}T23:59:59.000Z`;
      }
      clean.validUntil = v;
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

  if (entity === 'sales_orders') {
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

export async function pushPendingChanges(
  opts: { resetAttempts?: boolean } = {}
): Promise<{ pushed: number; errors: number }> {
  const db = await getDatabase();
  const token = await getToken();
  if (!token) return { pushed: 0, errors: 0 };

  // Quando o usuário clica manualmente em "Sincronizar Agora", zera o contador
  // de tentativas para permitir que itens que bateram o limite de 5 sejam
  // reprocessados. O contador existe para auto-sync (evita spam do servidor),
  // mas uma ação manual explícita deve sempre ter uma chance fresca.
  if (opts.resetAttempts) {
    await db.runAsync("UPDATE sync_queue SET attempts = 0");
  }

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
      sales_orders: '/sales-orders',
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
                "SELECT id, payload FROM sync_queue WHERE entity IN ('sales','sales_orders','quotes','collections')"
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
        await recordSyncFailure(db, item, errMsg);
        errors++;
      }
    } catch (error: any) {
      const errMsg = error?.message || 'Erro de rede';
      await recordSyncFailure(db, item, errMsg);
      errors++;
    }
  }

  return { pushed, errors };
}

// Incrementa attempts, salva last_error e gera log detalhado quando atinge
// o limite de 5 tentativas (item fica orfao ate ser retentado manualmente).
async function recordSyncFailure(
  db: any,
  item: { id: number; entity: string; action: string; entity_id: string; payload: string; attempts: number },
  errMsg: string
): Promise<void> {
  const newAttempts = (item.attempts || 0) + 1;
  await db.runAsync(
    "UPDATE sync_queue SET attempts = ?, last_error = ? WHERE id = ?",
    [newAttempts, errMsg, item.id]
  );
  await db.runAsync(
    "INSERT INTO sync_log (action, status, message) VALUES (?, 'ERROR', ?)",
    [`PUSH:${item.entity}:${item.action}`, `${item.entity}/${item.entity_id}: ${errMsg}`]
  );
  if (newAttempts >= 5) {
    // Log estruturado para diagnostico: o item nao sera mais reprocessado
    // automaticamente ate o usuario clicar em "Tentar novamente".
    console.warn('[sync] item atingiu limite de tentativas', {
      queueId: item.id,
      entity: item.entity,
      action: item.action,
      entityId: item.entity_id,
      attempts: newAttempts,
      lastError: errMsg,
      payload: safeParseJson(item.payload),
    });
  }
}

function safeParseJson(s: string): any {
  try { return JSON.parse(s); } catch { return s; }
}

// Itens que bateram o limite de tentativas (>=5) e estao "presos" na fila
// ate uma acao manual do usuario. Usado pelo banner de falhas.
export interface FailedSyncItem {
  id: number;
  entity: string;
  action: string;
  entityId: string;
  attempts: number;
  lastError: string | null;
  payload: any;
  createdAt: string;
}

export async function getFailedSyncItems(db?: any): Promise<FailedSyncItem[]> {
  const database = db || (await getDatabase());
  const rows = (await database.getAllAsync(
    "SELECT id, entity, action, entity_id, payload, attempts, last_error, created_at FROM sync_queue WHERE attempts >= 5 ORDER BY id ASC"
  )) as Array<{
    id: number;
    entity: string;
    action: string;
    entity_id: string;
    payload: string;
    attempts: number;
    last_error: string | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    action: r.action,
    entityId: r.entity_id,
    attempts: r.attempts,
    lastError: r.last_error,
    payload: safeParseJson(r.payload),
    createdAt: r.created_at,
  }));
}

// Reseta o contador de tentativas dos itens que ja bateram o limite,
// permitindo que sejam reprocessados no proximo push. Diferente de
// pushPendingChanges({resetAttempts:true}), este nao toca em itens que
// ainda estao dentro do limite (preserva o backoff natural).
export async function retryFailedSyncItems(db?: any): Promise<number> {
  const database = db || (await getDatabase());
  const result = await database.runAsync(
    "UPDATE sync_queue SET attempts = 0 WHERE attempts >= 5"
  );
  return (result as any)?.changes ?? 0;
}

// Compara duas timestamps em formatos heterogeneos (ISO ou "YYYY-MM-DD HH:MM:SS"
// vindo do datetime('now') do SQLite). Retorna number do timestamp ou 0 se falhar.
function parseTs(value: any): number {
  if (!value) return 0;
  const s = String(value).trim();
  // SQLite datetime('now') retorna 'YYYY-MM-DD HH:MM:SS' (UTC, sem T nem Z)
  const sqliteFmt = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (sqliteFmt) {
    return Date.parse(`${sqliteFmt[1]}-${sqliteFmt[2]}-${sqliteFmt[3]}T${sqliteFmt[4]}:${sqliteFmt[5]}:${sqliteFmt[6]}Z`);
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Extrai um updated_at do registro vindo do servidor. Aceita variantes
// camelCase e snake_case porque diferentes endpoints serializam diferente.
function extractServerUpdatedAt(item: any): number {
  return parseTs(item?.updatedAt || item?.updated_at);
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

  // Edicoes locais pendentes (com updated_at) por entity_id. Se o servidor
  // trouxer um item com updated_at mais recente, removemos a entry e gravamos
  // o servidor (servidor vence + toast). Se a edicao local for mais recente
  // ou igual, preservamos o registro local.
  const pendingRows = (await db.getAllAsync(
    "SELECT entity_id, updated_at FROM sync_queue WHERE entity = ?",
    [table]
  )) as Array<{ entity_id: string; updated_at: string | null }>;
  const pendingMap = new Map<string, { updated_at: string | null }>();
  for (const r of pendingRows) {
    pendingMap.set(String(r.entity_id), { updated_at: r.updated_at });
  }
  const pendingIds = new Set<string>(pendingRows.map((r: any) => String(r.entity_id)));

  // Coleta eventos de conflito para emitir DEPOIS da transacao (evita
  // ruido se algo falhar no meio).
  const conflicts: Array<{ entityId: string; payload: any }> = [];

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const idStr = String(item.id);
      const pending = pendingMap.get(idStr);

      if (pending) {
        const serverTs = extractServerUpdatedAt(item);
        const localTs = parseTs(pending.updated_at);

        if (localTs > 0 && serverTs > 0 && localTs >= serverTs) {
          // Edicao local e mais recente (ou igual): preservar local, ignorar
          // servidor neste pull. O push vai sincronizar nossa versao depois.
          continue;
        }
        // Servidor venceu: remover entry da fila, gravar servidor e marcar conflito
        await db.runAsync(
          "DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?",
          [table, idStr]
        );
        conflicts.push({ entityId: idStr, payload: item });
      }

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

    // Detectar exclusoes: so apaga registros que (a) ja estavam sincronizados
    // antes (synced=1) e (b) nao tem nenhuma operacao pendente na fila.
    // Linhas com synced=0 sao criadas offline e ainda nao chegaram ao
    // servidor — nunca podem ser apagadas aqui, mesmo que o servidor diga
    // que nao conhece o id. Para tabelas sem coluna synced (products), so
    // limpa registros que tambem nao estao na fila.
    const localRows = hasSynced
      ? await db.getAllAsync<{ id: string }>(
          `SELECT id FROM ${table} WHERE synced = 1`
        )
      : await db.getAllAsync<{ id: string }>(`SELECT id FROM ${table}`);

    for (const row of localRows) {
      const idStr = String(row.id);
      if (!serverIds.has(idStr) && !pendingIds.has(idStr)) {
        await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [row.id]);
      }
    }
  });

  // Emitir eventos de conflito apos a transacao
  for (const c of conflicts) {
    try {
      notifyConflict({
        entity: table,
        entityId: c.entityId,
        action: 'SERVER_WON',
        message: buildConflictMessage(table, c.payload),
      });
      console.warn('[sync] conflito resolvido (servidor venceu)', {
        entity: table,
        entityId: c.entityId,
      });
    } catch { /* ignore */ }
  }

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
    try { pulled += await pullEntity(db, token, '/sales-orders', 'sales_orders', true); } catch { /* skip */ }
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

export async function fullSync(
  options: { force?: boolean; resetAttempts?: boolean } = {}
): Promise<{ pushed: number; pulled: number; errors: number }> {
  const { force = false, resetAttempts = false } = options;
  // Reuse in-flight sync if one is already running
  if (inFlightSync) return inFlightSync;

  // Throttle: skip if we just synced recently (unless forced)
  if (!force && Date.now() - lastSyncFinishedAt < MIN_SYNC_INTERVAL_MS) {
    return { pushed: 0, pulled: 0, errors: 0 };
  }

  inFlightSync = (async () => {
    try {
      const pushResult = await pushPendingChanges({ resetAttempts });
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
      // Notify subscribers so mounted screens can re-read local DB
      syncListeners.forEach(cb => {
        try { cb(); } catch { /* ignore */ }
      });
    }
  })();

  return inFlightSync;
}
