import { db } from '../config/database';

export class SellersRepository {
  // Get all sellers (users with SALESPERSON role) with aggregated stats
  async getSellerStats(filters: { startDate?: string; endDate?: string }) {
    // Build date conditions for sales
    const saleConditions: string[] = ["s.status != 'CANCELLED'"];
    const values: any[] = [];
    let idx = 1;

    if (filters.startDate) {
      saleConditions.push(`s.sale_date >= $${idx}`);
      values.push(filters.startDate);
      idx++;
    }
    if (filters.endDate) {
      saleConditions.push(`s.sale_date <= $${idx}`);
      values.push(filters.endDate);
      idx++;
    }

    const saleDateWhere = saleConditions.join(' AND ');
    // For quotes, replace s.sale_date with q.created_at
    const quoteDateWhere = saleDateWhere.replace(/s\.sale_date/g, 'q.created_at').replace(/s\.status/g, 'q.status');

    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_active,
        u.mobile_app_authorized,
        u.mobile_app_last_login,
        u.mobile_app_last_sync,
        COALESCE(sale_stats.total_sales, 0)::int AS total_sales,
        COALESCE(sale_stats.total_revenue, 0)::bigint AS total_revenue,
        COALESCE(sale_stats.total_paid, 0)::bigint AS total_paid,
        COALESCE(sale_stats.avg_ticket, 0)::bigint AS avg_ticket,
        COALESCE(cust_stats.total_customers, 0)::int AS total_customers,
        COALESCE(quote_stats.total_quotes, 0)::int AS total_quotes,
        COALESCE(quote_stats.total_quote_value, 0)::bigint AS total_quote_value,
        COALESCE(quote_stats.converted_quotes, 0)::int AS converted_quotes
      FROM users u
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_sales,
          COALESCE(SUM(s.total), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN sp.paid_amount IS NOT NULL THEN sp.paid_amount ELSE 0 END), 0) AS total_paid,
          COALESCE(AVG(s.total), 0) AS avg_ticket
        FROM sales s
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(amount), 0) AS paid_amount
          FROM sale_payments
          WHERE sale_id = s.id AND status = 'PAID'
        ) sp ON true
        WHERE s.created_by = u.id AND ${saleDateWhere}
      ) sale_stats ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS total_customers
        FROM customers c
        WHERE c.created_by = u.id
      ) cust_stats ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_quotes,
          COALESCE(SUM(q.total), 0) AS total_quote_value,
          COUNT(CASE WHEN q.status = 'CONVERTED' THEN 1 END)::int AS converted_quotes
        FROM quotes q
        WHERE q.responsible_user_id = u.id AND ${quoteDateWhere.replace("q.status != 'CANCELLED'", "1=1")}
      ) quote_stats ON true
      WHERE u.role = 'SALESPERSON'
      ORDER BY COALESCE(sale_stats.total_revenue, 0) DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Get time series for a specific seller
  async getSellerTimeSeries(sellerId: string, filters: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    const groupBy = filters.groupBy || 'month';
    const truncExpr = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : groupBy === 'year' ? 'year' : 'month';

    const conditions: string[] = ["s.created_by = $1", "s.status != 'CANCELLED'"];
    const values: any[] = [sellerId];
    let idx = 2;

    if (filters.startDate) {
      conditions.push(`s.sale_date >= $${idx}`);
      values.push(filters.startDate);
      idx++;
    }
    if (filters.endDate) {
      conditions.push(`s.sale_date <= $${idx}`);
      values.push(filters.endDate);
      idx++;
    }

    const query = `
      SELECT
        date_trunc('${truncExpr}', s.sale_date)::date AS period,
        COUNT(*)::int AS total_sales,
        COALESCE(SUM(s.total), 0)::bigint AS total_revenue,
        COALESCE(AVG(s.total), 0)::bigint AS avg_ticket
      FROM sales s
      WHERE ${conditions.join(' AND ')}
      GROUP BY period
      ORDER BY period ASC
    `;

    const result = await db.query(query, values);

    const userResult = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [sellerId]
    );

    return {
      seller: userResult.rows[0] || null,
      timeSeries: result.rows,
    };
  }

  // Get comparison time series for ALL sellers
  async getComparison(filters: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    const groupBy = filters.groupBy || 'month';
    const truncExpr = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : groupBy === 'year' ? 'year' : 'month';

    const conditions: string[] = ["s.status != 'CANCELLED'"];
    const values: any[] = [];
    let idx = 1;

    if (filters.startDate) {
      conditions.push(`s.sale_date >= $${idx}`);
      values.push(filters.startDate);
      idx++;
    }
    if (filters.endDate) {
      conditions.push(`s.sale_date <= $${idx}`);
      values.push(filters.endDate);
      idx++;
    }

    const query = `
      SELECT
        u.id AS seller_id,
        u.name AS seller_name,
        date_trunc('${truncExpr}', s.sale_date)::date AS period,
        COUNT(*)::int AS total_sales,
        COALESCE(SUM(s.total), 0)::bigint AS total_revenue,
        COALESCE(AVG(s.total), 0)::bigint AS avg_ticket
      FROM sales s
      JOIN users u ON u.id = s.created_by
      WHERE u.role = 'SALESPERSON' AND ${conditions.join(' AND ')}
      GROUP BY u.id, u.name, period
      ORDER BY u.name, period ASC
    `;

    const result = await db.query(query, values);

    // Group by seller
    const sellersMap = new Map<string, { seller_id: string; seller_name: string; timeSeries: any[] }>();
    for (const row of result.rows) {
      if (!sellersMap.has(row.seller_id)) {
        sellersMap.set(row.seller_id, {
          seller_id: row.seller_id,
          seller_name: row.seller_name,
          timeSeries: [],
        });
      }
      sellersMap.get(row.seller_id)!.timeSeries.push({
        period: row.period,
        total_sales: row.total_sales,
        total_revenue: row.total_revenue,
        avg_ticket: row.avg_ticket,
      });
    }

    return Array.from(sellersMap.values());
  }

  // Get detailed seller info with sales, quotes, customers, collections, commissions
  async getSellerDetail(sellerId: string, filters: { startDate?: string; endDate?: string }) {
    const values: any[] = [sellerId];
    let idx = 2;

    // Date conditions
    let dateCondSales = '';
    let dateCondQuotes = '';
    let dateCondCollections = '';
    if (filters.startDate) {
      dateCondSales += ` AND s.sale_date >= $${idx}`;
      dateCondQuotes += ` AND q.created_at >= $${idx}`;
      dateCondCollections += ` AND col.created_at >= $${idx}`;
      values.push(filters.startDate);
      idx++;
    }
    if (filters.endDate) {
      dateCondSales += ` AND s.sale_date <= $${idx}`;
      dateCondQuotes += ` AND q.created_at <= $${idx}`;
      dateCondCollections += ` AND col.created_at <= $${idx}`;
      values.push(filters.endDate + 'T23:59:59');
      idx++;
    }

    // Seller info
    const sellerResult = await db.query(
      'SELECT id, name, email, is_active, mobile_app_authorized, mobile_app_last_login, mobile_app_last_sync FROM users WHERE id = $1',
      [sellerId]
    );
    const seller = sellerResult.rows[0] || null;

    // Sales list
    const salesResult = await db.query(`
      SELECT s.id, s.sale_number, s.total, s.status, s.sale_date, s.created_at,
        c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.created_by = $1 AND s.status != 'CANCELLED' ${dateCondSales}
      ORDER BY s.created_at DESC
      LIMIT 50
    `, values);

    // Quotes list
    const quotesResult = await db.query(`
      SELECT q.id, q.quote_number, q.total, q.status, q.created_at,
        c.name AS customer_name
      FROM quotes q
      LEFT JOIN customers c ON c.id = q.customer_id
      WHERE q.responsible_user_id = $1 ${dateCondQuotes}
      ORDER BY q.created_at DESC
      LIMIT 50
    `, values);

    // Customers created by seller
    const customersResult = await db.query(`
      SELECT c.id, c.name, c.type, c.phone, c.created_at
      FROM customers c
      WHERE c.created_by = $1
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [sellerId]);

    // Collections
    const collectionsResult = await db.query(`
      SELECT col.id, col.collection_number, col.amount, col.payment_method, col.status,
        col.created_at, c.name AS customer_name, s.sale_number
      FROM collections col
      LEFT JOIN customers c ON c.id = col.customer_id
      LEFT JOIN sales s ON s.id = col.sale_id
      WHERE col.seller_id = $1 ${dateCondCollections}
      ORDER BY col.created_at DESC
      LIMIT 50
    `, values);

    // Commission summary
    const commissionResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN ce.status = 'PENDING' THEN ce.commission_amount ELSE 0 END), 0)::bigint AS pending_amount,
        COALESCE(SUM(CASE WHEN ce.status = 'SETTLED' THEN ce.commission_amount ELSE 0 END), 0)::bigint AS settled_amount,
        COALESCE(SUM(ce.commission_amount), 0)::bigint AS total_earned
      FROM commission_entries ce
      WHERE ce.seller_id = $1
    `, [sellerId]);

    const commissionConfig = await db.query(
      'SELECT commission_on_sales, commission_on_collections FROM seller_commission_configs WHERE seller_id = $1 AND active = true',
      [sellerId]
    );

    return {
      seller,
      sales: salesResult.rows,
      quotes: quotesResult.rows,
      customers: customersResult.rows,
      collections: collectionsResult.rows,
      commission: {
        ...commissionResult.rows[0],
        config: commissionConfig.rows[0] || null,
      },
    };
  }
}
