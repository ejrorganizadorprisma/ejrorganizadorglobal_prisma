import { supabase } from '../config/supabase';

export class DashboardRepository {
  async getCompleteOverview() {
    // ===== PRODUTOS =====
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('*')
      .filter('current_stock', 'lte', 'minimum_stock')
      .limit(10);

    const { data: allProducts } = await supabase
      .from('products')
      .select('cost_price, sale_price, current_stock');

    let totalStockValue = 0;
    let totalPotentialRevenue = 0;
    if (allProducts) {
      totalStockValue = allProducts.reduce((sum, p) => sum + (p.cost_price * p.current_stock), 0);
      totalPotentialRevenue = allProducts.reduce((sum, p) => sum + (p.sale_price * p.current_stock), 0);
    }

    // ===== CLIENTES =====
    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { data: recentCustomers } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // ===== ORÇAMENTOS =====
    const { count: quotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });

    const { count: pendingQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const { count: approvedQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APPROVED');

    const { count: rejectedQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'REJECTED');

    const { data: recentQuotes } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // ===== ORDENS DE SERVIÇO =====
    const { count: serviceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });

    const { count: openServiceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN');

    const { count: inProgressServiceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['IN_SERVICE', 'AWAITING_APPROVAL']);

    const { count: awaitingPartsCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'AWAITING_PARTS');

    const { count: completedServiceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'COMPLETED');

    const { data: recentServiceOrders } = await supabase
      .from('service_orders')
      .select('*, customers(name), products(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    // ===== FORNECEDORES =====
    const { count: suppliersCount } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });

    // ===== MOVIMENTAÇÕES DE ESTOQUE =====
    const { count: inventoryMovementsCount } = await supabase
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true });

    const { data: recentMovements } = await supabase
      .from('inventory_movements')
      .select('*, products(name, code)')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      products: {
        total: productsCount || 0,
        recent: products || [],
        lowStock: lowStockProducts || [],
        totalStockValue,
        totalPotentialRevenue,
        profitMargin: totalStockValue > 0 ? ((totalPotentialRevenue - totalStockValue) / totalStockValue * 100) : 0,
      },
      customers: {
        total: customersCount || 0,
        recent: recentCustomers || [],
      },
      quotes: {
        total: quotesCount || 0,
        pending: pendingQuotesCount || 0,
        approved: approvedQuotesCount || 0,
        rejected: rejectedQuotesCount || 0,
        recent: recentQuotes || [],
      },
      serviceOrders: {
        total: serviceOrdersCount || 0,
        open: openServiceOrdersCount || 0,
        inProgress: inProgressServiceOrdersCount || 0,
        awaitingParts: awaitingPartsCount || 0,
        completed: completedServiceOrdersCount || 0,
        recent: recentServiceOrders || [],
      },
      suppliers: {
        total: suppliersCount || 0,
      },
      inventory: {
        totalMovements: inventoryMovementsCount || 0,
        recentMovements: recentMovements || [],
      },
    };
  }

  async getOwnerMetrics() {
    // Total de produtos
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Total de clientes
    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Total de orçamentos
    const { count: quotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true });

    // Total de ordens de serviço
    const { count: serviceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });

    // Ordens de serviço abertas
    const { count: openServiceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN');

    // Ordens de serviço em andamento
    const { count: inProgressServiceOrdersCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['IN_SERVICE', 'AWAITING_APPROVAL']);

    // Ordens de serviço aguardando peças
    const { count: awaitingPartsCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'AWAITING_PARTS');

    // Produtos com estoque baixo
    const { data: lowStock } = await supabase
      .from('products')
      .select('*')
      .filter('current_stock', 'lte', 'minimum_stock')
      .limit(10);

    // Valor total do estoque
    const { data: products } = await supabase
      .from('products')
      .select('cost_price, current_stock');

    let totalStockValue = 0;
    if (products) {
      totalStockValue = products.reduce((sum, p) => sum + (p.cost_price * p.current_stock), 0);
    }

    // Orçamentos pendentes
    const { count: pendingQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    // Orçamentos aprovados
    const { count: approvedQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APPROVED');

    return {
      totalProducts: productsCount || 0,
      totalCustomers: customersCount || 0,
      totalQuotes: quotesCount || 0,
      totalServiceOrders: serviceOrdersCount || 0,
      openServiceOrders: openServiceOrdersCount || 0,
      inProgressServiceOrders: inProgressServiceOrdersCount || 0,
      awaitingPartsServiceOrders: awaitingPartsCount || 0,
      lowStockProducts: lowStock || [],
      totalStockValue,
      pendingQuotes: pendingQuotesCount || 0,
      approvedQuotes: approvedQuotesCount || 0,
    };
  }
}
