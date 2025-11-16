import { supabase } from '../config/supabase';
import type { ServicePart, AddServicePartDTO } from '@ejr/shared-types';

export class ServicePartsRepository {
  async findByServiceOrderId(serviceOrderId: string) {
    const { data, error } = await supabase
      .from('service_parts')
      .select(`
        *,
        product:products!service_parts_product_id_fkey(
          id,
          code,
          name,
          cost_price,
          current_stock
        )
      `)
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar peças da ordem de serviço: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(item => ({
      id: item.id,
      serviceOrderId: item.service_order_id,
      productId: item.product_id,
      quantity: item.quantity,
      unitCost: item.unit_cost,
      totalCost: item.total_cost,
      createdAt: item.created_at,
      product: {
        id: item.product.id,
        code: item.product.code,
        name: item.product.name,
        costPrice: item.product.cost_price,
        currentStock: item.product.current_stock,
      },
    }));
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('service_parts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar peça: ${error.message}`);
    }

    return {
      id: data.id,
      serviceOrderId: data.service_order_id,
      productId: data.product_id,
      quantity: data.quantity,
      unitCost: data.unit_cost,
      totalCost: data.total_cost,
      createdAt: data.created_at,
    } as ServicePart;
  }

  async add(serviceOrderId: string, partData: AddServicePartDTO) {
    // Usar RPC para adicionar peça (vai atualizar estoque e custos automaticamente)
    const { data, error } = await supabase
      .rpc('add_service_part', {
        p_service_order_id: serviceOrderId,
        p_product_id: partData.productId,
        p_quantity: partData.quantity
      });

    if (error) {
      throw new Error(`Erro ao adicionar peça: ${error.message}`);
    }

    return data;
  }

  async remove(id: string) {
    const { error } = await supabase
      .from('service_parts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover peça: ${error.message}`);
    }

    return { success: true };
  }
}
