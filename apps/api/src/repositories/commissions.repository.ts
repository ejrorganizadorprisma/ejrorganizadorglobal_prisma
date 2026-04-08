import { db } from '../config/database';
import type {
  CommissionFilters,
  CommissionEntryStatus,
  CommissionSourceType,
  CreateSettlementDTO,
  UpdateCommissionConfigDTO,
  CommissionSummary,
} from '@ejr/shared-types';

// ─── Local types for /my/* endpoints ─────────────────────
interface MySummary {
  currentMonth: number;
  previousMonth: number;
  deltaPercent: number;
  totalPending: number;
  totalSettled: number;
  totalAllTime: number;
  entriesCount: number;
  configSalesRate: number;
  configCollectionsRate: number;
}

interface MyEntriesFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  sourceType?: 'SALE' | 'COLLECTION';
  status?: 'PENDING' | 'SETTLED';
  page?: number;
  limit?: number;
}

interface MyEntry {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  createdAt: any;
}

interface MyMonthlyPoint {
  month: string;
  amount: number;
  entriesCount: number;
}

interface MyCustomerAgg {
  customerId: string;
  customerName: string;
  totalAmount: number;
  entriesCount: number;
}

export class CommissionsRepository {
  /**
   * Get commission config for a specific seller
   */
  async getConfig(sellerId: string) {
    const result = await db.query(
      `SELECT scc.*, u.name as seller_name, u.email as seller_email
       FROM seller_commission_configs scc
       JOIN users u ON scc.seller_id = u.id
       WHERE scc.seller_id = $1`,
      [sellerId]
    );
    if (result.rows.length === 0) return null;
    return this.mapConfig(result.rows[0]);
  }

  /**
   * Upsert commission config for a seller
   */
  async upsertConfig(sellerId: string, dto: UpdateCommissionConfigDTO, createdBy: string) {
    const id = `comcfg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const result = await db.query(
      `INSERT INTO seller_commission_configs (id, seller_id, commission_on_sales, commission_on_collections, active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (seller_id) DO UPDATE SET
         commission_on_sales = EXCLUDED.commission_on_sales,
         commission_on_collections = EXCLUDED.commission_on_collections,
         active = COALESCE(EXCLUDED.active, seller_commission_configs.active),
         updated_at = NOW()
       RETURNING *`,
      [id, sellerId, dto.commissionOnSales, dto.commissionOnCollections, dto.active ?? true, createdBy]
    );
    return this.mapConfig(result.rows[0]);
  }

  /**
   * Get all commission configs with seller info
   */
  async getAllConfigs() {
    const result = await db.query(
      `SELECT scc.*, u.name as seller_name, u.email as seller_email
       FROM seller_commission_configs scc
       JOIN users u ON scc.seller_id = u.id
       ORDER BY u.name`
    );
    return result.rows.map((row: any) => this.mapConfig(row));
  }

  /**
   * Create a commission entry
   */
  async createEntry(
    sellerId: string,
    sourceType: CommissionSourceType,
    sourceId: string,
    baseAmount: number,
    commissionRate: number
  ) {
    const id = `coment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const commissionAmount = Math.round(baseAmount * commissionRate / 100);

    const result = await db.query(
      `INSERT INTO commission_entries (id, seller_id, source_type, source_id, base_amount, commission_rate, commission_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [id, sellerId, sourceType, sourceId, baseAmount, commissionRate, commissionAmount]
    );
    return this.mapEntry(result.rows[0]);
  }

  /**
   * Get commission entries with filters and pagination
   */
  async getEntries(filters: CommissionFilters) {
    const { page = 1, limit = 20, sellerId, sourceType, status, startDate, endDate } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (sellerId) {
      conditions.push(`ce.seller_id = $${paramIndex}`);
      params.push(sellerId);
      paramIndex++;
    }
    if (sourceType) {
      conditions.push(`ce.source_type = $${paramIndex}`);
      params.push(sourceType);
      paramIndex++;
    }
    if (status) {
      conditions.push(`ce.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (startDate) {
      conditions.push(`ce.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      conditions.push(`ce.created_at <= $${paramIndex}::date + interval '1 day'`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM commission_entries ce ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Data
    const dataResult = await db.query(
      `SELECT ce.*, u.name as seller_name
       FROM commission_entries ce
       JOIN users u ON ce.seller_id = u.id
       ${whereClause}
       ORDER BY ce.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows.map((row: any) => this.mapEntry(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get summary for a single seller
   */
  async getSellerSummary(sellerId: string): Promise<CommissionSummary | null> {
    // Get config
    const configResult = await db.query(
      `SELECT scc.*, u.name as seller_name
       FROM seller_commission_configs scc
       JOIN users u ON scc.seller_id = u.id
       WHERE scc.seller_id = $1`,
      [sellerId]
    );
    if (configResult.rows.length === 0) return null;
    const config = configResult.rows[0];

    // Aggregate PENDING
    const pendingResult = await db.query(
      `SELECT COALESCE(SUM(commission_amount), 0) as total
       FROM commission_entries
       WHERE seller_id = $1 AND status = 'PENDING'`,
      [sellerId]
    );

    // Aggregate SETTLED
    const settledResult = await db.query(
      `SELECT COALESCE(SUM(commission_amount), 0) as total
       FROM commission_entries
       WHERE seller_id = $1 AND status = 'SETTLED'`,
      [sellerId]
    );

    // Current month earned (all entries this month regardless of status)
    const currentMonthResult = await db.query(
      `SELECT COALESCE(SUM(commission_amount), 0) as total
       FROM commission_entries
       WHERE seller_id = $1
         AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
      [sellerId]
    );

    return {
      sellerId,
      sellerName: config.seller_name,
      totalPending: parseInt(pendingResult.rows[0].total),
      totalSettled: parseInt(settledResult.rows[0].total),
      currentMonthEarned: parseInt(currentMonthResult.rows[0].total),
      configSalesRate: parseFloat(config.commission_on_sales),
      configCollectionsRate: parseFloat(config.commission_on_collections),
    };
  }

  /**
   * Get summaries for all sellers with configs
   */
  async getAllSummaries(): Promise<CommissionSummary[]> {
    const configsResult = await db.query(
      `SELECT scc.seller_id FROM seller_commission_configs scc WHERE scc.active = true`
    );

    const summaries: CommissionSummary[] = [];
    for (const row of configsResult.rows) {
      const summary = await this.getSellerSummary(row.seller_id);
      if (summary) summaries.push(summary);
    }
    return summaries;
  }

  /**
   * Generate settlement number: SET-YYYY-NNNN
   */
  async generateSettlementNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SET-${year}-`;

    const result = await db.query(
      `SELECT settlement_number
       FROM commission_settlements
       WHERE settlement_number LIKE $1
       ORDER BY settlement_number DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = parseInt(result.rows[0].settlement_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Create a settlement in a transaction
   */
  async createSettlement(dto: CreateSettlementDTO, createdBy: string) {
    return db.transaction(async (client) => {
      const settlementNumber = await this.generateSettlementNumber();
      const id = `comset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Sum all PENDING entries for this seller in the date range
      const entriesResult = await client.query(
        `SELECT id, commission_amount
         FROM commission_entries
         WHERE seller_id = $1
           AND status = 'PENDING'
           AND created_at >= $2
           AND created_at <= $3::date + interval '1 day'`,
        [dto.sellerId, dto.periodStart, dto.periodEnd]
      );

      if (entriesResult.rows.length === 0) {
        throw new Error('Nenhuma comissão pendente encontrada para o período informado');
      }

      const totalAmount = entriesResult.rows.reduce(
        (sum: number, row: any) => sum + row.commission_amount,
        0
      );

      // Create settlement
      await client.query(
        `INSERT INTO commission_settlements (id, settlement_number, seller_id, total_amount, period_start, period_end, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)`,
        [id, settlementNumber, dto.sellerId, totalAmount, dto.periodStart, dto.periodEnd, dto.notes || null, createdBy]
      );

      // Update entries to SETTLED
      const entryIds = entriesResult.rows.map((r: any) => r.id);
      for (const entryId of entryIds) {
        await client.query(
          `UPDATE commission_entries SET status = 'SETTLED', settlement_id = $1 WHERE id = $2`,
          [id, entryId]
        );
      }

      // Fetch created settlement
      const settlementResult = await client.query(
        `SELECT cs.*, u.name as seller_name
         FROM commission_settlements cs
         JOIN users u ON cs.seller_id = u.id
         WHERE cs.id = $1`,
        [id]
      );

      return this.mapSettlement(settlementResult.rows[0]);
    });
  }

  /**
   * Mark settlement as paid
   */
  async paySettlement(id: string, paidBy: string) {
    const result = await db.query(
      `UPDATE commission_settlements
       SET status = 'PAID', paid_at = NOW(), paid_by = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [paidBy, id]
    );

    if (result.rows.length === 0) return null;

    // Fetch with seller name
    const fullResult = await db.query(
      `SELECT cs.*, u.name as seller_name
       FROM commission_settlements cs
       JOIN users u ON cs.seller_id = u.id
       WHERE cs.id = $1`,
      [id]
    );

    return this.mapSettlement(fullResult.rows[0]);
  }

  /**
   * Get settlements with filters and pagination
   */
  async getSettlements(filters: {
    sellerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, sellerId, status, startDate, endDate } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (sellerId) {
      conditions.push(`cs.seller_id = $${paramIndex}`);
      params.push(sellerId);
      paramIndex++;
    }
    if (status) {
      conditions.push(`cs.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (startDate) {
      conditions.push(`cs.period_start >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      conditions.push(`cs.period_end <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM commission_settlements cs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Data
    const dataResult = await db.query(
      `SELECT cs.*, u.name as seller_name
       FROM commission_settlements cs
       JOIN users u ON cs.seller_id = u.id
       ${whereClause}
       ORDER BY cs.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows.map((row: any) => this.mapSettlement(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single settlement by ID, including its entries
   */
  async getSettlementById(id: string) {
    const result = await db.query(
      `SELECT cs.*, u.name as seller_name
       FROM commission_settlements cs
       JOIN users u ON cs.seller_id = u.id
       WHERE cs.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    // Fetch entries for this settlement
    const entriesResult = await db.query(
      `SELECT ce.*, u.name as seller_name
       FROM commission_entries ce
       JOIN users u ON ce.seller_id = u.id
       WHERE ce.settlement_id = $1
       ORDER BY ce.created_at DESC`,
      [id]
    );

    const settlement = this.mapSettlement(result.rows[0]);
    settlement.entries = entriesResult.rows.map((row: any) => this.mapEntry(row));

    return settlement;
  }

  // ─── My (authenticated seller) ───────────────────────────

  /**
   * Get summary metrics for the authenticated seller
   */
  async getMySummary(sellerId: string): Promise<MySummary> {
    // Aggregate counters in a single query for efficiency
    const aggResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN commission_amount ELSE 0 END), 0) AS current_month,
         COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN commission_amount ELSE 0 END), 0) AS previous_month,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN commission_amount ELSE 0 END), 0) AS total_pending,
         COALESCE(SUM(CASE WHEN status = 'SETTLED' THEN commission_amount ELSE 0 END), 0) AS total_settled,
         COALESCE(SUM(commission_amount), 0) AS total_all_time,
         COUNT(*)::int AS entries_count
       FROM commission_entries
       WHERE seller_id = $1`,
      [sellerId]
    );

    const row = aggResult.rows[0];
    const currentMonth = parseInt(row.current_month);
    const previousMonth = parseInt(row.previous_month);

    let deltaPercent = 0;
    if (previousMonth === 0 && currentMonth > 0) {
      deltaPercent = 100;
    } else if (previousMonth === 0 && currentMonth === 0) {
      deltaPercent = 0;
    } else {
      deltaPercent = Math.round(((currentMonth - previousMonth) / previousMonth) * 100);
    }

    // Fetch config (may not exist)
    const configResult = await db.query(
      `SELECT commission_on_sales, commission_on_collections
       FROM seller_commission_configs
       WHERE seller_id = $1`,
      [sellerId]
    );

    const configSalesRate = configResult.rows.length > 0
      ? parseFloat(configResult.rows[0].commission_on_sales)
      : 0;
    const configCollectionsRate = configResult.rows.length > 0
      ? parseFloat(configResult.rows[0].commission_on_collections)
      : 0;

    return {
      currentMonth,
      previousMonth,
      deltaPercent,
      totalPending: parseInt(row.total_pending),
      totalSettled: parseInt(row.total_settled),
      totalAllTime: parseInt(row.total_all_time),
      entriesCount: parseInt(row.entries_count),
      configSalesRate,
      configCollectionsRate,
    };
  }

  /**
   * Get paginated commission entries for the authenticated seller
   * with customer and source info via JOINs.
   */
  async getMyEntries(sellerId: string, filters: MyEntriesFilters) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`ce.seller_id = $1`];
    const params: any[] = [sellerId];
    let paramIndex = 2;

    if (filters.startDate) {
      conditions.push(`ce.created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }
    if (filters.endDate) {
      conditions.push(`ce.created_at <= $${paramIndex}::date + interval '1 day'`);
      params.push(filters.endDate);
      paramIndex++;
    }
    if (filters.sourceType) {
      conditions.push(`ce.source_type = $${paramIndex}`);
      params.push(filters.sourceType);
      paramIndex++;
    }
    if (filters.status) {
      conditions.push(`ce.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.customerId) {
      conditions.push(`(col.customer_id = $${paramIndex} OR s.customer_id = $${paramIndex})`);
      params.push(filters.customerId);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const baseFrom = `
      FROM commission_entries ce
      LEFT JOIN collections col ON ce.source_type = 'COLLECTION' AND ce.source_id = col.id
      LEFT JOIN sales s ON ce.source_type = 'SALE' AND ce.source_id = s.id
      LEFT JOIN customers c ON c.id = (
        CASE ce.source_type
          WHEN 'COLLECTION' THEN col.customer_id
          WHEN 'SALE' THEN s.customer_id
        END
      )
    `;

    // Count
    const countResult = await db.query(
      `SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Data
    const dataResult = await db.query(
      `SELECT ce.*,
         CASE ce.source_type
           WHEN 'COLLECTION' THEN col.collection_number
           WHEN 'SALE' THEN s.sale_number
         END AS source_number,
         CASE ce.source_type
           WHEN 'COLLECTION' THEN col.customer_id
           WHEN 'SALE' THEN s.customer_id
         END AS resolved_customer_id,
         c.name AS customer_name
       ${baseFrom}
       ${whereClause}
       ORDER BY ce.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const data: MyEntry[] = dataResult.rows.map((row: any) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceNumber: row.source_number || null,
      customerId: row.resolved_customer_id || null,
      customerName: row.customer_name || null,
      baseAmount: row.base_amount,
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: row.commission_amount,
      status: row.status,
      createdAt: row.created_at,
    }));

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
   * Get commission amounts grouped by month for the last N months
   */
  async getMyMonthly(sellerId: string, months: number): Promise<MyMonthlyPoint[]> {
    const result = await db.query(
      `WITH months AS (
         SELECT date_trunc('month', generate_series(
           date_trunc('month', CURRENT_DATE) - ((($2::int - 1))::text || ' months')::interval,
           date_trunc('month', CURRENT_DATE),
           '1 month'::interval
         )) AS month_start
       )
       SELECT
         to_char(m.month_start, 'YYYY-MM') AS month,
         COALESCE(SUM(ce.commission_amount), 0)::bigint AS amount,
         COUNT(ce.id)::int AS entries_count
       FROM months m
       LEFT JOIN commission_entries ce
         ON ce.seller_id = $1
        AND date_trunc('month', ce.created_at) = m.month_start
       GROUP BY m.month_start
       ORDER BY m.month_start ASC`,
      [sellerId, months]
    );

    return result.rows.map((row: any) => ({
      month: row.month,
      amount: parseInt(row.amount),
      entriesCount: parseInt(row.entries_count),
    }));
  }

  /**
   * Get top customers ranked by commission amount generated for this seller
   */
  async getMyByCustomer(
    sellerId: string,
    limit: number,
    startDate?: string,
    endDate?: string
  ): Promise<MyCustomerAgg[]> {
    const conditions: string[] = [`ce.seller_id = $1`];
    const params: any[] = [sellerId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`ce.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      conditions.push(`ce.created_at <= $${paramIndex}::date + interval '1 day'`);
      params.push(endDate);
      paramIndex++;
    }

    // Exclude entries whose customer cannot be resolved (orphaned source rows)
    conditions.push(`(
      CASE ce.source_type
        WHEN 'COLLECTION' THEN col.customer_id
        WHEN 'SALE' THEN s.customer_id
      END
    ) IS NOT NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(
      `SELECT
         (CASE ce.source_type
           WHEN 'COLLECTION' THEN col.customer_id
           WHEN 'SALE' THEN s.customer_id
         END) AS customer_id,
         c.name AS customer_name,
         COALESCE(SUM(ce.commission_amount), 0)::bigint AS total_amount,
         COUNT(ce.id)::int AS entries_count
       FROM commission_entries ce
       LEFT JOIN collections col ON ce.source_type = 'COLLECTION' AND ce.source_id = col.id
       LEFT JOIN sales s ON ce.source_type = 'SALE' AND ce.source_id = s.id
       LEFT JOIN customers c ON c.id = (
         CASE ce.source_type
           WHEN 'COLLECTION' THEN col.customer_id
           WHEN 'SALE' THEN s.customer_id
         END
       )
       ${whereClause}
       GROUP BY 1, c.name
       ORDER BY total_amount DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    return result.rows.map((row: any) => ({
      customerId: row.customer_id,
      customerName: row.customer_name,
      totalAmount: parseInt(row.total_amount),
      entriesCount: parseInt(row.entries_count),
    }));
  }

  // ─── Mappers ─────────────────────────────────────────────

  private mapConfig(row: any) {
    return {
      id: row.id,
      sellerId: row.seller_id,
      commissionOnSales: parseFloat(row.commission_on_sales),
      commissionOnCollections: parseFloat(row.commission_on_collections),
      active: row.active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      seller: row.seller_name
        ? { id: row.seller_id, name: row.seller_name, email: row.seller_email }
        : undefined,
    };
  }

  private mapEntry(row: any) {
    return {
      id: row.id,
      sellerId: row.seller_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      baseAmount: row.base_amount,
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: row.commission_amount,
      status: row.status,
      settlementId: row.settlement_id || undefined,
      createdAt: row.created_at,
      seller: row.seller_name
        ? { id: row.seller_id, name: row.seller_name }
        : undefined,
    };
  }

  private mapSettlement(row: any) {
    return {
      id: row.id,
      settlementNumber: row.settlement_number,
      sellerId: row.seller_id,
      totalAmount: row.total_amount,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      paidAt: row.paid_at || undefined,
      paidBy: row.paid_by || undefined,
      notes: row.notes || undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      seller: row.seller_name
        ? { id: row.seller_id, name: row.seller_name }
        : undefined,
      entries: undefined as any,
    };
  }
}
