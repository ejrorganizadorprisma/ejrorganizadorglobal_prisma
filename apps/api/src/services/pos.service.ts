import { db } from '../config/database';
import { SalesRepository } from '../repositories/sales.repository';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { resolveCustomerPrice } from '@ejr/shared-types';

/**
 * PDV / Caixa (venda de balcão).
 *
 * Turno de caixa (pos_sessions) por operador: abre com fundo de troco, registra
 * sangria/suprimento (pos_movements), fecha conferindo o dinheiro contado x
 * esperado. Cada venda do PDV é uma venda normal (sales/sale_items/sale_payments)
 * criada numa única transação, já paga (exceto Crédito/a prazo), com baixa de
 * estoque e sem separação/expedição.
 *
 * Valores no formato da moeda padrão (PYG inteiro; BRL/USD centavos).
 */

export const CONSUMER_CUSTOMER_ID = 'cust-consumidor-final';
const MANAGER_ROLES = ['OWNER', 'DIRECTOR', 'MANAGER'];
const PAYMENT_METHODS = [
  'CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'PROMISSORY', 'BOLETO', 'OTHER', 'CREDIT',
];

type User = { id: string; role: string };

export interface PosSaleInput {
  sessionId: string;
  customerId?: string;
  items: { productId: string; quantity: number; discount?: number }[];
  discount?: number;
  payments: { method: string; amount: number }[];
  withNf?: boolean;
  nfNumber?: string;
  notes?: string;
  creditDueDate?: string; // vencimento quando houver pagamento em Crédito (a prazo)
}

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const int = (v: any) => (v == null ? 0 : Math.round(Number(v)));

function mapSession(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    sessionNumber: r.session_number,
    operatorId: r.operator_id,
    operatorName: r.operator_name || undefined,
    status: r.status,
    openedAt: r.opened_at,
    openingAmount: int(r.opening_amount),
    closedAt: r.closed_at || undefined,
    closedBy: r.closed_by || undefined,
    expectedCash: r.expected_cash != null ? int(r.expected_cash) : undefined,
    countedCash: r.counted_cash != null ? int(r.counted_cash) : undefined,
    cashDifference: r.cash_difference != null ? int(r.cash_difference) : undefined,
    summary: r.summary || undefined,
    notes: r.notes || undefined,
  };
}

export class PosService {
  private salesRepository = new SalesRepository();

  private async getSessionRow(id: string) {
    const r = await db.query(
      `SELECT s.*, u.name AS operator_name FROM pos_sessions s LEFT JOIN users u ON u.id = s.operator_id WHERE s.id = $1`,
      [id]
    );
    return r.rows[0];
  }

  private assertCanUse(session: any, user: User) {
    if (!session) throw new NotFoundError('Caixa não encontrado');
    if (session.operator_id !== user.id && !MANAGER_ROLES.includes(user.role)) {
      throw new ForbiddenError('Este caixa pertence a outro operador');
    }
  }

  /** Caixa aberto do operador logado (ou null). */
  async currentSession(user: User) {
    const r = await db.query(
      `SELECT s.*, u.name AS operator_name FROM pos_sessions s LEFT JOIN users u ON u.id = s.operator_id
        WHERE s.operator_id = $1 AND s.status = 'OPEN' LIMIT 1`,
      [user.id]
    );
    if (!r.rows[0]) return null;
    return { ...mapSession(r.rows[0]), totals: await this.computeTotals(r.rows[0].id) };
  }

  async openSession(user: User, openingAmount: number) {
    const amount = int(openingAmount);
    if (amount < 0) throw new BadRequestError('Fundo de troco não pode ser negativo');
    const existing = await db.query(`SELECT id FROM pos_sessions WHERE operator_id = $1 AND status = 'OPEN'`, [user.id]);
    if (existing.rows[0]) throw new ConflictError('Você já tem um caixa aberto');
    const id = newId('pos');
    await db.query(
      `INSERT INTO pos_sessions (id, operator_id, opening_amount) VALUES ($1, $2, $3)`,
      [id, user.id, amount]
    );
    return this.currentSession(user);
  }

  async addMovement(user: User, sessionId: string, type: string, amount: number, reason?: string) {
    if (type !== 'SUPPLY' && type !== 'WITHDRAWAL') throw new BadRequestError('Tipo de movimento inválido');
    const value = int(amount);
    if (value <= 0) throw new BadRequestError('Informe um valor maior que zero');
    const session = await this.getSessionRow(sessionId);
    this.assertCanUse(session, user);
    if (session.status !== 'OPEN') throw new BadRequestError('Caixa já está fechado');
    if (type === 'WITHDRAWAL') {
      const totals = await this.computeTotals(sessionId);
      if (value > totals.expectedCash) {
        throw new BadRequestError('Sangria maior que o dinheiro disponível no caixa');
      }
    }
    await db.query(
      `INSERT INTO pos_movements (id, session_id, type, amount, reason, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId('posm'), sessionId, type, value, reason?.trim() || null, user.id]
    );
    return this.computeTotals(sessionId);
  }

  /**
   * Totais do turno: vendas (qtde, total), recebido por forma de pagamento,
   * sangrias/suprimentos e dinheiro esperado na gaveta.
   */
  async computeTotals(sessionId: string) {
    const session = await db.query(`SELECT opening_amount FROM pos_sessions WHERE id = $1`, [sessionId]);
    const opening = int(session.rows[0]?.opening_amount);

    const sales = await db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::bigint AS total,
              COALESCE(SUM(discount), 0)::bigint AS discount
         FROM sales WHERE pos_session_id = $1 AND status <> 'CANCELLED'`,
      [sessionId]
    );
    const cancelled = await db.query(
      `SELECT COUNT(*)::int AS count FROM sales WHERE pos_session_id = $1 AND status = 'CANCELLED'`,
      [sessionId]
    );
    const byMethod = await db.query(
      `SELECT sp.payment_method::text AS method,
              COALESCE(SUM(sp.amount), 0)::bigint AS amount,
              COUNT(*)::int AS count
         FROM sale_payments sp JOIN sales s ON s.id = sp.sale_id
        WHERE s.pos_session_id = $1 AND s.status <> 'CANCELLED' AND sp.status <> 'CANCELLED'
        GROUP BY 1 ORDER BY 2 DESC`,
      [sessionId]
    );
    const movements = await db.query(
      `SELECT m.*, u.name AS user_name FROM pos_movements m LEFT JOIN users u ON u.id = m.created_by
        WHERE m.session_id = $1 ORDER BY m.created_at`,
      [sessionId]
    );
    const supplies = movements.rows.filter((m) => m.type === 'SUPPLY').reduce((a, m) => a + int(m.amount), 0);
    const withdrawals = movements.rows.filter((m) => m.type === 'WITHDRAWAL').reduce((a, m) => a + int(m.amount), 0);
    const cashSales = int(byMethod.rows.find((r) => r.method === 'CASH')?.amount);

    return {
      openingAmount: opening,
      salesCount: sales.rows[0].count,
      salesTotal: int(sales.rows[0].total),
      discountTotal: int(sales.rows[0].discount),
      cancelledCount: cancelled.rows[0].count,
      byMethod: byMethod.rows.map((r) => ({ method: r.method, amount: int(r.amount), count: r.count })),
      supplies,
      withdrawals,
      cashSales,
      expectedCash: opening + cashSales + supplies - withdrawals,
      movements: movements.rows.map((m) => ({
        id: m.id,
        type: m.type,
        amount: int(m.amount),
        reason: m.reason || undefined,
        userName: m.user_name || undefined,
        createdAt: m.created_at,
      })),
    };
  }

  async totalsFor(user: User, sessionId: string) {
    this.assertCanUse(await this.getSessionRow(sessionId), user);
    return this.computeTotals(sessionId);
  }

  async closeSession(user: User, sessionId: string, countedCash: number, notes?: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertCanUse(session, user);
    if (session.status !== 'OPEN') throw new BadRequestError('Caixa já está fechado');
    const counted = int(countedCash);
    if (counted < 0) throw new BadRequestError('Valor contado inválido');
    const totals = await this.computeTotals(sessionId);
    await db.query(
      `UPDATE pos_sessions
          SET status = 'CLOSED', closed_at = NOW(), closed_by = $2,
              expected_cash = $3, counted_cash = $4, cash_difference = $5,
              summary = $6, notes = $7, updated_at = NOW()
        WHERE id = $1 AND status = 'OPEN'`,
      [sessionId, user.id, totals.expectedCash, counted, counted - totals.expectedCash, JSON.stringify(totals), notes?.trim() || null]
    );
    return { ...mapSession(await this.getSessionRow(sessionId)), totals };
  }

  /**
   * Busca exata por código de barras ou código interno (leitura do scanner).
   * Retorna o produto no mesmo formato da API de produtos.
   */
  async lookupProduct(code: string) {
    const c = String(code || '').trim();
    if (!c) throw new BadRequestError('Código vazio');
    const r = await db.query(
      `SELECT id, name, code, barcode, unit, sale_price, wholesale_price, sale_price_currency, current_stock, status
         FROM products
        WHERE (barcode = $1 OR LOWER(code) = LOWER($1) OR LOWER(factory_code) = LOWER($1))
        ORDER BY (barcode = $1) DESC, (status = 'ACTIVE') DESC
        LIMIT 1`,
      [c]
    );
    const p = r.rows[0];
    if (!p) return null;
    return {
      id: p.id, name: p.name, code: p.code, barcode: p.barcode || undefined, unit: p.unit,
      salePrice: int(p.sale_price), wholesalePrice: int(p.wholesale_price), salePriceCurrency: p.sale_price_currency,
      currentStock: int(p.current_stock), status: p.status,
    };
  }

  /** Vincula um código de barras lido pela câmera a um produto (gerentes). */
  async setBarcode(user: User, productId: string, barcode: string) {
    if (!MANAGER_ROLES.includes(user.role)) {
      throw new ForbiddenError('Somente gerente/administrador pode cadastrar código de barras');
    }
    const code = String(barcode || '').trim();
    if (!/^[0-9A-Za-z\-.]{4,64}$/.test(code)) throw new BadRequestError('Código de barras inválido');
    const other = await db.query(`SELECT id, name FROM products WHERE barcode = $1 AND id <> $2 LIMIT 1`, [code, productId]);
    if (other.rows[0]) throw new ConflictError(`Este código já pertence a: ${other.rows[0].name}`);
    const r = await db.query(`UPDATE products SET barcode = $1, updated_at = NOW() WHERE id = $2 RETURNING id`, [code, productId]);
    if (!r.rows[0]) throw new NotFoundError('Produto não encontrado');
    return this.lookupProduct(code);
  }

  /** Histórico de turnos (gerentes veem todos; operador vê os seus). */
  async listSessions(user: User, limit = 30) {
    const all = MANAGER_ROLES.includes(user.role);
    const r = await db.query(
      `SELECT s.*, u.name AS operator_name,
              (SELECT COUNT(*) FROM sales x WHERE x.pos_session_id = s.id AND x.status <> 'CANCELLED')::int AS sales_count,
              (SELECT COALESCE(SUM(total),0) FROM sales x WHERE x.pos_session_id = s.id AND x.status <> 'CANCELLED')::bigint AS sales_total
         FROM pos_sessions s LEFT JOIN users u ON u.id = s.operator_id
        ${all ? '' : 'WHERE s.operator_id = $2'}
        ORDER BY s.opened_at DESC LIMIT $1`,
      all ? [Math.min(limit, 200)] : [Math.min(limit, 200), user.id]
    );
    return r.rows.map((row) => ({ ...mapSession(row), salesCount: row.sales_count, salesTotal: int(row.sales_total) }));
  }

  /** Últimas vendas do turno (para reimprimir cupom). */
  async sessionSales(user: User, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertCanUse(session, user);
    const r = await db.query(
      `SELECT s.id, s.sale_number, s.total, s.status, s.sale_date, s.created_at, s.nf_number, s.pos_change_amount,
              c.name AS customer_name
         FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.pos_session_id = $1 ORDER BY s.created_at DESC LIMIT 50`,
      [sessionId]
    );
    return r.rows.map((x) => ({
      id: x.id,
      saleNumber: x.sale_number,
      total: int(x.total),
      status: x.status,
      createdAt: x.created_at,
      nfNumber: x.nf_number || undefined,
      changeAmount: int(x.pos_change_amount),
      customerName: x.customer_name,
    }));
  }

  /** Dados completos de uma venda do PDV para o cupom. */
  async receipt(user: User, saleId: string) {
    const s = await db.query(
      `SELECT s.*, c.name AS customer_name, c.document, c.ruc, c.ci, u.name AS operator_name, ps.session_number
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN users u ON u.id = s.created_by
         LEFT JOIN pos_sessions ps ON ps.id = s.pos_session_id
        WHERE s.id = $1 AND s.pos_session_id IS NOT NULL`,
      [saleId]
    );
    const sale = s.rows[0];
    if (!sale) throw new NotFoundError('Venda do PDV não encontrada');
    if (sale.created_by !== user.id && !MANAGER_ROLES.includes(user.role)) {
      throw new ForbiddenError('Sem acesso a esta venda');
    }
    const items = await db.query(
      `SELECT si.quantity, si.unit_price, si.discount, si.total, p.name, p.code, p.unit
         FROM sale_items si LEFT JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = $1 ORDER BY si.created_at NULLS LAST, si.id`,
      [saleId]
    );
    const payments = await db.query(
      `SELECT payment_method::text AS method, amount, status::text AS status, due_date
         FROM sale_payments WHERE sale_id = $1 ORDER BY installment_number`,
      [saleId]
    );
    return {
      id: sale.id,
      saleNumber: sale.sale_number,
      createdAt: sale.created_at,
      sessionNumber: sale.session_number,
      operatorName: sale.operator_name,
      customerName: sale.customer_name,
      customerDocument: sale.ruc || sale.ci || sale.document || undefined,
      subtotal: int(sale.subtotal),
      discount: int(sale.discount),
      total: int(sale.total),
      changeAmount: int(sale.pos_change_amount),
      nfNumber: sale.nf_number || undefined,
      status: sale.status,
      items: items.rows.map((i) => ({
        name: i.name,
        code: i.code,
        unit: i.unit,
        quantity: int(i.quantity),
        unitPrice: int(i.unit_price),
        discount: int(i.discount),
        total: int(i.total),
      })),
      payments: payments.rows.map((p) => ({ method: p.method, amount: int(p.amount), status: p.status, dueDate: p.due_date })),
    };
  }

  /**
   * Finaliza uma venda do PDV numa única transação: venda + itens + pagamentos
   * (pagos na hora; Crédito fica pendente) + baixa de estoque + NF opcional.
   * Preço vem do cadastro do produto (o cliente só manda quantidade/desconto).
   */
  async createSale(user: User, input: PosSaleInput) {
    if (!input.sessionId) throw new BadRequestError('Caixa não informado');
    const session = await this.getSessionRow(input.sessionId);
    this.assertCanUse(session, user);
    if (session.status !== 'OPEN') throw new BadRequestError('O caixa está fechado. Abra o caixa para vender.');

    const rawItems = (input.items || []).filter((i) => i && i.productId && int(i.quantity) > 0);
    if (rawItems.length === 0) throw new BadRequestError('Adicione ao menos um produto');

    const customerId = input.customerId || CONSUMER_CUSTOMER_ID;
    const cust = await db.query(
      `SELECT id, name, allowed_payment_methods, credit_max_days, approval_status, price_tier, price_adjustment_pct
         FROM customers WHERE id = $1 AND deleted_at IS NULL`,
      [customerId]
    );
    const customer = cust.rows[0];
    if (!customer) throw new BadRequestError('Cliente não encontrado');
    if (customer.approval_status === 'REJECTED') throw new BadRequestError('Cliente inativo');

    // Preços do cadastro
    const productIds = Array.from(new Set(rawItems.map((i) => i.productId)));
    const prod = await db.query(
      `SELECT id, name, sale_price, wholesale_price, sale_price_currency, status FROM products WHERE id = ANY($1::text[])`,
      [productIds]
    );
    const byId = new Map(prod.rows.map((p) => [p.id, p]));
    const items = rawItems.map((i) => {
      const p = byId.get(i.productId);
      if (!p) throw new BadRequestError('Produto não encontrado');
      if (p.status && p.status !== 'ACTIVE') throw new BadRequestError(`Produto inativo: ${p.name}`);
      const quantity = int(i.quantity);
      if (quantity > 100000) throw new BadRequestError(`Quantidade inválida para ${p.name}`);
      // Preço pela tabela do cliente (Varejo / Atacado / Especial ±%)
      const unitPrice = int(
        resolveCustomerPrice(
          { salePrice: int(p.sale_price), wholesalePrice: int(p.wholesale_price), salePriceCurrency: p.sale_price_currency },
          { priceTier: customer.price_tier, priceAdjustmentPct: customer.price_adjustment_pct }
        ).price
      );
      const gross = quantity * unitPrice;
      const discount = Math.min(Math.max(0, int(i.discount)), gross);
      return { productId: p.id, name: p.name, quantity, unitPrice, discount, total: gross - discount };
    });

    const subtotal = items.reduce((a, i) => a + i.total, 0);
    const discount = Math.min(Math.max(0, int(input.discount)), subtotal);
    const total = subtotal - discount;
    if (subtotal > 2_000_000_000) throw new BadRequestError('Valor da venda acima do limite permitido');

    // Pagamentos
    const payments = (input.payments || [])
      .map((p) => ({ method: String(p.method || ''), amount: int(p.amount) }))
      .filter((p) => p.amount > 0);
    if (payments.length === 0 && total > 0) throw new BadRequestError('Informe o pagamento');
    for (const p of payments) {
      if (!PAYMENT_METHODS.includes(p.method)) throw new BadRequestError(`Forma de pagamento inválida: ${p.method}`);
    }
    const allowed: string[] = customer.allowed_payment_methods || [];
    if (customerId !== CONSUMER_CUSTOMER_ID && allowed.length > 0) {
      const bad = payments.find((p) => !allowed.includes(p.method));
      if (bad) throw new BadRequestError(`Forma de pagamento "${bad.method}" não é aceita para este cliente`);
    }
    const hasCredit = payments.some((p) => p.method === 'CREDIT');
    if (hasCredit && customerId === CONSUMER_CUSTOMER_ID) {
      throw new BadRequestError('Venda a crédito exige identificar o cliente (F9)');
    }
    const paidSum = payments.reduce((a, p) => a + p.amount, 0);
    if (paidSum < total) throw new BadRequestError('Valor pago é menor que o total da venda');
    // Troco só pode sair do dinheiro.
    const change = paidSum - total;
    const cashPaid = payments.filter((p) => p.method === 'CASH').reduce((a, p) => a + p.amount, 0);
    if (change > cashPaid) throw new BadRequestError('Troco só é permitido para pagamento em dinheiro');

    // Crédito: vencimento dentro do prazo do cliente
    let creditDue: Date | null = null;
    if (hasCredit) {
      const maxDays = int(customer.credit_max_days) || 30;
      creditDue = input.creditDueDate ? new Date(input.creditDueDate) : new Date(Date.now() + maxDays * 86400000);
      const days = Math.round((creditDue.getTime() - Date.now()) / 86400000);
      if (customer.credit_max_days && days > int(customer.credit_max_days)) {
        throw new BadRequestError(`Vencimento acima do prazo de crédito do cliente (máximo ${customer.credit_max_days} dias)`);
      }
    }

    // NF
    const withNf = !!input.withNf;
    const nfNumber = (input.nfNumber || '').trim();
    if (withNf && !nfNumber) throw new BadRequestError('Informe o número da NF');

    // Pagamentos gravados: o troco é abatido do dinheiro (gaveta recebe o líquido).
    let changeLeft = change;
    const recorded = payments.map((p) => {
      if (p.method === 'CASH' && changeLeft > 0) {
        const off = Math.min(changeLeft, p.amount);
        changeLeft -= off;
        return { ...p, amount: p.amount - off };
      }
      return p;
    }).filter((p) => p.amount > 0);

    const totalPaidNow = recorded.filter((p) => p.method !== 'CREDIT').reduce((a, p) => a + p.amount, 0);
    const status = totalPaidNow >= total ? 'PAID' : totalPaidNow > 0 ? 'PARTIAL' : 'PENDING';

    let saleId = '';
    try {
      saleId = await db.transaction(async (client) => {
        // Serializa a numeração entre caixas simultâneos.
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('sale_number'))`);
        const saleNumber = await this.salesRepository.generateSaleNumber(client);
        const id = newId('sale');
        await client.query(
          `INSERT INTO sales (
             id, sale_number, customer_id, seller_id, status, sale_date, due_date,
             subtotal, discount, total, total_paid, total_pending, installments,
             notes, created_by, pos_session_id, pos_change_amount, delivery_status, delivered_at,
             nf_number, nf_date, nf_amount, invoiced_at, invoiced_by, invoiced_without_nf
           ) VALUES (
             $1,$2,$3,$4,$5,NOW(),$6,
             $7,$8,$9,$10,$11,$12,
             $13,$4,$14,$15,'DELIVERED',NOW(),
             $16,$17,$18,NOW(),$4,$19
           )`,
          [
            id, saleNumber, customerId, user.id, status, creditDue ? creditDue.toISOString() : null,
            subtotal, discount, total, totalPaidNow, total - totalPaidNow, recorded.length || 1,
            input.notes?.trim() || null, input.sessionId, change,
            withNf ? nfNumber : null, withNf ? new Date().toISOString().slice(0, 10) : null, withNf ? total : null, !withNf,
          ]
        );

        for (const it of items) {
          await client.query(
            `INSERT INTO sale_items (id, sale_id, item_type, product_id, quantity, unit_price, discount, total)
             VALUES ($1,$2,'PRODUCT',$3,$4,$5,$6,$7)`,
            [newId('sitem'), id, it.productId, it.quantity, it.unitPrice, it.discount, it.total]
          );
        }

        let n = 1;
        for (const p of recorded) {
          const isCredit = p.method === 'CREDIT';
          await client.query(
            `INSERT INTO sale_payments (id, sale_id, installment_number, payment_method, amount, due_date, status, paid_date, paid_amount)
             VALUES ($1,$2,$3,$4::"PaymentMethod",$5,$6,$7::"PaymentStatus",$8,$9)`,
            [
              newId('spay'), id, n++, p.method, p.amount,
              isCredit && creditDue ? creditDue.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              isCredit ? 'PENDING' : 'PAID',
              isCredit ? null : new Date().toISOString(),
              isCredit ? 0 : p.amount,
            ]
          );
        }

        // Baixa de estoque (agrupado por produto; a função trava a linha e
        // recusa estoque negativo).
        const qtyByProduct = new Map<string, number>();
        for (const it of items) qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.quantity);
        for (const [productId, qty] of qtyByProduct) {
          await client.query(
            `SELECT update_product_stock($1::TEXT, $2::INTEGER, $3::TEXT, $4::VARCHAR, $5::TEXT, $6::TEXT, $7::VARCHAR)`,
            [productId, -qty, user.id, 'SALE', `Venda PDV ${saleNumber}`, id, 'SALE']
          );
        }
        return id;
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('Insufficient stock')) {
        const m = msg.match(/Current: (-?\d+), Requested: (\d+)/);
        throw new BadRequestError(
          m ? `Estoque insuficiente (disponível: ${m[1]}, pedido: ${m[2]})` : 'Estoque insuficiente para um dos produtos'
        );
      }
      throw e;
    }

    return this.receipt(user, saleId);
  }
}
