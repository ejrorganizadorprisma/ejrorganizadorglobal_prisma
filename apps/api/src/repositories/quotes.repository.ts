import { supabase } from '../config/supabase';
import type { Quote, QuoteStatus, QuoteItem, CreateQuoteDTO, UpdateQuoteDTO } from '@ejr/shared-types';

export class QuotesRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: QuoteStatus;
    customerId?: string;
  }) {
    const { page, limit, search, status, customerId } = params;

    let query = supabase
      .from('quotes')
      .select('*, customer:customers(id, name, document), items:quote_items(*, product:products(id, name, code))', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`quote_number.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar orçamentos: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customer:customers(*), items:quote_items(*, product:products(*))')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar orçamento: ${error.message}`);
    }

    return this.mapToQuote(data);
  }

  async create(quoteData: CreateQuoteDTO, userId: string) {
    const quoteNumber = await this.generateQuoteNumber();

    const { data: quoteResult, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        customer_id: quoteData.customerId,
        subtotal: 0, // Será calculado depois
        discount: quoteData.discount || 0,
        total: 0, // Será calculado depois
        status: 'DRAFT',
        valid_until: quoteData.validUntil,
        notes: quoteData.notes,
        responsible_user_id: userId,
      })
      .select()
      .single();

    if (quoteError) {
      throw new Error(`Erro ao criar orçamento: ${quoteError.message}`);
    }

    // Inserir items
    const items = quoteData.items.map((item) => ({
      quote_id: quoteResult.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(items);

    if (itemsError) {
      throw new Error(`Erro ao criar itens do orçamento: ${itemsError.message}`);
    }

    // Calcular totais
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - (quoteData.discount || 0);

    // Atualizar totais
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({ subtotal, total })
      .eq('id', quoteResult.id)
      .select('*, customer:customers(*), items:quote_items(*, product:products(*))')
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar totais: ${updateError.message}`);
    }

    return this.mapToQuote(updatedQuote);
  }

  async update(id: string, quoteData: UpdateQuoteDTO) {
    const updateData: any = {};

    if (quoteData.customerId !== undefined) updateData.customer_id = quoteData.customerId;
    if (quoteData.discount !== undefined) updateData.discount = quoteData.discount;
    if (quoteData.validUntil !== undefined) updateData.valid_until = quoteData.validUntil;
    if (quoteData.notes !== undefined) updateData.notes = quoteData.notes;
    if (quoteData.status !== undefined) updateData.status = quoteData.status;

    // Se houver items, deletar os antigos e inserir novos
    if (quoteData.items) {
      // Deletar items antigos
      const { error: deleteError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', id);

      if (deleteError) {
        throw new Error(`Erro ao deletar itens antigos: ${deleteError.message}`);
      }

      // Inserir novos items
      const items = quoteData.items.map((item) => ({
        quote_id: id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(items);

      if (itemsError) {
        throw new Error(`Erro ao inserir novos itens: ${itemsError.message}`);
      }

      // Recalcular totais
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - (quoteData.discount || 0);
      updateData.subtotal = subtotal;
      updateData.total = total;
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select('*, customer:customers(*), items:quote_items(*, product:products(*))')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar orçamento: ${error.message}`);
    }

    return this.mapToQuote(data);
  }

  async delete(id: string) {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar orçamento: ${error.message}`);
    }

    return { success: true };
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QOT-${year}-`;

    // Buscar último orçamento do ano
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .like('quote_number', `${prefix}%`)
      .order('quote_number', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Erro ao gerar número do orçamento: ${error.message}`);
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].quote_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  private mapToQuote(data: any): Quote {
    return {
      id: data.id,
      quoteNumber: data.quote_number,
      customerId: data.customer_id,
      items: (data.items || []).map((item: any) => ({
        id: item.id,
        quoteId: item.quote_id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      status: data.status,
      validUntil: new Date(data.valid_until),
      notes: data.notes,
      responsibleUserId: data.responsible_user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
