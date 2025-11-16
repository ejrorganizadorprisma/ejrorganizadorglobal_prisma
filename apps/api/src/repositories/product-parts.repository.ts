import { supabase } from '../config/supabase';
import type { ProductPart, ProductPartWithProduct, BOMExplosion, BOMAvailability, AddProductPartDTO, UpdateProductPartDTO } from '@ejr/shared-types';

export class ProductPartsRepository {
  async findByProductId(productId: string) {
    const { data, error } = await supabase
      .from('product_parts')
      .select(`
        *,
        part:products!product_parts_part_id_fkey(
          id,
          code,
          name,
          cost_price,
          current_stock,
          status
        )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar peças do produto: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      partId: item.part_id,
      quantity: item.quantity,
      isOptional: item.is_optional,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      part: {
        id: item.part.id,
        code: item.part.code,
        name: item.part.name,
        costPrice: item.part.cost_price,
        currentStock: item.part.current_stock,
        status: item.part.status,
      },
    })) as ProductPartWithProduct[];
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('product_parts')
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
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async findByProductAndPart(productId: string, partId: string) {
    const { data, error } = await supabase
      .from('product_parts')
      .select('*')
      .eq('product_id', productId)
      .eq('part_id', partId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar peça: ${error.message}`);
    }

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async addPart(productId: string, partData: AddProductPartDTO) {
    const { data, error } = await supabase
      .from('product_parts')
      .insert({
        product_id: productId,
        part_id: partData.partId,
        quantity: partData.quantity,
        is_optional: partData.isOptional ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar peça: ${error.message}`);
    }

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async updatePart(productPartId: string, partData: UpdateProductPartDTO) {
    const updateData: any = {};

    if (partData.quantity !== undefined) updateData.quantity = partData.quantity;
    if (partData.isOptional !== undefined) updateData.is_optional = partData.isOptional;

    const { data, error } = await supabase
      .from('product_parts')
      .update(updateData)
      .eq('id', productPartId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar peça: ${error.message}`);
    }

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async removePart(productPartId: string) {
    const { error } = await supabase
      .from('product_parts')
      .delete()
      .eq('id', productPartId);

    if (error) {
      throw new Error(`Erro ao remover peça: ${error.message}`);
    }

    return { success: true };
  }

  async getBOM(productId: string) {
    const { data, error } = await supabase
      .rpc('get_product_bom', { p_product_id: productId });

    if (error) {
      throw new Error(`Erro ao obter BOM: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(item => ({
      partId: item.part_id,
      partCode: item.part_code,
      partName: item.part_name,
      quantity: item.quantity,
      isOptional: item.is_optional,
      unitCost: item.unit_cost,
      totalCost: item.total_cost,
      availableStock: item.available_stock,
    })) as BOMExplosion[];
  }

  async checkAvailability(productId: string, quantity: number = 1) {
    const { data, error } = await supabase
      .rpc('check_assembly_availability', {
        p_product_id: productId,
        p_quantity: quantity
      });

    if (error) {
      throw new Error(`Erro ao verificar disponibilidade: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      canAssemble: data.can_assemble,
      missingParts: (data.missing_parts || []).map((part: any) => ({
        partId: part.part_id,
        partName: part.part_name,
        required: part.required,
        available: part.available,
        missing: part.missing,
      })),
    } as BOMAvailability;
  }
}
