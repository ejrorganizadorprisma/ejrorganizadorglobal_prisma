import { db } from '../config/database';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export class ReportsRepository {
  // ==========================================
  // HELPER: Date filter builder
  // ==========================================
  private buildDateFilter(filters: ReportFilters, dateCol: string, startIdx: number = 1) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = startIdx;
    if (filters.startDate) {
      conditions.push(`${dateCol} >= $${idx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`${dateCol} <= $${idx++}`);
      values.push(filters.endDate + 'T23:59:59');
    }
    return { conditions, values, nextIdx: idx };
  }

  private getGroupBy(filters: ReportFilters): string {
    return filters.groupBy || 'month';
  }

  // ==========================================
  // LEGACY METHODS (preserved for old pages)
  // ==========================================

  async getSalesReport(params: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = params;

    const conditions: string[] = ["status = 'CONVERTED'"];
    const values: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(endDate);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT
        q.*,
        c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON c.id = q.customer_id
      ${whereClause}
      ORDER BY q.created_at DESC
    `;

    const result = await db.query(query, values);
    const sales = result.rows;

    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const itemsQuery = `
          SELECT
            qi.*,
            p.name as product_name
          FROM quote_items qi
          LEFT JOIN products p ON p.id = qi.product_id
          WHERE qi.quote_id = $1
        `;
        const itemsResult = await db.query(itemsQuery, [sale.id]);

        return {
          ...sale,
          customer: sale.customer_name ? { name: sale.customer_name } : null,
          items: itemsResult.rows.map(item => ({
            ...item,
            product: item.product_name ? { name: item.product_name } : null,
          })),
        };
      })
    );

    const totalSales = salesWithItems.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalOrders = salesWithItems.length;

    return {
      sales: salesWithItems,
      totalSales,
      totalOrders,
      averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
    };
  }

  async getInventoryReport() {
    const query = `
      SELECT *
      FROM products
      ORDER BY name ASC
    `;

    const result = await db.query(query);
    const products = result.rows;

    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0);
    const lowStock = products.filter(p => p.current_stock <= p.minimum_stock);

    return {
      products,
      totalProducts,
      totalValue,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
    };
  }

  // ==========================================
  // SUPPLIERS REPORTS (5)
  // ==========================================

  // 1. Suppliers ranking by purchase volume
  async getSuppliersRanking(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pb.created_at');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT s.id, s.code, s.name, s.status, s.rating,
        COUNT(DISTINCT pb.id) as total_orders,
        COALESCE(SUM(pb.total_amount), 0) as total_purchased
      FROM suppliers s
      LEFT JOIN purchase_budgets pb ON pb.supplier_id = s.id
        AND pb.status IN ('PURCHASED', 'RECEIVED')
        ${dateWhere}
      GROUP BY s.id, s.code, s.name, s.status, s.rating
      ORDER BY total_purchased DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalSuppliers = rows.length;
    const totalPurchased = rows.reduce((sum, r) => sum + Number(r.total_purchased), 0);

    return { suppliers: rows, totalSuppliers, totalPurchased };
  }

  // 2. Suppliers lead time analysis
  async getSuppliersLeadTime(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'so.order_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT s.id, s.code, s.name,
        COUNT(so.id) as total_deliveries,
        AVG(EXTRACT(DAY FROM (so.actual_delivery_date - so.order_date)))::numeric(10,1) as avg_lead_time_days,
        MIN(EXTRACT(DAY FROM (so.actual_delivery_date - so.order_date)))::int as min_lead_time,
        MAX(EXTRACT(DAY FROM (so.actual_delivery_date - so.order_date)))::int as max_lead_time,
        s.lead_time_days as promised_lead_time
      FROM suppliers s
      LEFT JOIN supplier_orders so ON so.supplier_id = s.id
        AND so.actual_delivery_date IS NOT NULL
        AND so.status = 'RECEIVED'
        ${dateWhere}
      GROUP BY s.id, s.code, s.name, s.lead_time_days
      HAVING COUNT(so.id) > 0
      ORDER BY avg_lead_time_days ASC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const avgLeadTime = rows.length > 0
      ? rows.reduce((sum, r) => sum + Number(r.avg_lead_time_days), 0) / rows.length
      : 0;

    return { suppliers: rows, avgLeadTime: Math.round(avgLeadTime * 10) / 10 };
  }

  // 3. Suppliers by status
  async getSuppliersStatusMap(_filters: ReportFilters) {
    const statusResult = await db.query(`
      SELECT status, COUNT(*)::int as count
      FROM suppliers
      GROUP BY status
      ORDER BY count DESC
    `);

    const totalResult = await db.query(`SELECT COUNT(*)::int as total FROM suppliers`);

    const suppliersResult = await db.query(`
      SELECT id, code, name, status, rating, phone, email
      FROM suppliers
      ORDER BY name ASC
    `);

    return {
      statusCounts: statusResult.rows,
      total: Number(totalResult.rows[0]?.total || 0),
      suppliers: suppliersResult.rows,
    };
  }

  // 4. Suppliers price history
  async getSuppliersPriceHistory(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pbq.created_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT pbi.product_id, p.name as product_name, p.code as product_code,
        s.name as supplier_name, pbq.unit_price, pbq.created_at
      FROM purchase_budget_quotes pbq
      JOIN purchase_budget_items pbi ON pbi.id = pbq.item_id
      JOIN products p ON p.id = pbi.product_id
      JOIN suppliers s ON s.id = pbq.supplier_id
      ${whereClause}
      ORDER BY p.name, pbq.created_at DESC
    `;

    const result = await db.query(query, values);

    return { entries: result.rows, totalEntries: result.rows.length };
  }

  // 5. Suppliers pending orders
  async getSuppliersPendingOrders(_filters: ReportFilters) {
    const query = `
      SELECT s.id, s.code, s.name,
        COUNT(so.id)::int as pending_orders,
        COALESCE(SUM(so.total_amount), 0) as pending_value,
        MIN(so.expected_delivery_date) as nearest_delivery
      FROM suppliers s
      JOIN supplier_orders so ON so.supplier_id = s.id
        AND so.status NOT IN ('RECEIVED', 'CANCELLED')
      GROUP BY s.id, s.code, s.name
      ORDER BY pending_orders DESC
    `;

    const result = await db.query(query);
    const rows = result.rows;

    const totalPending = rows.reduce((sum, r) => sum + Number(r.pending_orders), 0);
    const totalPendingValue = rows.reduce((sum, r) => sum + Number(r.pending_value), 0);

    return { suppliers: rows, totalPending, totalPendingValue };
  }

  // ==========================================
  // PRODUCTS REPORTS (5)
  // ==========================================

  // 6. ABC Curve
  async getProductsAbcCurve(_filters: ReportFilters) {
    const query = `
      SELECT id, code, name, category, cost_price, sale_price, current_stock,
        (current_stock * cost_price) as stock_value
      FROM products
      WHERE status = 'ACTIVE' AND current_stock > 0
      ORDER BY stock_value DESC
    `;

    const result = await db.query(query);
    const rows = result.rows;

    const totalValue = rows.reduce((sum, r) => sum + Number(r.stock_value), 0);

    let cumulative = 0;
    const products = rows.map(row => {
      cumulative += Number(row.stock_value);
      const cumulativePercent = totalValue > 0
        ? Math.round((cumulative / totalValue) * 10000) / 100
        : 0;
      let classification: 'A' | 'B' | 'C';
      if (cumulativePercent <= 80) {
        classification = 'A';
      } else if (cumulativePercent <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }
      return { ...row, classification, cumulativePercent };
    });

    const classA = products.filter(p => p.classification === 'A');
    const classB = products.filter(p => p.classification === 'B');
    const classC = products.filter(p => p.classification === 'C');

    const sumValue = (arr: typeof products) => arr.reduce((s, p) => s + Number(p.stock_value), 0);

    return {
      products,
      totalValue,
      classA: {
        count: classA.length,
        value: sumValue(classA),
        percent: totalValue > 0 ? Math.round(sumValue(classA) / totalValue * 10000) / 100 : 0,
      },
      classB: {
        count: classB.length,
        value: sumValue(classB),
        percent: totalValue > 0 ? Math.round(sumValue(classB) / totalValue * 10000) / 100 : 0,
      },
      classC: {
        count: classC.length,
        value: sumValue(classC),
        percent: totalValue > 0 ? Math.round(sumValue(classC) / totalValue * 10000) / 100 : 0,
      },
    };
  }

  // 7. Critical stock
  async getProductsCriticalStock(_filters: ReportFilters) {
    const query = `
      SELECT p.id, p.code, p.name, p.category, p.current_stock, p.minimum_stock, p.reserved_stock,
        (p.current_stock - p.reserved_stock) as available_stock,
        COALESCE(
          (SELECT SUM(si.quantity) FROM sale_items si JOIN sales s ON s.id = si.sale_id
           WHERE si.product_id = p.id AND s.sale_date >= NOW() - INTERVAL '30 days'), 0
        ) as sold_last_30d
      FROM products p
      WHERE p.status = 'ACTIVE' AND p.current_stock <= p.minimum_stock
      ORDER BY (p.current_stock::float / NULLIF(p.minimum_stock, 0)) ASC
    `;

    const result = await db.query(query);

    return { products: result.rows, totalCritical: result.rows.length };
  }

  // 8. Stock turnover (inventory movements)
  async getProductsTurnover(filters: ReportFilters) {
    const groupBy = this.getGroupBy(filters);
    const { conditions, values, nextIdx } = this.buildDateFilter(filters, 'im.created_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT p.id, p.code, p.name, im.type,
        date_trunc($${nextIdx}, im.created_at)::date as period,
        SUM(CASE WHEN im.quantity > 0 THEN im.quantity ELSE 0 END)::int as entries,
        SUM(CASE WHEN im.quantity < 0 THEN ABS(im.quantity) ELSE 0 END)::int as exits
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      ${whereClause}
      GROUP BY p.id, p.code, p.name, im.type, period
      ORDER BY period DESC, p.name
    `;

    const allValues = [...values, groupBy];
    const result = await db.query(query, allValues);
    const rows = result.rows;

    // Summary by type
    const typeSummary: Record<string, { entries: number; exits: number }> = {};
    for (const row of rows) {
      if (!typeSummary[row.type]) {
        typeSummary[row.type] = { entries: 0, exits: 0 };
      }
      typeSummary[row.type].entries += Number(row.entries);
      typeSummary[row.type].exits += Number(row.exits);
    }

    return { movements: rows, summary: typeSummary };
  }

  // 9. Profit margin
  async getProductsMargin(_filters: ReportFilters) {
    const query = `
      SELECT id, code, name, category, manufacturer,
        cost_price, sale_price, wholesale_price,
        CASE WHEN sale_price > 0 THEN
          ROUND(((sale_price - cost_price)::numeric / sale_price) * 100, 1)
        ELSE 0 END as margin_percent,
        (sale_price - cost_price) as margin_value
      FROM products
      WHERE status = 'ACTIVE' AND sale_price > 0
      ORDER BY margin_percent DESC
    `;

    const result = await db.query(query);
    const rows = result.rows;

    const avgMargin = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.margin_percent), 0) / rows.length * 10) / 10
      : 0;

    return { products: rows, avgMargin };
  }

  // 10. Best sellers
  async getProductsBestSellers(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT p.id, p.code, p.name, p.category,
        SUM(si.quantity)::int as total_quantity,
        COALESCE(SUM(si.total), 0) as total_revenue,
        COUNT(DISTINCT s.id)::int as total_sales
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.status != 'CANCELLED'
        ${dateWhere}
      JOIN products p ON p.id = si.product_id
      GROUP BY p.id, p.code, p.name, p.category
      ORDER BY total_revenue DESC
      LIMIT 50
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue), 0);
    const totalQuantity = rows.reduce((sum, r) => sum + Number(r.total_quantity), 0);

    return { products: rows, totalRevenue, totalQuantity };
  }

  // ==========================================
  // CUSTOMERS REPORTS (5)
  // ==========================================

  // 11. Revenue ranking
  async getCustomersRevenueRanking(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT c.id, c.name, c.type, c.phone, c.email,
        COUNT(s.id)::int as total_sales,
        COALESCE(SUM(s.total), 0) as total_revenue,
        COALESCE(SUM(s.total_paid), 0) as total_paid,
        COALESCE(SUM(s.total_pending), 0) as total_pending
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id AND s.status != 'CANCELLED'
        ${dateWhere}
      GROUP BY c.id, c.name, c.type, c.phone, c.email
      ORDER BY total_revenue DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue), 0);
    const totalCustomers = rows.filter(r => Number(r.total_sales) > 0).length;

    return { customers: rows, totalRevenue, totalCustomers };
  }

  // 12. Defaulting customers
  async getCustomersDefaulters(_filters: ReportFilters) {
    const query = `
      SELECT c.id, c.name, c.type, c.phone, c.credit_max_days,
        COUNT(sp.id)::int as overdue_installments,
        SUM(sp.amount) as overdue_amount,
        MIN(sp.due_date)::date as oldest_due_date,
        MAX(CURRENT_DATE - sp.due_date::date) as max_days_overdue
      FROM customers c
      JOIN sales s ON s.customer_id = c.id
      JOIN sale_payments sp ON sp.sale_id = s.id AND sp.status = 'OVERDUE'
      GROUP BY c.id, c.name, c.type, c.phone, c.credit_max_days
      ORDER BY overdue_amount DESC
    `;

    const result = await db.query(query);
    const rows = result.rows;

    const totalOverdueAmount = rows.reduce((sum, r) => sum + Number(r.overdue_amount), 0);
    const totalDefaulters = rows.length;

    return { customers: rows, totalOverdueAmount, totalDefaulters };
  }

  // 13. Purchase frequency
  async getCustomersFrequency(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT c.id, c.name, c.type,
        COUNT(s.id)::int as total_purchases,
        MIN(s.sale_date) as first_purchase,
        MAX(s.sale_date) as last_purchase,
        CASE WHEN COUNT(s.id) > 1 THEN
          ROUND(EXTRACT(DAY FROM (MAX(s.sale_date) - MIN(s.sale_date))) / (COUNT(s.id) - 1), 1)
        ELSE NULL END as avg_days_between
      FROM customers c
      JOIN sales s ON s.customer_id = c.id AND s.status != 'CANCELLED'
        ${dateWhere}
      GROUP BY c.id, c.name, c.type
      ORDER BY total_purchases DESC
    `;

    const result = await db.query(query, values);

    return { customers: result.rows };
  }

  // 14. Customers by type
  async getCustomersByType(_filters: ReportFilters) {
    const typeResult = await db.query(`
      SELECT type, COUNT(*)::int as count
      FROM customers
      GROUP BY type
      ORDER BY count DESC
    `);

    const activityResult = await db.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM sales s WHERE s.customer_id = c.id AND s.status != 'CANCELLED'
        ) THEN 1 END)::int as active,
        COUNT(CASE WHEN NOT EXISTS (
          SELECT 1 FROM sales s WHERE s.customer_id = c.id AND s.status != 'CANCELLED'
        ) THEN 1 END)::int as inactive
      FROM customers c
    `);

    const activity = activityResult.rows[0] || { total: 0, active: 0, inactive: 0 };

    return {
      typeCounts: typeResult.rows,
      total: Number(activity.total),
      active: Number(activity.active),
      inactive: Number(activity.inactive),
    };
  }

  // 15. Average ticket per customer
  async getCustomersAvgTicket(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT c.id, c.name, c.type,
        COUNT(s.id)::int as total_sales,
        COALESCE(SUM(s.total), 0) as total_revenue,
        COALESCE(AVG(s.total), 0)::int as avg_ticket
      FROM customers c
      JOIN sales s ON s.customer_id = c.id AND s.status != 'CANCELLED'
        ${dateWhere}
      GROUP BY c.id, c.name, c.type
      HAVING COUNT(s.id) > 0
      ORDER BY avg_ticket DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const overallAvgTicket = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.total_revenue), 0) /
          rows.reduce((sum, r) => sum + Number(r.total_sales), 0))
      : 0;

    return { customers: rows, overallAvgTicket };
  }

  // ==========================================
  // SALES REPORTS (5)
  // ==========================================

  // 16. Sales by period
  async getSalesByPeriod(filters: ReportFilters) {
    const groupBy = this.getGroupBy(filters);
    const { conditions, values, nextIdx } = this.buildDateFilter(filters, 'sale_date');

    const whereConditions = ["status != 'CANCELLED'", ...conditions];
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT
        date_trunc($${nextIdx}, sale_date)::date as period,
        COUNT(*)::int as total_sales,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0)::int as avg_ticket
      FROM sales
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `;

    const allValues = [...values, groupBy];
    const result = await db.query(query, allValues);
    const rows = result.rows;

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue), 0);
    const totalSales = rows.reduce((sum, r) => sum + Number(r.total_sales), 0);

    return { periods: rows, totalRevenue, totalSales };
  }

  // 17. Sales by seller
  async getSalesBySeller(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT u.id, u.name as seller_name,
        COUNT(s.id)::int as total_sales,
        COALESCE(SUM(s.total), 0) as total_revenue,
        COALESCE(AVG(s.total), 0)::int as avg_ticket
      FROM sales s
      JOIN users u ON u.id = s.created_by
      WHERE s.status != 'CANCELLED'
        ${dateWhere}
      GROUP BY u.id, u.name
      ORDER BY total_revenue DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue), 0);

    return { sellers: rows, totalRevenue };
  }

  // 18. Sales by payment method
  async getSalesByPayment(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT sp.payment_method,
        COUNT(*)::int as total_payments,
        COALESCE(SUM(sp.amount), 0) as total_amount
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id AND s.status != 'CANCELLED'
        ${dateWhere}
      GROUP BY sp.payment_method
      ORDER BY total_amount DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);

    return { methods: rows, totalAmount };
  }

  // 19. Period comparison
  async getSalesComparison(filters: ReportFilters) {
    const currentStart = filters.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const currentEnd = filters.endDate || new Date().toISOString().split('T')[0];

    const start = new Date(currentStart);
    const end = new Date(currentEnd + 'T23:59:59');
    const durationMs = end.getTime() - start.getTime();

    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0] + 'T23:59:59';

    const periodQuery = `
      SELECT COUNT(*)::int as sales,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(AVG(total), 0)::int as avg_ticket
      FROM sales
      WHERE status != 'CANCELLED'
        AND sale_date >= $1 AND sale_date <= $2
    `;

    const [currentResult, previousResult] = await Promise.all([
      db.query(periodQuery, [currentStart, currentEnd + 'T23:59:59']),
      db.query(periodQuery, [prevStartStr, prevEndStr]),
    ]);

    const current = currentResult.rows[0] || { sales: 0, revenue: 0, avg_ticket: 0 };
    const previous = previousResult.rows[0] || { sales: 0, revenue: 0, avg_ticket: 0 };

    const calcDelta = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : curr > 0 ? 100 : 0;

    return {
      current: {
        sales: Number(current.sales),
        revenue: Number(current.revenue),
        avgTicket: Number(current.avg_ticket),
      },
      previous: {
        sales: Number(previous.sales),
        revenue: Number(previous.revenue),
        avgTicket: Number(previous.avg_ticket),
      },
      deltaRevenue: calcDelta(Number(current.revenue), Number(previous.revenue)),
      deltaSales: calcDelta(Number(current.sales), Number(previous.sales)),
      deltaTicket: calcDelta(Number(current.avg_ticket), Number(previous.avg_ticket)),
    };
  }

  // 20. Sales by product category
  async getSalesByCategory(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 's.sale_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT p.category,
        COUNT(DISTINCT s.id)::int as total_sales,
        SUM(si.quantity)::int as total_quantity,
        COALESCE(SUM(si.total), 0) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.status != 'CANCELLED'
        ${dateWhere}
      JOIN products p ON p.id = si.product_id
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue), 0);

    return { categories: rows, totalRevenue };
  }

  // ==========================================
  // FINANCIAL REPORTS (5)
  // ==========================================

  // 21. Realized cash flow
  async getFinancialCashFlow(filters: ReportFilters) {
    const groupBy = this.getGroupBy(filters);

    // Receivables (paid sale_payments)
    const { conditions: recCond, values: recVals, nextIdx: recNext } = this.buildDateFilter(filters, 'sp.paid_date');
    const recWhere = recCond.length > 0 ? `AND ${recCond.join(' AND ')}` : '';

    const receivablesQuery = `
      SELECT date_trunc($${recNext}, sp.paid_date)::date as period,
        SUM(sp.amount) as received
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id
      WHERE sp.status = 'PAID' AND sp.paid_date IS NOT NULL
        ${recWhere}
      GROUP BY period
    `;

    // Payables (paid purchase installments from JSONB)
    const { conditions: payCond, values: payVals, nextIdx: payNext } = this.buildDateFilter(filters, "(inst->>'paidDate')::timestamptz");
    const payWhere = payCond.length > 0 ? `AND ${payCond.join(' AND ')}` : '';

    const payablesQuery = `
      SELECT date_trunc($${payNext}, (inst->>'paidDate')::timestamptz)::date as period,
        SUM((inst->>'amount')::int) as paid
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      WHERE pb.status IN ('PURCHASED', 'RECEIVED')
        AND (inst->>'status') = 'PAID'
        AND (inst->>'paidDate') IS NOT NULL
        ${payWhere}
      GROUP BY period
    `;

    const [recResult, payResult] = await Promise.all([
      db.query(receivablesQuery, [...recVals, groupBy]),
      db.query(payablesQuery, [...payVals, groupBy]),
    ]);

    // Merge by period
    const periodMap: Record<string, { received: number; paid: number }> = {};

    for (const row of recResult.rows) {
      const key = row.period;
      if (!periodMap[key]) periodMap[key] = { received: 0, paid: 0 };
      periodMap[key].received += Number(row.received);
    }

    for (const row of payResult.rows) {
      const key = row.period;
      if (!periodMap[key]) periodMap[key] = { received: 0, paid: 0 };
      periodMap[key].paid += Number(row.paid);
    }

    const periods = Object.entries(periodMap)
      .map(([period, data]) => ({
        period,
        received: data.received,
        paid: data.paid,
        balance: data.received - data.paid,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totalReceived = periods.reduce((sum, p) => sum + p.received, 0);
    const totalPaid = periods.reduce((sum, p) => sum + p.paid, 0);

    return {
      periods,
      totalReceived,
      totalPaid,
      netBalance: totalReceived - totalPaid,
    };
  }

  // 22. Aging receivables
  async getFinancialAgingReceivables(_filters: ReportFilters) {
    const bucketsQuery = `
      SELECT
        CASE
          WHEN CURRENT_DATE - sp.due_date::date <= 30 THEN '0-30'
          WHEN CURRENT_DATE - sp.due_date::date <= 60 THEN '31-60'
          WHEN CURRENT_DATE - sp.due_date::date <= 90 THEN '61-90'
          ELSE '90+'
        END as aging_bucket,
        COUNT(*)::int as count,
        SUM(sp.amount) as total_amount
      FROM sale_payments sp
      WHERE sp.status IN ('PENDING', 'OVERDUE') AND sp.due_date::date <= CURRENT_DATE
      GROUP BY aging_bucket
      ORDER BY aging_bucket
    `;

    const detailQuery = `
      SELECT sp.id, sp.amount, sp.due_date::date as due_date, sp.status,
        CURRENT_DATE - sp.due_date::date as days_overdue,
        c.name as customer_name, c.phone as customer_phone,
        s.id as sale_id
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE sp.status IN ('PENDING', 'OVERDUE') AND sp.due_date::date <= CURRENT_DATE
      ORDER BY sp.due_date ASC
    `;

    const [bucketsResult, detailResult] = await Promise.all([
      db.query(bucketsQuery),
      db.query(detailQuery),
    ]);

    const total = bucketsResult.rows.reduce((sum, r) => sum + Number(r.total_amount), 0);

    return {
      buckets: bucketsResult.rows,
      total,
      entries: detailResult.rows,
    };
  }

  // 23. Aging payables
  async getFinancialAgingPayables(_filters: ReportFilters) {
    const bucketsQuery = `
      SELECT
        CASE
          WHEN CURRENT_DATE - (inst->>'dueDate')::date <= 30 THEN '0-30'
          WHEN CURRENT_DATE - (inst->>'dueDate')::date <= 60 THEN '31-60'
          WHEN CURRENT_DATE - (inst->>'dueDate')::date <= 90 THEN '61-90'
          ELSE '90+'
        END as aging_bucket,
        COUNT(*)::int as count,
        SUM((inst->>'amount')::int) as total_amount
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      WHERE pb.status IN ('PURCHASED', 'RECEIVED')
        AND (inst->>'status') IN ('PENDING', 'pending')
        AND (inst->>'dueDate')::date <= CURRENT_DATE
      GROUP BY aging_bucket
      ORDER BY aging_bucket
    `;

    const detailQuery = `
      SELECT pb.id as budget_id, pb.budget_number, pb.title,
        s.name as supplier_name,
        (inst->>'amount')::int as amount,
        (inst->>'dueDate')::date as due_date,
        (inst->>'status') as status,
        CURRENT_DATE - (inst->>'dueDate')::date as days_overdue
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      LEFT JOIN suppliers s ON s.id = pb.supplier_id
      WHERE pb.status IN ('PURCHASED', 'RECEIVED')
        AND (inst->>'status') IN ('PENDING', 'pending')
        AND (inst->>'dueDate')::date <= CURRENT_DATE
      ORDER BY (inst->>'dueDate')::date ASC
    `;

    const [bucketsResult, detailResult] = await Promise.all([
      db.query(bucketsQuery),
      db.query(detailQuery),
    ]);

    const total = bucketsResult.rows.reduce((sum, r) => sum + Number(r.total_amount), 0);

    return {
      buckets: bucketsResult.rows,
      total,
      entries: detailResult.rows,
    };
  }

  // 24. Simplified DRE (P&L)
  async getFinancialDre(filters: ReportFilters) {
    // Revenue: paid sale_payments in period
    const { conditions: revCond, values: revVals } = this.buildDateFilter(filters, 'sp.paid_date');
    const revWhere = revCond.length > 0 ? `AND ${revCond.join(' AND ')}` : '';

    const revenueQuery = `
      SELECT COALESCE(SUM(sp.amount), 0) as total_revenue
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id
      WHERE sp.status = 'PAID'
        ${revWhere}
    `;

    // Expenses: paid purchase installments in period
    const { conditions: expCond, values: expVals } = this.buildDateFilter(filters, "(inst->>'paidDate')::timestamptz");
    const expWhere = expCond.length > 0 ? `AND ${expCond.join(' AND ')}` : '';

    const expensesQuery = `
      SELECT COALESCE(SUM((inst->>'amount')::int), 0) as total_expenses
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      WHERE (inst->>'status') = 'PAID'
        ${expWhere}
    `;

    // COGS: cost of products sold
    const { conditions: cogsCond, values: cogsVals } = this.buildDateFilter(filters, 's.sale_date');
    const cogsWhere = cogsCond.length > 0 ? `AND ${cogsCond.join(' AND ')}` : '';

    const cogsQuery = `
      SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) as cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.status != 'CANCELLED'
        ${cogsWhere}
      JOIN products p ON p.id = si.product_id
    `;

    const [revResult, expResult, cogsResult] = await Promise.all([
      db.query(revenueQuery, revVals),
      db.query(expensesQuery, expVals),
      db.query(cogsQuery, cogsVals),
    ]);

    const revenue = Number(revResult.rows[0]?.total_revenue || 0);
    const expenses = Number(expResult.rows[0]?.total_expenses || 0);
    const cogs = Number(cogsResult.rows[0]?.cogs || 0);

    return {
      revenue,
      expenses,
      cogs,
      grossProfit: revenue - cogs,
      netResult: revenue - expenses,
    };
  }

  // 25. Delinquency rate over time
  async getFinancialDelinquency(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'sp.due_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT date_trunc('month', sp.due_date)::date as period,
        COUNT(*)::int as total_installments,
        COUNT(CASE WHEN sp.status = 'OVERDUE' THEN 1 END)::int as overdue_installments,
        SUM(sp.amount) as total_amount,
        SUM(CASE WHEN sp.status = 'OVERDUE' THEN sp.amount ELSE 0 END) as overdue_amount
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
      GROUP BY period
      ORDER BY period ASC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const periods = rows.map(row => ({
      period: row.period,
      total: Number(row.total_installments),
      overdue: Number(row.overdue_installments),
      totalAmount: Number(row.total_amount),
      overdueAmount: Number(row.overdue_amount),
      rate: Number(row.total_installments) > 0
        ? Math.round(Number(row.overdue_installments) / Number(row.total_installments) * 10000) / 100
        : 0,
    }));

    return { periods };
  }

  // ==========================================
  // PURCHASES REPORTS (5)
  // ==========================================

  // 26. Purchases by status
  async getPurchasesByStatus(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'created_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT status, COUNT(*)::int as count, COALESCE(SUM(total_amount), 0) as total_value
      FROM purchase_budgets
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    return { statuses: rows, total };
  }

  // 27. Purchases by priority
  async getPurchasesByPriority(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'created_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT priority, COUNT(*)::int as count, COALESCE(SUM(total_amount), 0) as total_value
      FROM purchase_budgets
      ${whereClause}
      GROUP BY priority
      ORDER BY count DESC
    `;

    const result = await db.query(query, values);

    return { priorities: result.rows };
  }

  // 28. Quote comparison
  async getPurchasesQuoteComparison(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pb.created_at');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT pbi.id as item_id, p.name as product_name, p.code as product_code,
        pbi.quantity,
        COUNT(pbq.id)::int as quote_count,
        MIN(pbq.unit_price) as min_price,
        MAX(pbq.unit_price) as max_price,
        AVG(pbq.unit_price)::numeric(15,2) as avg_price,
        (MAX(pbq.unit_price) - MIN(pbq.unit_price)) as price_spread
      FROM purchase_budget_items pbi
      JOIN products p ON p.id = pbi.product_id
      LEFT JOIN purchase_budget_quotes pbq ON pbq.item_id = pbi.id
      JOIN purchase_budgets pb ON pb.id = pbi.budget_id
      WHERE 1=1 ${dateWhere}
      GROUP BY pbi.id, p.name, p.code, pbi.quantity
      HAVING COUNT(pbq.id) > 1
      ORDER BY price_spread DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const avgSavingPotential = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.price_spread), 0) / rows.length)
      : 0;

    return { items: rows, avgSavingPotential };
  }

  // 29. Purchases by period
  async getPurchasesByPeriod(filters: ReportFilters) {
    const groupBy = this.getGroupBy(filters);
    const { conditions, values, nextIdx } = this.buildDateFilter(filters, 'purchased_at');

    const whereConditions = ["status IN ('PURCHASED', 'RECEIVED')", ...conditions];
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT date_trunc($${nextIdx}, purchased_at)::date as period,
        COUNT(*)::int as total_orders,
        COALESCE(SUM(total_amount), 0) as total_value
      FROM purchase_budgets
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `;

    const allValues = [...values, groupBy];
    const result = await db.query(query, allValues);
    const rows = result.rows;

    const totalValue = rows.reduce((sum, r) => sum + Number(r.total_value), 0);
    const totalOrders = rows.reduce((sum, r) => sum + Number(r.total_orders), 0);

    return { periods: rows, totalValue, totalOrders };
  }

  // 30. Approval time
  async getPurchasesApprovalTime(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pb.created_at');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT pb.id, pb.budget_number, pb.title, pb.priority,
        pb.created_at, pb.approved_at,
        EXTRACT(DAY FROM (pb.approved_at - pb.created_at))::int as approval_days,
        u.name as approved_by_name
      FROM purchase_budgets pb
      LEFT JOIN users u ON u.id = pb.approved_by
      WHERE pb.approved_at IS NOT NULL
        ${dateWhere}
      ORDER BY approval_days DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const avgApprovalDays = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.approval_days), 0) / rows.length * 10) / 10
      : 0;

    return { budgets: rows, avgApprovalDays };
  }

  // ==========================================
  // ORDERS REPORTS (5)
  // ==========================================

  // 31. Orders by status
  async getOrdersByStatus(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'order_date');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT status, COUNT(*)::int as count, COALESCE(SUM(total_amount), 0) as total_value
      FROM supplier_orders
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    return { statuses: rows, total };
  }

  // 32. Delivery delays
  async getOrdersDelays(_filters: ReportFilters) {
    const query = `
      SELECT so.id, so.order_number, s.name as supplier_name,
        so.expected_delivery_date, so.order_date,
        CURRENT_DATE - so.expected_delivery_date::date as days_overdue,
        so.total_amount, so.status
      FROM supplier_orders so
      JOIN suppliers s ON s.id = so.supplier_id
      WHERE so.expected_delivery_date::date < CURRENT_DATE
        AND so.status NOT IN ('RECEIVED', 'CANCELLED')
      ORDER BY days_overdue DESC
    `;

    const result = await db.query(query);
    const rows = result.rows;

    const totalDelayed = rows.length;
    const totalDelayedValue = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);

    return { orders: rows, totalDelayed, totalDelayedValue };
  }

  // 33. Pending receipts
  async getOrdersPendingReceipts(_filters: ReportFilters) {
    const query = `
      SELECT so.order_number, s.name as supplier_name,
        soi.id as item_id, p.code as product_code, p.name as product_name,
        soi.quantity, soi.quantity_received,
        (soi.quantity - soi.quantity_received) as quantity_pending,
        soi.unit_price
      FROM supplier_order_items soi
      JOIN supplier_orders so ON so.id = soi.supplier_order_id
      JOIN suppliers s ON s.id = so.supplier_id
      JOIN products p ON p.id = soi.product_id
      WHERE (soi.quantity - soi.quantity_received) > 0
        AND so.status NOT IN ('CANCELLED')
      ORDER BY so.order_number, p.name
    `;

    const result = await db.query(query);
    const rows = result.rows;

    const totalPendingItems = rows.length;
    const totalPendingValue = rows.reduce(
      (sum, r) => sum + (Number(r.quantity_pending) * Number(r.unit_price)),
      0
    );

    return { items: rows, totalPendingItems, totalPendingValue };
  }

  // 34. Volume by supplier
  async getOrdersBySupplier(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'so.order_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT s.id, s.code, s.name,
        COUNT(so.id)::int as total_orders,
        COALESCE(SUM(so.total_amount), 0) as total_value,
        COUNT(CASE WHEN so.status = 'RECEIVED' THEN 1 END)::int as completed_orders
      FROM suppliers s
      JOIN supplier_orders so ON so.supplier_id = s.id
      WHERE 1=1 ${dateWhere}
      GROUP BY s.id, s.code, s.name
      ORDER BY total_value DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalValue = rows.reduce((sum, r) => sum + Number(r.total_value), 0);
    const totalOrders = rows.reduce((sum, r) => sum + Number(r.total_orders), 0);

    return { suppliers: rows, totalValue, totalOrders };
  }

  // 35. Receipts quality / compliance
  async getOrdersCompliance(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'gr.receipt_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT s.name as supplier_name,
        COUNT(gri.id)::int as total_items,
        COALESCE(SUM(gri.quantity_received), 0)::int as total_received,
        COALESCE(SUM(gri.quantity_accepted), 0)::int as total_accepted,
        COALESCE(SUM(gri.quantity_rejected), 0)::int as total_rejected,
        CASE WHEN SUM(gri.quantity_received) > 0 THEN
          ROUND(SUM(gri.quantity_accepted)::numeric / SUM(gri.quantity_received) * 100, 1)
        ELSE 0 END as acceptance_rate
      FROM goods_receipt_items gri
      JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
      JOIN suppliers s ON s.id = gr.supplier_id
      WHERE 1=1 ${dateWhere}
      GROUP BY s.name
      ORDER BY acceptance_rate ASC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalReceived = rows.reduce((sum, r) => sum + Number(r.total_received), 0);
    const totalAccepted = rows.reduce((sum, r) => sum + Number(r.total_accepted), 0);
    const overallAcceptanceRate = totalReceived > 0
      ? Math.round(totalAccepted / totalReceived * 1000) / 10
      : 0;

    return { suppliers: rows, overallAcceptanceRate };
  }

  // ==========================================
  // PRODUCTION REPORTS (5)
  // ==========================================

  // 36. Production efficiency
  async getProductionEfficiency(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pb.created_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT pb.id, pb.batch_number, p.name as product_name,
        pb.quantity_planned, pb.quantity_produced, pb.quantity_scrapped,
        CASE WHEN pb.quantity_planned > 0 THEN
          ROUND(pb.quantity_produced::numeric / pb.quantity_planned * 100, 1)
        ELSE 0 END as efficiency_percent,
        pb.status, pb.planned_start_date, pb.actual_end_date
      FROM production_batches pb
      JOIN products p ON p.id = pb.product_id
      ${whereClause}
      ORDER BY pb.created_at DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const avgEfficiency = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.efficiency_percent), 0) / rows.length * 10) / 10
      : 0;

    return { batches: rows, avgEfficiency };
  }

  // 37. Defect/scrap rate
  async getProductionDefectRate(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pb.created_at');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT pb.id, pb.batch_number, p.name as product_name,
        pb.quantity_produced, pb.quantity_scrapped,
        CASE WHEN (pb.quantity_produced + pb.quantity_scrapped) > 0 THEN
          ROUND(pb.quantity_scrapped::numeric / (pb.quantity_produced + pb.quantity_scrapped) * 100, 1)
        ELSE 0 END as defect_rate
      FROM production_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status IN ('COMPLETED', 'IN_PROGRESS', 'TESTING')
        AND (pb.quantity_produced + pb.quantity_scrapped) > 0
        ${dateWhere}
      ORDER BY defect_rate DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalProduced = rows.reduce((sum, r) => sum + Number(r.quantity_produced), 0);
    const totalScrapped = rows.reduce((sum, r) => sum + Number(r.quantity_scrapped), 0);
    const avgDefectRate = (totalProduced + totalScrapped) > 0
      ? Math.round(totalScrapped / (totalProduced + totalScrapped) * 1000) / 10
      : 0;

    return { batches: rows, avgDefectRate, totalProduced, totalScrapped };
  }

  // 38. Production by period
  async getProductionByPeriod(filters: ReportFilters) {
    const groupBy = this.getGroupBy(filters);
    const { conditions, values, nextIdx } = this.buildDateFilter(filters, 'pb.actual_end_date');

    const whereConditions = [
      "pb.status = 'COMPLETED'",
      'pb.actual_end_date IS NOT NULL',
      ...conditions,
    ];
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT date_trunc($${nextIdx}, pb.actual_end_date)::date as period,
        COUNT(*)::int as batches_completed,
        COALESCE(SUM(pb.quantity_produced), 0)::int as units_produced,
        COALESCE(SUM(pb.quantity_scrapped), 0)::int as units_scrapped
      FROM production_batches pb
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `;

    const allValues = [...values, groupBy];
    const result = await db.query(query, allValues);
    const rows = result.rows;

    const totalProduced = rows.reduce((sum, r) => sum + Number(r.units_produced), 0);
    const totalBatches = rows.reduce((sum, r) => sum + Number(r.batches_completed), 0);

    return { periods: rows, totalProduced, totalBatches };
  }

  // 39. Production by operator
  async getProductionByOperator(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'pu.created_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT u.id, u.name as operator_name,
        COUNT(DISTINCT pu.batch_id)::int as batches_worked,
        COUNT(pu.id)::int as units_total,
        COUNT(CASE WHEN pu.status = 'COMPLETED' THEN 1 END)::int as units_completed,
        COUNT(CASE WHEN pu.status = 'SCRAPPED' THEN 1 END)::int as units_scrapped
      FROM production_units pu
      JOIN users u ON u.id = pu.assigned_to
      ${whereClause}
      GROUP BY u.id, u.name
      ORDER BY units_completed DESC
    `;

    const result = await db.query(query, values);

    return { operators: result.rows };
  }

  // 40. Test results
  async getProductionTestResults(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'ut.tested_at');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT ut.test_type, ut.result, COUNT(*)::int as count
      FROM unit_tests ut
      ${whereClause}
      GROUP BY ut.test_type, ut.result
      ORDER BY ut.test_type, ut.result
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    // Build summary per test_type
    const summaryMap: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const row of rows) {
      if (!summaryMap[row.test_type]) {
        summaryMap[row.test_type] = { total: 0, passed: 0, failed: 0 };
      }
      const count = Number(row.count);
      summaryMap[row.test_type].total += count;
      if (row.result === 'PASSED' || row.result === 'PASS') {
        summaryMap[row.test_type].passed += count;
      } else {
        summaryMap[row.test_type].failed += count;
      }
    }

    const summary = Object.entries(summaryMap).map(([testType, data]) => ({
      testType,
      total: data.total,
      passed: data.passed,
      failed: data.failed,
      passRate: data.total > 0 ? Math.round(data.passed / data.total * 1000) / 10 : 0,
    }));

    return { results: rows, summary };
  }

  // ==========================================
  // SERVICE ORDERS REPORTS (5)
  // ==========================================

  // 41. Service orders by status
  async getServiceOrdersByStatus(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'entry_date');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT status, COUNT(*)::int as count
      FROM service_orders
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    return { statuses: rows, total };
  }

  // 42. Average resolution time
  async getServiceOrdersAvgTime(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'so.entry_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT so.id, so.order_number, c.name as customer_name,
        so.status, so.entry_date, so.completion_date,
        EXTRACT(DAY FROM (so.completion_date - so.entry_date))::int as resolution_days
      FROM service_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.completion_date IS NOT NULL
        ${dateWhere}
      ORDER BY resolution_days DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const avgResolutionDays = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.resolution_days), 0) / rows.length * 10) / 10
      : 0;

    return { orders: rows, avgResolutionDays };
  }

  // 43. Service orders by technician
  async getServiceOrdersByTechnician(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'so.entry_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT u.id, u.name as technician_name,
        COUNT(so.id)::int as total_orders,
        COUNT(CASE WHEN so.status = 'COMPLETED' THEN 1 END)::int as completed,
        COUNT(CASE WHEN so.status IN ('OPEN', 'IN_SERVICE', 'AWAITING_PARTS') THEN 1 END)::int as in_progress,
        COALESCE(SUM(so.total_cost), 0) as total_revenue
      FROM service_orders so
      JOIN users u ON u.id = so.technician_id
      WHERE 1=1 ${dateWhere}
      GROUP BY u.id, u.name
      ORDER BY total_orders DESC
    `;

    const result = await db.query(query, values);

    return { technicians: result.rows };
  }

  // 44. Service orders cost analysis
  async getServiceOrdersCosts(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'so.entry_date');
    const dateWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT so.id, so.order_number, c.name as customer_name,
        so.labor_cost, so.parts_cost, so.total_cost,
        CASE WHEN so.total_cost > 0 THEN
          ROUND(so.labor_cost::numeric / so.total_cost * 100, 1)
        ELSE 0 END as labor_percent
      FROM service_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.total_cost > 0
        ${dateWhere}
      ORDER BY so.total_cost DESC
    `;

    const result = await db.query(query, values);
    const rows = result.rows;

    const totalLabor = rows.reduce((sum, r) => sum + Number(r.labor_cost), 0);
    const totalParts = rows.reduce((sum, r) => sum + Number(r.parts_cost), 0);
    const totalCost = rows.reduce((sum, r) => sum + Number(r.total_cost), 0);

    return { orders: rows, totalLabor, totalParts, totalCost };
  }

  // 45. Warranty analysis
  async getServiceOrdersWarranty(filters: ReportFilters) {
    const { conditions, values } = this.buildDateFilter(filters, 'entry_date');

    const whereConditions = ["status != 'CANCELLED'", ...conditions];
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const summaryQuery = `
      SELECT
        COUNT(*)::int as total_orders,
        COUNT(CASE WHEN is_warranty THEN 1 END)::int as warranty_orders,
        COUNT(CASE WHEN NOT is_warranty THEN 1 END)::int as regular_orders,
        COALESCE(SUM(CASE WHEN is_warranty THEN total_cost ELSE 0 END), 0) as warranty_cost,
        COALESCE(SUM(CASE WHEN NOT is_warranty THEN total_cost ELSE 0 END), 0) as regular_revenue
      FROM service_orders
      ${whereClause}
    `;

    const detailWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    const detailQuery = `
      SELECT so.id, so.order_number, c.name as customer_name,
        so.entry_date, so.completion_date, so.total_cost, so.status
      FROM service_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.is_warranty = true AND so.status != 'CANCELLED'
        ${detailWhere}
      ORDER BY so.entry_date DESC
    `;

    const [summaryResult, detailResult] = await Promise.all([
      db.query(summaryQuery, values),
      db.query(detailQuery, values),
    ]);

    const summary = summaryResult.rows[0] || {
      total_orders: 0,
      warranty_orders: 0,
      regular_orders: 0,
      warranty_cost: 0,
      regular_revenue: 0,
    };

    return {
      summary: {
        total: Number(summary.total_orders),
        warranty: Number(summary.warranty_orders),
        regular: Number(summary.regular_orders),
        warrantyCost: Number(summary.warranty_cost),
        regularRevenue: Number(summary.regular_revenue),
      },
      warrantyOrders: detailResult.rows,
    };
  }
}
