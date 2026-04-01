import { db } from '../config/database';

export class ReportsRepository {
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

    // Buscar itens de cada venda
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
}
