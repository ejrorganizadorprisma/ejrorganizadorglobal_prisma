import { supabase } from '../config/supabase';

export class InventoryMovementsRepository {
  async findByProduct(productId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, product:products(name), user:users(name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);

    return data || [];
  }

  async create(movement: {
    productId: string;
    type: string;
    quantity: number;
    userId: string;
    reason?: string;
  }) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        user_id: movement.userId,
        reason: movement.reason,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar movimentação: ${error.message}`);

    return data;
  }
}
