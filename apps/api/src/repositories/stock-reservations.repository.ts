import { db } from '../config/database';

export type ReservationType = 'PRODUCTION_ORDER' | 'SERVICE_ORDER' | 'QUOTE' | 'MANUAL';
export type ReservationStatus = 'ACTIVE' | 'CONSUMED' | 'CANCELLED' | 'EXPIRED';

export interface StockReservation {
  id: string;
  productId: string;
  quantity: number;
  reservedForType: ReservationType;
  reservedForId?: string;
  reservedBy?: string;
  reason?: string;
  status: ReservationStatus;
  expiresAt?: string;
  createdAt: string;
  consumedAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export interface CreateReservationDTO {
  productId: string;
  quantity: number;
  reservedForType: ReservationType;
  reservedForId?: string;
  reservedBy?: string;
  reason?: string;
  expiresAt?: string;
  notes?: string;
}

export interface UpdateReservationDTO {
  quantity?: number;
  status?: ReservationStatus;
  expiresAt?: string;
  notes?: string;
}

export class StockReservationsRepository {
  async findMany(filters?: {
    productId?: string;
    status?: ReservationStatus;
    reservedForType?: ReservationType;
    page?: number;
    limit?: number;
  }) {
    const { productId, status, reservedForType, page = 1, limit = 50 } = filters || {};

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (productId) {
      conditions.push(`sr.product_id = $${paramIndex++}`);
      params.push(productId);
    }

    if (status) {
      conditions.push(`sr.status = $${paramIndex++}`);
      params.push(status);
    }

    if (reservedForType) {
      conditions.push(`sr.reserved_for_type = $${paramIndex++}`);
      params.push(reservedForType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    params.push(limit, offset);

    const query = `
      SELECT
        sr.*,
        json_build_object('code', p.code, 'name', p.name) as products
      FROM stock_reservations sr
      LEFT JOIN products p ON p.id = sr.product_id
      ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_reservations sr
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)),
    ]);

    return {
      data: dataResult.rows.map(this.mapToReservation),
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  async findById(id: string) {
    const query = `
      SELECT
        sr.*,
        json_build_object('code', p.code, 'name', p.name) as products
      FROM stock_reservations sr
      LEFT JOIN products p ON p.id = sr.product_id
      WHERE sr.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapToReservation(result.rows[0]);
  }

  async create(dto: CreateReservationDTO) {
    const query = `
      INSERT INTO stock_reservations (
        product_id, quantity, reserved_for_type, reserved_for_id,
        reserved_by, reason, expires_at, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      dto.productId,
      dto.quantity,
      dto.reservedForType,
      dto.reservedForId || null,
      dto.reservedBy || null,
      dto.reason || null,
      dto.expiresAt || null,
      dto.notes || null,
      'ACTIVE',
    ]);

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar reserva');
    }

    // Fetch with product details
    const id = result.rows[0].id;
    const reservation = await this.findById(id);

    if (!reservation) {
      throw new Error('Erro ao buscar reserva criada');
    }

    return reservation;
  }

  async update(id: string, dto: UpdateReservationDTO) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.quantity !== undefined) {
      updates.push(`quantity = $${paramIndex++}`);
      params.push(dto.quantity);
    }

    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(dto.status);

      if (dto.status === 'CONSUMED') {
        updates.push(`consumed_at = $${paramIndex++}`);
        params.push(new Date().toISOString());
      } else if (dto.status === 'CANCELLED') {
        updates.push(`cancelled_at = $${paramIndex++}`);
        params.push(new Date().toISOString());
      }
    }

    if (dto.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params.push(dto.expiresAt);
    }

    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(dto.notes);
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    params.push(id);

    const query = `
      UPDATE stock_reservations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      throw new Error('Erro ao atualizar reserva');
    }

    // Fetch with product details
    const reservation = await this.findById(id);

    if (!reservation) {
      throw new Error('Erro ao buscar reserva atualizada');
    }

    return reservation;
  }

  async delete(id: string) {
    const query = 'DELETE FROM stock_reservations WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Reserva não encontrada');
    }

    return { success: true };
  }

  async getByProduct(productId: string, activeOnly = true) {
    const params: any[] = [productId];
    let whereClause = 'WHERE product_id = $1';

    if (activeOnly) {
      whereClause += ' AND status = $2';
      params.push('ACTIVE');
    }

    const query = `
      SELECT * FROM stock_reservations
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, params);
    return result.rows.map(this.mapToReservation);
  }

  async getTotalReserved(productId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM stock_reservations
      WHERE product_id = $1 AND status = $2
    `;

    const result = await db.query(query, [productId, 'ACTIVE']);
    return parseFloat(result.rows[0].total) || 0;
  }

  async cancelExpired() {
    const query = `
      UPDATE stock_reservations
      SET status = $1, cancelled_at = $2
      WHERE status = $3 AND expires_at < $4
      RETURNING *
    `;

    const now = new Date().toISOString();
    const result = await db.query(query, ['EXPIRED', now, 'ACTIVE', now]);

    return result.rowCount || 0;
  }

  private mapToReservation(data: any): StockReservation {
    return {
      id: data.id,
      productId: data.product_id,
      quantity: data.quantity,
      reservedForType: data.reserved_for_type,
      reservedForId: data.reserved_for_id,
      reservedBy: data.reserved_by,
      reason: data.reason,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      consumedAt: data.consumed_at,
      cancelledAt: data.cancelled_at,
      notes: data.notes,
    };
  }
}
