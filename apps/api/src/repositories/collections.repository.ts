import { db } from '../config/database';
import type {
  Collection,
  CollectionFilters,
  CollectionStats,
  CreateCollectionDTO,
} from '@ejr/shared-types';

export class CollectionsRepository {
  /**
   * Gerar número sequencial da cobrança: COB-YYYY-NNNN
   */
  async generateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `COB-${year}-`;

    const result = await db.query(
      `SELECT collection_number
       FROM collections
       WHERE collection_number LIKE $1
       ORDER BY collection_number DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = parseInt(result.rows[0].collection_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Criar nova cobrança
   * IMPORTANT: uses db.transaction() (pool.connect) so all statements run on the
   * same client. db.query('BEGIN') would break on Supabase transaction-mode pgbouncer.
   */
  async create(dto: CreateCollectionDTO, sellerId: string): Promise<Collection> {
    const createdId = await db.transaction(async (client) => {
      // Generate sequential number inside the transaction using the same client
      const year = new Date().getFullYear();
      const prefix = `COB-${year}-`;
      const numRes = await client.query(
        `SELECT collection_number
         FROM collections
         WHERE collection_number LIKE $1
         ORDER BY collection_number DESC
         LIMIT 1`,
        [`${prefix}%`]
      );
      let nextNumber = 1;
      if (numRes.rows.length > 0) {
        const lastNumber = parseInt(numRes.rows[0].collection_number.split('-')[2]);
        nextNumber = lastNumber + 1;
      }
      const collectionNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

      const insertRes = await client.query(
        `INSERT INTO collections (
          collection_number, sale_id, customer_id, seller_id, amount,
          payment_method, status, check_number, check_bank, check_date,
          photo_urls, notes, latitude, longitude
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_APPROVAL', $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          collectionNumber,
          dto.saleId,
          dto.customerId,
          sellerId,
          dto.amount,
          dto.paymentMethod,
          dto.checkNumber || null,
          dto.checkBank || null,
          dto.checkDate || null,
          dto.photoUrls && dto.photoUrls.length > 0 ? dto.photoUrls : null,
          dto.notes || null,
          dto.latitude || null,
          dto.longitude || null,
        ]
      );

      const createdRowId = insertRes.rows[0].id as string;

      // Criar GPS event se lat/lng fornecidos
      if (dto.latitude && dto.longitude) {
        await client.query(
          `INSERT INTO gps_events (user_id, event_type, event_id, latitude, longitude)
           VALUES ($1, 'COLLECTION', $2, $3, $4)`,
          [sellerId, createdRowId, dto.latitude, dto.longitude]
        );
      }

      return createdRowId;
    });

    // findById runs outside the transaction — data is already committed
    const collection = await this.findById(createdId);
    if (!collection) {
      throw new Error('Erro ao buscar cobrança criada');
    }
    return collection;
  }

  /**
   * Listar cobranças com filtros e paginação
   */
  async findAll(filters: CollectionFilters) {
    const {
      page = 1,
      limit = 20,
      sellerId,
      customerId,
      saleId,
      status,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (sellerId) {
      conditions.push(`col.seller_id = $${paramIndex}`);
      queryParams.push(sellerId);
      paramIndex++;
    }

    if (customerId) {
      conditions.push(`col.customer_id = $${paramIndex}`);
      queryParams.push(customerId);
      paramIndex++;
    }

    if (saleId) {
      conditions.push(`col.sale_id = $${paramIndex}`);
      queryParams.push(saleId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`col.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`col.created_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`col.created_at <= $${paramIndex}`);
      queryParams.push(endDate + 'T23:59:59');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM collections col ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Main query
    const query = `
      SELECT
        col.*,
        c.name as customer_name,
        u.name as seller_name,
        s.sale_number,
        s.total as sale_total,
        s.total_paid as sale_total_paid
      FROM collections col
      LEFT JOIN customers c ON col.customer_id = c.id
      LEFT JOIN users u ON col.seller_id = u.id
      LEFT JOIN sales s ON col.sale_id = s.id
      ${whereClause}
      ORDER BY col.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(query, queryParams);

    const data = result.rows.map((row) => this.mapToCollection(row));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar cobrança por ID com joins
   */
  async findById(id: string): Promise<Collection | null> {
    const query = `
      SELECT
        col.*,
        c.name as customer_name,
        u.name as seller_name,
        s.sale_number,
        s.total as sale_total,
        s.total_paid as sale_total_paid,
        approver.name as approver_name
      FROM collections col
      LEFT JOIN customers c ON col.customer_id = c.id
      LEFT JOIN users u ON col.seller_id = u.id
      LEFT JOIN sales s ON col.sale_id = s.id
      LEFT JOIN users approver ON col.approved_by = approver.id
      WHERE col.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToCollection(result.rows[0]);
  }

  /**
   * Aprovar cobrança — também cria commission entry se configurado
   * IMPORTANT: uses db.transaction() (pool.connect) so UPDATE + INSERT share a single
   * client/session. Previously used db.query('BEGIN') which hangs on Supabase
   * transaction-mode pgbouncer because each pool.query() may bind a different backend.
   */
  /**
   * Abate o valor da cobrança nas parcelas em aberto da venda, da mais antiga para
   * a mais nova, e registra cada abatimento em collection_allocations.
   *
   * Roda DENTRO da transação de aprovação (usa `client`, nunca db.query — o pool
   * de produção é pgbouncer em transaction mode com max:1).
   */
  private async settleInstallments(client: any, collectionId: string): Promise<void> {
    const colRes = await client.query(
      'SELECT sale_id, amount FROM collections WHERE id = $1',
      [collectionId]
    );
    const col = colRes.rows[0];
    if (!col?.sale_id) return;

    let remaining = Number(col.amount) || 0;
    if (remaining <= 0) return;

    // Bloqueia as parcelas para não haver duas cobranças abatendo a mesma
    const paymentsRes = await client.query(
      `SELECT id, amount, COALESCE(paid_amount, 0) AS paid_amount
       FROM sale_payments
       WHERE sale_id = $1 AND status <> 'CANCELLED' AND COALESCE(paid_amount, 0) < amount
       ORDER BY due_date ASC, installment_number ASC
       FOR UPDATE`,
      [col.sale_id]
    );

    for (const p of paymentsRes.rows) {
      if (remaining <= 0) break;
      const open = Number(p.amount) - Number(p.paid_amount);
      if (open <= 0) continue;

      const applied = Math.min(open, remaining);
      const newPaid = Number(p.paid_amount) + applied;
      const fullyPaid = newPaid >= Number(p.amount);

      await client.query(
        `UPDATE sale_payments
         SET paid_amount = $1::int,
             status = CASE WHEN $2::boolean THEN 'PAID' ELSE status END,
             paid_date = CASE WHEN $2::boolean THEN COALESCE(paid_date, CURRENT_DATE) ELSE paid_date END
         WHERE id = $3`,
        [newPaid, fullyPaid, p.id]
      );

      await client.query(
        `INSERT INTO collection_allocations (collection_id, sale_payment_id, amount)
         VALUES ($1, $2, $3)`,
        [collectionId, p.id, applied]
      );

      remaining -= applied;
    }

    // Sobra (cliente adiantou mais do que devia) fica sem alocação — aparece no
    // saldo da venda e não some: o gestor decide o que fazer.
    await this.recalcSaleTotals(client, col.sale_id);
  }

  /**
   * Desfaz o que a cobrança abateu (rejeição/estorno de uma cobrança já aprovada).
   */
  private async unsettleInstallments(client: any, collectionId: string): Promise<void> {
    const allocRes = await client.query(
      'SELECT sale_payment_id, amount FROM collection_allocations WHERE collection_id = $1',
      [collectionId]
    );
    if (allocRes.rows.length === 0) return;

    for (const a of allocRes.rows) {
      // $1::int explícito: sem o cast o Postgres não resolve o tipo de
      // GREATEST(integer - unknown, 0) e recusa a atribuição (42804).
      await client.query(
        `UPDATE sale_payments
         SET paid_amount = GREATEST(COALESCE(paid_amount, 0) - $1::int, 0),
             status = CASE
               WHEN GREATEST(COALESCE(paid_amount, 0) - $1::int, 0) < amount AND status = 'PAID'
                 THEN 'PENDING' ELSE status END,
             paid_date = CASE
               WHEN GREATEST(COALESCE(paid_amount, 0) - $1::int, 0) = 0 THEN NULL ELSE paid_date END
         WHERE id = $2`,
        [Number(a.amount), a.sale_payment_id]
      );
    }

    await client.query('DELETE FROM collection_allocations WHERE collection_id = $1', [collectionId]);

    const saleRes = await client.query('SELECT sale_id FROM collections WHERE id = $1', [collectionId]);
    if (saleRes.rows[0]?.sale_id) {
      await this.recalcSaleTotals(client, saleRes.rows[0].sale_id);
    }
  }

  /** total_paid / total_pending / status da venda a partir do que foi quitado */
  private async recalcSaleTotals(client: any, saleId: string): Promise<void> {
    await client.query(
      `UPDATE sales s
       SET total_paid = COALESCE(t.paid, 0),
           total_pending = GREATEST(s.total - COALESCE(t.paid, 0), 0),
           -- sales.status é o enum "SaleStatus"; sem o cast o Postgres recusa text
           status = (CASE
             WHEN COALESCE(t.paid, 0) >= s.total THEN 'PAID'
             WHEN COALESCE(t.paid, 0) > 0        THEN 'PARTIAL'
             WHEN t.has_overdue                  THEN 'OVERDUE'
             ELSE 'PENDING'
           END)::"SaleStatus"
       FROM (
         SELECT
           COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::int AS paid,
           BOOL_OR(status = 'PENDING' AND due_date::date < CURRENT_DATE) AS has_overdue
         FROM sale_payments WHERE sale_id = $1 AND status <> 'CANCELLED'
       ) t
       WHERE s.id = $1`,
      [saleId]
    );
  }

  async approve(id: string, approvedBy: string): Promise<Collection> {
    await db.transaction(async (client) => {
      // Só aprova o que está aguardando aprovação — evita aprovar duas vezes e
      // abater o valor em dobro nas parcelas.
      const upd = await client.query(
        `UPDATE collections
         SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND status = 'PENDING_APPROVAL'
         RETURNING id`,
        [approvedBy, id]
      );
      if (upd.rowCount === 0) {
        throw Object.assign(new Error('Cobrança não está aguardando aprovação'), {
          statusCode: 400,
          code: 'INVALID_STATUS',
        });
      }

      // Baixa das parcelas da venda (o motivo de existir a cobrança)
      await this.settleInstallments(client, id);

      // Verificar se vendedor tem config de comissão sobre cobranças
      const configResult = await client.query(
        `SELECT scc.* FROM seller_commission_configs scc
         WHERE scc.seller_id = (SELECT seller_id FROM collections WHERE id = $1)
           AND scc.active = true`,
        [id]
      );

      if (configResult.rows.length > 0) {
        const config = configResult.rows[0];
        const rate = parseFloat(config.commission_on_collections);

        if (rate > 0) {
          // Buscar dados da cobrança para calcular comissão
          const collectionResult = await client.query(
            'SELECT seller_id, amount FROM collections WHERE id = $1',
            [id]
          );

          if (collectionResult.rows.length > 0) {
            const collection = collectionResult.rows[0];

            await client.query(
              // Casts explícitos: sem eles o Postgres via `unknown * unknown` e
              // recusava o INSERT ("operator is not unique"), quebrando a aprovação
              // de qualquer cobrança de vendedor com comissão configurada.
              `INSERT INTO commission_entries (seller_id, source_type, source_id, base_amount, commission_rate, commission_amount, calculation_mode, status)
               VALUES ($1, 'COLLECTION', $2, $3::int, $4::numeric, ROUND($3::numeric * $4::numeric / 100), 'COLLECTION', 'PENDING')`,
              [collection.seller_id, id, collection.amount, rate]
            );
          }
        }
      }
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Cobrança não encontrada após aprovação');
    }
    return updated;
  }

  /**
   * Rejeitar cobrança
   */
  /**
   * Estorna uma cobrança já aprovada/depositada: devolve as parcelas que ela
   * quitou, cancela a comissão gerada e marca como rejeitada.
   */
  async revert(id: string, userId: string, reason: string): Promise<Collection> {
    await db.transaction(async (client) => {
      await this.unsettleInstallments(client, id);

      // A comissão sobre a cobrança deixa de existir — só se ainda não foi paga
      await client.query(
        `DELETE FROM commission_entries
         WHERE source_type = 'COLLECTION' AND source_id = $1 AND status = 'PENDING'`,
        [id]
      );

      const upd = await client.query(
        `UPDATE collections
         SET status = 'REJECTED', approved_by = $1, rejected_reason = $2, updated_at = NOW()
         WHERE id = $3 AND status IN ('APPROVED', 'DEPOSITED')
         RETURNING id`,
        [userId, `Estorno: ${reason}`, id]
      );
      if (upd.rowCount === 0) {
        throw Object.assign(new Error('Cobrança não está aprovada nem depositada'), {
          statusCode: 400,
          code: 'INVALID_STATUS',
        });
      }
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Cobrança não encontrada após estorno');
    }
    return updated;
  }

  async reject(id: string, approvedBy: string, reason: string): Promise<Collection> {
    await db.transaction(async (client) => {
      // Rejeitar uma cobrança JÁ aprovada é um estorno: devolve as parcelas
      // que ela quitou ao estado anterior antes de mudar o status.
      await this.unsettleInstallments(client, id);

      await client.query(
        `UPDATE collections
         SET status = 'REJECTED', approved_by = $1, rejected_reason = $2, updated_at = NOW()
         WHERE id = $3`,
        [approvedBy, reason, id]
      );
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Cobrança não encontrada após rejeição');
    }
    return updated;
  }

  /**
   * Marcar cobrança como depositada
   */
  async deposit(id: string): Promise<Collection> {
    await db.query(
      `UPDATE collections SET status = 'DEPOSITED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Cobrança não encontrada após depósito');
    }
    return updated;
  }

  /**
   * Listar cobranças de uma venda + totais por status
   */
  async getCollectionsBySale(saleId: string) {
    const collectionsResult = await db.query(
      `SELECT
        col.*,
        c.name as customer_name,
        u.name as seller_name,
        s.sale_number,
        s.total as sale_total,
        s.total_paid as sale_total_paid
       FROM collections col
       LEFT JOIN customers c ON col.customer_id = c.id
       LEFT JOIN users u ON col.seller_id = u.id
       LEFT JOIN sales s ON col.sale_id = s.id
       WHERE col.sale_id = $1
       ORDER BY col.created_at DESC`,
      [saleId]
    );

    // Somas por status
    const sumResult = await db.query(
      `SELECT
        status,
        COUNT(*)::int as count,
        COALESCE(SUM(amount), 0)::int as total_amount
       FROM collections
       WHERE sale_id = $1
       GROUP BY status`,
      [saleId]
    );

    const summary: Record<string, { count: number; totalAmount: number }> = {};
    for (const row of sumResult.rows) {
      summary[row.status] = {
        count: row.count,
        totalAmount: row.total_amount,
      };
    }

    return {
      data: collectionsResult.rows.map((row) => this.mapToCollection(row)),
      summary,
    };
  }

  /**
   * Estatísticas agregadas de cobranças
   */
  async getStats(filters: CollectionFilters): Promise<CollectionStats> {
    const queryParams: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (filters.sellerId) {
      conditions.push(`seller_id = $${paramIndex}`);
      queryParams.push(filters.sellerId);
      paramIndex++;
    }

    if (filters.customerId) {
      conditions.push(`customer_id = $${paramIndex}`);
      queryParams.push(filters.customerId);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(filters.endDate + 'T23:59:59');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*)::int as total_collected,
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int as pending_approval,
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved,
        COUNT(*) FILTER (WHERE status = 'DEPOSITED')::int as deposited,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int as rejected,
        COALESCE(SUM(amount), 0)::int as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING_APPROVAL'), 0)::int as pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0)::int as approved_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'DEPOSITED'), 0)::int as deposited_amount
      FROM collections
      ${whereClause}
    `;

    const result = await db.query(query, queryParams);
    const row = result.rows[0];

    return {
      totalCollected: row.total_collected,
      pendingApproval: row.pending_approval,
      approved: row.approved,
      deposited: row.deposited,
      rejected: row.rejected,
      totalAmount: row.total_amount,
      pendingAmount: row.pending_amount,
      approvedAmount: row.approved_amount,
      depositedAmount: row.deposited_amount,
    };
  }

  /**
   * Cobranças de um vendedor específico com filtros
   */
  async getSellerCollections(sellerId: string, filters: CollectionFilters) {
    return this.findAll({ ...filters, sellerId });
  }

  /**
   * Mapear row do banco para Collection
   */
  private mapToCollection(row: any): Collection {
    return {
      id: row.id,
      collectionNumber: row.collection_number,
      saleId: row.sale_id,
      customerId: row.customer_id,
      sellerId: row.seller_id,
      amount: row.amount,
      paymentMethod: row.payment_method,
      status: row.status,
      checkNumber: row.check_number || undefined,
      checkBank: row.check_bank || undefined,
      checkDate: row.check_date || undefined,
      photoUrls: row.photo_urls || undefined,
      notes: row.notes || undefined,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      rejectedReason: row.rejected_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: row.customer_name
        ? { id: row.customer_id, name: row.customer_name }
        : undefined,
      seller: row.seller_name
        ? { id: row.seller_id, name: row.seller_name }
        : undefined,
      sale: row.sale_number
        ? {
            id: row.sale_id,
            saleNumber: row.sale_number,
            total: row.sale_total,
            totalPaid: row.sale_total_paid,
          }
        : undefined,
    };
  }
}
