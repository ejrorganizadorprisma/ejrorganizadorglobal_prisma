import { supabase } from '../config/supabase';

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

    let query = supabase
      .from('stock_reservations')
      .select('*, products(code, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (reservedForType) {
      query = query.eq('reserved_for_type', reservedForType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar reservas: ${error.message}`);
    }

    return {
      data: (data || []).map(this.mapToReservation),
      total: count || 0,
    };
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('stock_reservations')
      .select('*, products(code, name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar reserva: ${error.message}`);
    }

    return this.mapToReservation(data);
  }

  async create(dto: CreateReservationDTO) {
    const { data, error } = await supabase
      .from('stock_reservations')
      .insert({
        product_id: dto.productId,
        quantity: dto.quantity,
        reserved_for_type: dto.reservedForType,
        reserved_for_id: dto.reservedForId,
        reserved_by: dto.reservedBy,
        reason: dto.reason,
        expires_at: dto.expiresAt,
        notes: dto.notes,
        status: 'ACTIVE',
      })
      .select('*, products(code, name)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar reserva: ${error.message}`);
    }

    return this.mapToReservation(data);
  }

  async update(id: string, dto: UpdateReservationDTO) {
    const updateData: any = {};

    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'CONSUMED') {
        updateData.consumed_at = new Date().toISOString();
      } else if (dto.status === 'CANCELLED') {
        updateData.cancelled_at = new Date().toISOString();
      }
    }
    if (dto.expiresAt !== undefined) updateData.expires_at = dto.expiresAt;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const { data, error } = await supabase
      .from('stock_reservations')
      .update(updateData)
      .eq('id', id)
      .select('*, products(code, name)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar reserva: ${error.message}`);
    }

    return this.mapToReservation(data);
  }

  async delete(id: string) {
    const { error } = await supabase
      .from('stock_reservations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar reserva: ${error.message}`);
    }

    return { success: true };
  }

  async getByProduct(productId: string, activeOnly = true) {
    let query = supabase
      .from('stock_reservations')
      .select('*')
      .eq('product_id', productId);

    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar reservas do produto: ${error.message}`);
    }

    return (data || []).map(this.mapToReservation);
  }

  async getTotalReserved(productId: string): Promise<number> {
    const { data, error } = await supabase
      .from('stock_reservations')
      .select('quantity')
      .eq('product_id', productId)
      .eq('status', 'ACTIVE');

    if (error) {
      throw new Error(`Erro ao calcular total reservado: ${error.message}`);
    }

    return (data || []).reduce((sum, item) => sum + item.quantity, 0);
  }

  async cancelExpired() {
    const { data, error } = await supabase
      .from('stock_reservations')
      .update({
        status: 'EXPIRED',
        cancelled_at: new Date().toISOString(),
      })
      .eq('status', 'ACTIVE')
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      throw new Error(`Erro ao cancelar reservas expiradas: ${error.message}`);
    }

    return data?.length || 0;
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
