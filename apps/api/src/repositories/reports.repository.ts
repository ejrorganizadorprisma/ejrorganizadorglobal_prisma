import { supabase } from '../config/supabase';

export class ReportsRepository {
  async getSalesReport(params: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = params;

    let query = supabase
      .from('quotes')
      .select('*, customer:customers(name), items:quote_items(*, product:products(name))')
      .eq('status', 'CONVERTED')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Erro ao gerar relatório: ${error.message}`);

    const totalSales = data?.reduce((sum, sale) => sum + sale.total, 0) || 0;
    const totalOrders = data?.length || 0;

    return {
      sales: data || [],
      totalSales,
      totalOrders,
      averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
    };
  }

  async getInventoryReport() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Erro ao gerar relatório: ${error.message}`);

    const totalProducts = data?.length || 0;
    const totalValue = data?.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0) || 0;
    const lowStock = data?.filter(p => p.current_stock <= p.minimum_stock) || [];

    return {
      products: data || [],
      totalProducts,
      totalValue,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
    };
  }
}
