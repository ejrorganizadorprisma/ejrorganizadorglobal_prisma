// Notificador simples de conflitos de sync. Usado quando o servidor "vence"
// uma edicao local (vide pullEntity em src/db/sync.ts).
//
// API minima sem dependencia externa: armazenamos o ultimo evento e expomos
// uma forma de inscrever-se via callback. O componente <ConflictToast />
// consome esse stream e renderiza um banner amarelo.

export interface ConflictEvent {
  id: number;
  entity: string;
  entityId: string;
  action: 'DISCARDED_LOCAL' | 'SERVER_WON';
  message: string;
  createdAt: number;
}

type Listener = (event: ConflictEvent) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function notifyConflict(input: {
  entity: string;
  entityId: string;
  action?: ConflictEvent['action'];
  message: string;
}): void {
  const event: ConflictEvent = {
    id: nextId++,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action || 'SERVER_WON',
    message: input.message,
    createdAt: Date.now(),
  };
  listeners.forEach((cb) => {
    try {
      cb(event);
    } catch {
      /* ignore listener errors */
    }
  });
}

export function onConflict(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Helper: retorna uma mensagem amigavel para o vendedor com base na entidade
// e no numero/identificador disponivel no payload.
export function buildConflictMessage(entity: string, payload: any): string {
  const orderNumber =
    payload?.orderNumber ||
    payload?.saleNumber ||
    payload?.quoteNumber ||
    payload?.collectionNumber ||
    payload?.number ||
    null;

  const labels: Record<string, string> = {
    sales_orders: 'pedido',
    sales: 'venda',
    quotes: 'orcamento',
    customers: 'cliente',
    collections: 'cobranca',
  };
  const label = labels[entity] || 'registro';

  if (orderNumber) {
    return `Seu ${label} ${orderNumber} foi atualizado pelo administrador. Sua versao local foi descartada.`;
  }
  return `Um ${label} que voce editou foi atualizado pelo administrador. Sua versao local foi descartada.`;
}
