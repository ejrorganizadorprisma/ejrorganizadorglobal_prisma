import { db } from '../config/database';
import type {
  CommissionFilters,
  CommissionEntryStatus,
  CommissionSourceType,
  CreateSettlementDTO,
  UpdateCommissionConfigDTO,
  CommissionSummary,
} from '@ejr/shared-types';

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
