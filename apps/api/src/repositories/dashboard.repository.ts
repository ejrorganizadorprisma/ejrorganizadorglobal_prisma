import { db } from '../config/database';

export class DashboardRepository {
  async getCompleteOverview() {
    // ===== PRODUTOS =====
    const productsCountResult = await db.query('SELECT COUNT(*)::int as count FROM products');
    const productsCount = productsCountResult.rows[0]?.count || 0;

    const productsResult = await db.query(`
      SELECT *
      FROM products
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const products = productsResult.rows;

    const lowStockProductsResult = await db.query(`
      SELECT *
      FROM products
      WHERE current_stock <= minimum_stock
      LIMIT 10
    `);
    const lowStockProducts = lowStockProductsResult.rows;

    const allProductsResult = await db.query(`
      SELECT cost_price, sale_price, current_stock
      FROM products
    `);
    const allProducts = allProductsResult.rows;

    let totalStockValue = 0;
    let totalPotentialRevenue = 0;
    if (allProducts) {
      totalStockValue = allProducts.reduce((sum, p) => sum + (p.cost_price * p.current_stock), 0);
      totalPotentialRevenue = allProducts.reduce((sum, p) => sum + (p.sale_price * p.current_stock), 0);
    }

    // ===== CLIENTES =====
    const customersCountResult = await db.query('SELECT COUNT(*)::int as count FROM customers');
    const customersCount = customersCountResult.rows[0]?.count || 0;

    const recentCustomersResult = await db.query(`
      SELECT *
      FROM customers
      ORDER BY created_at DESC
      LIMIT 5
    `);
    const recentCustomers = recentCustomersResult.rows;

    // ===== ORÇAMENTOS =====
    const quotesCountResult = await db.query('SELECT COUNT(*)::int as count FROM quotes');
    const quotesCount = quotesCountResult.rows[0]?.count || 0;

    const pendingQuotesCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM quotes WHERE status IN ('DRAFT', 'SENT')"
    );
    const pendingQuotesCount = pendingQuotesCountResult.rows[0]?.count || 0;

    const approvedQuotesCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM quotes WHERE status = 'APPROVED'"
    );
    const approvedQuotesCount = approvedQuotesCountResult.rows[0]?.count || 0;

    const rejectedQuotesCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM quotes WHERE status = 'REJECTED'"
    );
    const rejectedQuotesCount = rejectedQuotesCountResult.rows[0]?.count || 0;

    const recentQuotesResult = await db.query(`
      SELECT *
      FROM quotes
      ORDER BY created_at DESC
      LIMIT 5
    `);
    const recentQuotes = recentQuotesResult.rows;

    // ===== ORDENS DE SERVIÇO =====
    const serviceOrdersCountResult = await db.query('SELECT COUNT(*)::int as count FROM service_orders');
    const serviceOrdersCount = serviceOrdersCountResult.rows[0]?.count || 0;

    const openServiceOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status = 'OPEN'"
    );
    const openServiceOrdersCount = openServiceOrdersCountResult.rows[0]?.count || 0;

    const inProgressServiceOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status IN ('IN_SERVICE', 'AWAITING_APPROVAL')"
    );
    const inProgressServiceOrdersCount = inProgressServiceOrdersCountResult.rows[0]?.count || 0;

    const awaitingPartsCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status = 'AWAITING_PARTS'"
    );
    const awaitingPartsCount = awaitingPartsCountResult.rows[0]?.count || 0;

    const completedServiceOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status = 'COMPLETED'"
    );
    const completedServiceOrdersCount = completedServiceOrdersCountResult.rows[0]?.count || 0;

    const recentServiceOrdersResult = await db.query(`
      SELECT
        so.*,
        c.name as customer_name,
        p.name as product_name
      FROM service_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products p ON p.id = so.product_id
      ORDER BY so.created_at DESC
      LIMIT 5
    `);
    const recentServiceOrders = recentServiceOrdersResult.rows.map(row => ({
      ...row,
      customers: row.customer_name ? { name: row.customer_name } : null,
      products: row.product_name ? { name: row.product_name } : null,
    }));

    // ===== ORDENS DE PRODUÇÃO =====
    const productionOrdersCountResult = await db.query('SELECT COUNT(*)::int as count FROM production_orders');
    const productionOrdersCount = productionOrdersCountResult.rows[0]?.count || 0;

    const draftProductionOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM production_orders WHERE status = 'DRAFT'"
    );
    const draftProductionOrdersCount = draftProductionOrdersCountResult.rows[0]?.count || 0;

    const plannedProductionOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM production_orders WHERE status = 'PLANNED'"
    );
    const plannedProductionOrdersCount = plannedProductionOrdersCountResult.rows[0]?.count || 0;

    const inProductionOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM production_orders WHERE status = 'IN_PRODUCTION'"
    );
    const inProductionOrdersCount = inProductionOrdersCountResult.rows[0]?.count || 0;

    const completedProductionOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM production_orders WHERE status = 'COMPLETED'"
    );
    const completedProductionOrdersCount = completedProductionOrdersCountResult.rows[0]?.count || 0;

    const cancelledProductionOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM production_orders WHERE status = 'CANCELLED'"
    );
    const cancelledProductionOrdersCount = cancelledProductionOrdersCountResult.rows[0]?.count || 0;

    const recentProductionOrdersResult = await db.query(`
      SELECT
        po.*,
        p.name as product_name,
        p.code as product_code
      FROM production_orders po
      LEFT JOIN products p ON p.id = po.product_id
      ORDER BY po.created_at DESC
      LIMIT 5
    `);
    const recentProductionOrders = recentProductionOrdersResult.rows.map(row => ({
      ...row,
      products: row.product_name ? { name: row.product_name, code: row.product_code } : null,
    }));

    // ===== FORNECEDORES =====
    const suppliersCountResult = await db.query('SELECT COUNT(*)::int as count FROM suppliers');
    const suppliersCount = suppliersCountResult.rows[0]?.count || 0;

    // ===== MOVIMENTAÇÕES DE ESTOQUE =====
    const inventoryMovementsCountResult = await db.query('SELECT COUNT(*)::int as count FROM inventory_movements');
    const inventoryMovementsCount = inventoryMovementsCountResult.rows[0]?.count || 0;

    const recentMovementsResult = await db.query(`
      SELECT
        im.*,
        p.name as product_name,
        p.code as product_code
      FROM inventory_movements im
      LEFT JOIN products p ON p.id = im.product_id
      ORDER BY im.created_at DESC
      LIMIT 10
    `);
    const recentMovements = recentMovementsResult.rows.map(row => ({
      ...row,
      products: row.product_name ? { name: row.product_name, code: row.product_code } : null,
    }));

    return {
      products: {
        total: productsCount,
        recent: products,
        lowStock: lowStockProducts,
        totalStockValue,
        totalPotentialRevenue,
        profitMargin: totalStockValue > 0 ? ((totalPotentialRevenue - totalStockValue) / totalStockValue * 100) : 0,
      },
      customers: {
        total: customersCount,
        recent: recentCustomers,
      },
      quotes: {
        total: quotesCount,
        pending: pendingQuotesCount,
        approved: approvedQuotesCount,
        rejected: rejectedQuotesCount,
        recent: recentQuotes,
      },
      serviceOrders: {
        total: serviceOrdersCount,
        open: openServiceOrdersCount,
        inProgress: inProgressServiceOrdersCount,
        awaitingParts: awaitingPartsCount,
        completed: completedServiceOrdersCount,
        recent: recentServiceOrders,
      },
      productionOrders: {
        total: productionOrdersCount,
        draft: draftProductionOrdersCount,
        planned: plannedProductionOrdersCount,
        inProduction: inProductionOrdersCount,
        completed: completedProductionOrdersCount,
        cancelled: cancelledProductionOrdersCount,
        recent: recentProductionOrders,
      },
      suppliers: {
        total: suppliersCount,
      },
      inventory: {
        totalMovements: inventoryMovementsCount,
        recentMovements: recentMovements,
      },
    };
  }

  async getOwnerMetrics() {
    // Total de produtos
    const productsCountResult = await db.query('SELECT COUNT(*)::int as count FROM products');
    const productsCount = productsCountResult.rows[0]?.count || 0;

    // Total de clientes
    const customersCountResult = await db.query('SELECT COUNT(*)::int as count FROM customers');
    const customersCount = customersCountResult.rows[0]?.count || 0;

    // Total de orçamentos
    const quotesCountResult = await db.query('SELECT COUNT(*)::int as count FROM quotes');
    const quotesCount = quotesCountResult.rows[0]?.count || 0;

    // Total de ordens de serviço
    const serviceOrdersCountResult = await db.query('SELECT COUNT(*)::int as count FROM service_orders');
    const serviceOrdersCount = serviceOrdersCountResult.rows[0]?.count || 0;

    // Ordens de serviço abertas
    const openServiceOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status = 'OPEN'"
    );
    const openServiceOrdersCount = openServiceOrdersCountResult.rows[0]?.count || 0;

    // Ordens de serviço em andamento
    const inProgressServiceOrdersCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status IN ('IN_SERVICE', 'AWAITING_APPROVAL')"
    );
    const inProgressServiceOrdersCount = inProgressServiceOrdersCountResult.rows[0]?.count || 0;

    // Ordens de serviço aguardando peças
    const awaitingPartsCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM service_orders WHERE status = 'AWAITING_PARTS'"
    );
    const awaitingPartsCount = awaitingPartsCountResult.rows[0]?.count || 0;

    // Produtos com estoque baixo
    const lowStockResult = await db.query(`
      SELECT *
      FROM products
      WHERE current_stock <= minimum_stock
      LIMIT 10
    `);
    const lowStock = lowStockResult.rows;

    // Valor total do estoque
    const productsResult = await db.query(`
      SELECT cost_price, current_stock
      FROM products
    `);
    const products = productsResult.rows;

    let totalStockValue = 0;
    if (products) {
      totalStockValue = products.reduce((sum, p) => sum + (p.cost_price * p.current_stock), 0);
    }

    // Orçamentos pendentes (DRAFT ou SENT)
    const pendingQuotesCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM quotes WHERE status IN ('DRAFT', 'SENT')"
    );
    const pendingQuotesCount = pendingQuotesCountResult.rows[0]?.count || 0;

    // Orçamentos aprovados
    const approvedQuotesCountResult = await db.query(
      "SELECT COUNT(*)::int as count FROM quotes WHERE status = 'APPROVED'"
    );
    const approvedQuotesCount = approvedQuotesCountResult.rows[0]?.count || 0;

    return {
      totalProducts: productsCount,
      totalCustomers: customersCount,
      totalQuotes: quotesCount,
      totalServiceOrders: serviceOrdersCount,
      openServiceOrders: openServiceOrdersCount,
      inProgressServiceOrders: inProgressServiceOrdersCount,
      awaitingPartsServiceOrders: awaitingPartsCount,
      lowStockProducts: lowStock,
      totalStockValue,
      pendingQuotes: pendingQuotesCount,
      approvedQuotes: approvedQuotesCount,
    };
  }
}
