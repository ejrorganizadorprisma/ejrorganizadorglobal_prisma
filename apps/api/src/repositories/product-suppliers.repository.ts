import { supabase } from '../config/supabase';
import type { ProductSupplier, CreateProductSupplierDTO, UpdateProductSupplierDTO } from '@ejr/shared-types';

export class ProductSuppliersRepository {
  async findByProductId(productId: string) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select(`
        *,
        supplier:suppliers!product_suppliers_supplier_id_fkey(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('product_id', productId)
      .order('is_preferred', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar fornecedores do produto: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      supplierId: item.supplier_id,
      supplierSku: item.supplier_sku,
      unitPrice: item.unit_price,
      minimumQuantity: item.minimum_quantity,
      leadTimeDays: item.lead_time_days,
      isPreferred: item.is_preferred,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      supplier: {
        id: item.supplier.id,
        name: item.supplier.name,
        email: item.supplier.email,
        phone: item.supplier.phone,
      },
    }));
  }

  async findBySupplierId(supplierId: string) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select(`
        *,
        product:products!product_suppliers_product_id_fkey(
          id,
          code,
          name,
          sku,
          current_stock
        )
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar produtos do fornecedor: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      supplierId: item.supplier_id,
      supplierSku: item.supplier_sku,
      unitPrice: item.unit_price,
      minimumQuantity: item.minimum_quantity,
      leadTimeDays: item.lead_time_days,
      isPreferred: item.is_preferred,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      product: {
        id: item.product.id,
        code: item.product.code,
        name: item.product.name,
        sku: item.product.sku,
        currentStock: item.product.current_stock,
      },
    }));
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar relacionamento produto-fornecedor: ${error.message}`);
    }

    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      supplierSku: data.supplier_sku,
      unitPrice: data.unit_price,
      minimumQuantity: data.minimum_quantity,
      leadTimeDays: data.lead_time_days,
      isPreferred: data.is_preferred,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductSupplier;
  }

  async findByProductAndSupplier(productId: string, supplierId: string) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('*')
      .eq('product_id', productId)
      .eq('supplier_id', supplierId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar relacionamento: ${error.message}`);
    }

    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      supplierSku: data.supplier_sku,
      unitPrice: data.unit_price,
      minimumQuantity: data.minimum_quantity,
      leadTimeDays: data.lead_time_days,
      isPreferred: data.is_preferred,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductSupplier;
  }

  async create(productId: string, data: CreateProductSupplierDTO) {
    // Se estiver marcando como preferencial, remover preferência de outros
    if (data.isPreferred) {
      await this.removePreferredFlag(productId);
    }

    const { data: result, error } = await supabase
      .from('product_suppliers')
      .insert({
        product_id: productId,
        supplier_id: data.supplierId,
        supplier_sku: data.supplierSku,
        unit_price: data.unitPrice,
        minimum_quantity: data.minimumQuantity ?? 1,
        lead_time_days: data.leadTimeDays ?? 0,
        is_preferred: data.isPreferred ?? false,
        notes: data.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar relacionamento produto-fornecedor: ${error.message}`);
    }

    return {
      id: result.id,
      productId: result.product_id,
      supplierId: result.supplier_id,
      supplierSku: result.supplier_sku,
      unitPrice: result.unit_price,
      minimumQuantity: result.minimum_quantity,
      leadTimeDays: result.lead_time_days,
      isPreferred: result.is_preferred,
      notes: result.notes,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    } as ProductSupplier;
  }

  async update(id: string, data: UpdateProductSupplierDTO) {
    const updateData: any = {};

    if (data.supplierSku !== undefined) updateData.supplier_sku = data.supplierSku;
    if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;
    if (data.minimumQuantity !== undefined) updateData.minimum_quantity = data.minimumQuantity;
    if (data.leadTimeDays !== undefined) updateData.lead_time_days = data.leadTimeDays;
    if (data.isPreferred !== undefined) updateData.is_preferred = data.isPreferred;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Se estiver marcando como preferencial, remover preferência de outros
    if (data.isPreferred) {
      const current = await this.findById(id);
      if (current) {
        await this.removePreferredFlag(current.productId, id);
      }
    }

    const { data: result, error } = await supabase
      .from('product_suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar relacionamento: ${error.message}`);
    }

    return {
      id: result.id,
      productId: result.product_id,
      supplierId: result.supplier_id,
      supplierSku: result.supplier_sku,
      unitPrice: result.unit_price,
      minimumQuantity: result.minimum_quantity,
      leadTimeDays: result.lead_time_days,
      isPreferred: result.is_preferred,
      notes: result.notes,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    } as ProductSupplier;
  }

  async delete(id: string) {
    const { error } = await supabase
      .from('product_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover relacionamento: ${error.message}`);
    }

    return { success: true };
  }

  private async removePreferredFlag(productId: string, exceptId?: string) {
    const query = supabase
      .from('product_suppliers')
      .update({ is_preferred: false })
      .eq('product_id', productId)
      .eq('is_preferred', true);

    if (exceptId) {
      query.neq('id', exceptId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Erro ao atualizar preferências: ${error.message}`);
    }
  }
}
