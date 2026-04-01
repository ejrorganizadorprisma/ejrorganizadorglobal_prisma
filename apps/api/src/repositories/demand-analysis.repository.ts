import { db } from '../config/database';
import type { DemandAnalysis, DemandAnalysisPeriod, AbcClassification, ConsumptionTrend, MonthlyConsumption } from '@ejr/shared-types';

export class DemandAnalysisRepository {

  /**
   * Fetch all raw data for a product's demand analysis in a single query using CTEs.
   * @param periodMonths - Período de análise em meses (3, 6, 12 ou 24). Padrão: 6.
   */
  async getProductDemandAnalysis(
    productId: string,
    periodMonths: DemandAnalysisPeriod = 6,
  ): Promise<DemandAnalysis | null> {
    // Half-period for trend comparison (recent vs previous)
    const halfPeriod = Math.floor(periodMonths / 2);

    const query = `
      WITH product_data AS (
        SELECT
          id, name, code, current_stock, minimum_stock,
          cost_price, lead_time_days, minimum_lot_quantity, status
        FROM products
        WHERE id = $1
      ),
      -- Monthly consumption for the full period (outgoing movements)
      monthly_consumption AS (
        SELECT
          to_char(date_trunc('month', im.created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(ABS(im.quantity)), 0) AS quantity
        FROM inventory_movements im
        WHERE im.product_id = $1
          AND im.type IN ('SALE', 'OUT')
          AND im.created_at >= (NOW() - ($2 || ' months')::INTERVAL)
        GROUP BY date_trunc('month', im.created_at)
        ORDER BY date_trunc('month', im.created_at)
      ),
      -- Total consumption for the selected period
      consumption_period AS (
        SELECT COALESCE(SUM(ABS(im.quantity)), 0) AS total
        FROM inventory_movements im
        WHERE im.product_id = $1
          AND im.type IN ('SALE', 'OUT')
          AND im.created_at >= (NOW() - ($2 || ' months')::INTERVAL)
      ),
      -- Total consumption last 12 months (always used for ABC classification)
      consumption_12m AS (
        SELECT COALESCE(SUM(ABS(im.quantity)), 0) AS total
        FROM inventory_movements im
        WHERE im.product_id = $1
          AND im.type IN ('SALE', 'OUT')
          AND im.created_at >= (NOW() - INTERVAL '12 months')
      ),
      -- Recent half-period consumption (for trend)
      consumption_recent AS (
        SELECT COALESCE(SUM(ABS(im.quantity)), 0) AS total
        FROM inventory_movements im
        WHERE im.product_id = $1
          AND im.type IN ('SALE', 'OUT')
          AND im.created_at >= (NOW() - ($3 || ' months')::INTERVAL)
      ),
      -- Previous half-period consumption (for trend)
      consumption_prev AS (
        SELECT COALESCE(SUM(ABS(im.quantity)), 0) AS total
        FROM inventory_movements im
        WHERE im.product_id = $1
          AND im.type IN ('SALE', 'OUT')
          AND im.created_at >= (NOW() - ($2 || ' months')::INTERVAL)
          AND im.created_at < (NOW() - ($3 || ' months')::INTERVAL)
      ),
      -- Active stock reservations
      active_reservations AS (
        SELECT COALESCE(SUM(sr.quantity), 0) AS total
        FROM stock_reservations sr
        WHERE sr.product_id = $1
          AND sr.status = 'ACTIVE'
      ),
      -- Preferred supplier
      preferred_supplier AS (
        SELECT
          s.name AS supplier_name,
          ps.lead_time_days,
          ps.unit_price,
          ps.minimum_quantity
        FROM product_suppliers ps
        JOIN suppliers s ON s.id = ps.supplier_id
        WHERE ps.product_id = $1
          AND ps.is_preferred = true
        LIMIT 1
      ),
      -- Monthly breakdown as JSON array
      monthly_json AS (
        SELECT COALESCE(
          json_agg(json_build_object('month', mc.month, 'quantity', mc.quantity) ORDER BY mc.month),
          '[]'::json
        ) AS breakdown
        FROM monthly_consumption mc
      )
      SELECT
        pd.*,
        cp.total AS consumption_period,
        c12.total AS consumption_12m,
        cr.total AS consumption_recent,
        cpv.total AS consumption_prev,
        ar.total AS active_reservations,
        ps.supplier_name,
        ps.lead_time_days AS supplier_lead_time,
        ps.unit_price AS supplier_unit_price,
        ps.minimum_quantity AS supplier_min_qty,
        mj.breakdown AS monthly_breakdown
      FROM product_data pd
      CROSS JOIN consumption_period cp
      CROSS JOIN consumption_12m c12
      CROSS JOIN consumption_recent cr
      CROSS JOIN consumption_prev cpv
      CROSS JOIN active_reservations ar
      CROSS JOIN monthly_json mj
      LEFT JOIN preferred_supplier ps ON true
    `;

    const result = await db.query(query, [productId, String(periodMonths), String(halfPeriod)]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Calculate ABC classification (always based on 12 months)
    const abcClass = await this.classifyProduct(productId);

    // Calculate derived metrics
    const consumptionPeriod = parseFloat(row.consumption_period) || 0;
    const consumption12m = parseFloat(row.consumption_12m) || 0;
    const recent = parseFloat(row.consumption_recent) || 0;
    const prev = parseFloat(row.consumption_prev) || 0;
    const currentStock = row.current_stock || 0;
    const minimumStock = row.minimum_stock || 0;
    const activeReservations = parseFloat(row.active_reservations) || 0;
    const leadTimeDays = row.supplier_lead_time || row.lead_time_days || 14;
    const minimumLotQuantity = row.minimum_lot_quantity || 1;
    const costPrice = row.cost_price || 0;

    const avgMonthlyConsumption = consumptionPeriod > 0
      ? consumptionPeriod / periodMonths
      : 0;
    const avgDailyDemand = avgMonthlyConsumption / 30;

    // Trend calculation (recent half vs previous half)
    let trend: ConsumptionTrend = 'STABLE';
    let trendPercentage = 0;
    if (prev > 0) {
      trendPercentage = ((recent - prev) / prev) * 100;
      if (trendPercentage > 15) trend = 'INCREASING';
      else if (trendPercentage < -15) trend = 'DECREASING';
    } else if (recent > 0) {
      trend = 'INCREASING';
      trendPercentage = 100;
    }

    // Safety stock based on ABC class
    const safetyDays = abcClass === 'A' ? 14 : abcClass === 'B' ? 7 : 3;
    const safetyStock = Math.ceil(safetyDays * avgDailyDemand);

    // Reorder point
    const reorderPoint = Math.ceil((avgDailyDemand * leadTimeDays) + safetyStock);

    // Days of stock remaining
    const daysOfStockRemaining = avgDailyDemand > 0
      ? Math.floor((currentStock - activeReservations) / avgDailyDemand)
      : currentStock > 0 ? 999 : 0;

    // Suggested quantity
    const rawSuggestion = reorderPoint - currentStock + activeReservations;
    const suggestedQuantity = Math.max(
      rawSuggestion > 0 ? Math.ceil(rawSuggestion) : 0,
      rawSuggestion > 0 ? minimumLotQuantity : 0
    );

    // Annual value for ABC
    const annualValue = costPrice * consumption12m;

    // Monthly breakdown
    const monthlyBreakdown: MonthlyConsumption[] = typeof row.monthly_breakdown === 'string'
      ? JSON.parse(row.monthly_breakdown)
      : row.monthly_breakdown || [];

    // Build preferred supplier
    const preferredSupplier = row.supplier_name ? {
      name: row.supplier_name,
      leadTimeDays: row.supplier_lead_time || 14,
      unitPrice: row.supplier_unit_price || 0,
      minimumQuantity: row.supplier_min_qty || 1,
    } : undefined;

    return {
      productId: row.id,
      productName: row.name,
      productCode: row.code,
      periodMonths,
      currentStock,
      minimumStock,
      abcClass,
      annualValue,
      avgMonthlyConsumption: Math.round(avgMonthlyConsumption * 100) / 100,
      avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
      monthlyBreakdown,
      trend,
      trendPercentage: Math.round(trendPercentage),
      safetyStock,
      reorderPoint,
      leadTimeDays,
      activeReservations,
      suggestedQuantity,
      daysOfStockRemaining,
      minimumLotQuantity,
      preferredSupplier,
    };
  }

  /**
   * Pareto/ABC classification across all active products.
   * A = cumulative ≤ 80%, B = ≤ 95%, C = > 95%
   */
  private async classifyProduct(productId: string): Promise<AbcClassification> {
    const query = `
      WITH product_values AS (
        SELECT
          p.id,
          COALESCE(p.cost_price, 0) * COALESCE(
            (SELECT SUM(ABS(im.quantity))
             FROM inventory_movements im
             WHERE im.product_id = p.id
               AND im.type IN ('SALE', 'OUT')
               AND im.created_at >= (NOW() - INTERVAL '12 months')
            ), 0
          ) AS annual_value
        FROM products p
        WHERE p.status = 'ACTIVE'
      ),
      ranked AS (
        SELECT
          id,
          annual_value,
          SUM(annual_value) OVER (ORDER BY annual_value DESC) AS cumulative_value,
          SUM(annual_value) OVER () AS total_value
        FROM product_values
        WHERE annual_value > 0
      )
      SELECT
        CASE
          WHEN total_value = 0 THEN 'C'
          WHEN cumulative_value / total_value <= 0.80 THEN 'A'
          WHEN cumulative_value / total_value <= 0.95 THEN 'B'
          ELSE 'C'
        END AS abc_class
      FROM ranked
      WHERE id = $1
    `;

    const result = await db.query(query, [productId]);

    if (result.rows.length === 0) {
      return 'C';
    }

    return result.rows[0].abc_class as AbcClassification;
  }
}
