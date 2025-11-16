import { supabase } from '../config/supabase';

export class SalesRepository {
  async create(quoteId: string, userId: string) {
    // Buscar quote com items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('id', quoteId)
      .single();

    if (quoteError) throw new Error(`Erro ao buscar orçamento: ${quoteError.message}`);

    // Criar venda (usando mesma tabela de quotes com status CONVERTED por enquanto)
    // Em produção, criar tabela sales separada
    const { data: sale, error: saleError } = await supabase
      .from('quotes')
      .update({ status: 'CONVERTED' })
      .eq('id', quoteId)
      .select('*')
      .single();

    if (saleError) throw new Error(`Erro ao converter orçamento: ${saleError.message}`);

    // Atualizar estoque dos produtos
    for (const item of quote.items) {
      const { data: result, error: stockError } = await supabase.rpc('update_product_stock', {
        p_product_id: item.product_id,
        p_quantity: -item.quantity,
        p_user_id: userId,
        p_type: 'SALE',
        p_reason: `Venda do orçamento ${quote.quote_number}`,
        p_reference_id: quoteId,
        p_reference_type: 'QUOTE',
      });

      if (stockError) {
        throw new Error(`Erro ao atualizar estoque: ${stockError.message}`);
      }
    }

    return sale;
  }
}
