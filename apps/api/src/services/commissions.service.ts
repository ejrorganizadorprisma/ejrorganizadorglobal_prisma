import { db } from '../config/database';
import { CommissionsRepository } from '../repositories/commissions.repository';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import type { CommissionForecast } from '@ejr/shared-types';

/**
 * Serviço de comissões. Por enquanto contém apenas a lógica de FORECAST
 * (previsão de comissão sobre pedidos PENDING/APPROVED). O resto do módulo
 * de comissões continua direto no repository, consumido pelas rotas.
 */
export class CommissionsService {
  private repository = new CommissionsRepository();

  /**
   * Calcula a comissão prevista se TODOS os pedidos PENDING/APPROVED do
   * vendedor virassem vendas. Mesma regra usada em sales.service:
   *
   *   - SALE_FIXED:      total do pedido × commissionOnSales / 100
   *   - SALE_BY_PRODUCT: Σ (item × products.commission_rate / 100); serviços
   *                      caem no fallback fixo (commissionOnSales)
   *
   * Se o vendedor não tem config ativa, retorna estrutura zerada.
   */
  async getForecast(sellerId: string): Promise<CommissionForecast> {
    if (!sellerId) {
      throw new NotFoundError('sellerId não informado');
    }

    // 1) Config do vendedor (se ausente / inativa, forecast = 0)
    const config = await this.repository.getConfig(sellerId);
    const active = !!(config && config.active);
    const byProduct = !!(config && config.commissionByProduct);
    const rateOnSales = config ? Number(config.commissionOnSales) || 0 : 0;

    // 2) Pedidos do vendedor em PENDING ou APPROVED (PARTIALLY_CONVERTED também
    //    representa saldo a faturar — entra no forecast).
    const ordersResult = await db.query(
      `SELECT id, order_number, subtotal, total
         FROM sales_orders
        WHERE seller_id = $1
          AND status IN ('PENDING','APPROVED','PARTIALLY_CONVERTED')
        ORDER BY created_at DESC`,
      [sellerId]
    );

    if (ordersResult.rowCount === 0 || !active) {
      return {
        pendingOrders: ordersResult.rowCount || 0,
        totalSubtotal: 0,
        forecastedCommission: 0,
        byOrder: [],
      };
    }

    const orderIds = ordersResult.rows.map((r: any) => r.id);

    // 3) Itens de TODOS os pedidos em uma única query
    const itemsResult = await db.query(
      `SELECT soi.sales_order_id, soi.item_type, soi.product_id, soi.service_name,
              soi.quantity, soi.unit_price, soi.discount, soi.total,
              p.commission_rate AS product_commission_rate
         FROM sales_order_items soi
         LEFT JOIN products p ON p.id = soi.product_id
        WHERE soi.sales_order_id = ANY($1::text[])`,
      [orderIds]
    );

    // Agrupar itens por pedido
    const itemsByOrder = new Map<string, any[]>();
    for (const row of itemsResult.rows) {
      const list = itemsByOrder.get(row.sales_order_id) || [];
      list.push(row);
      itemsByOrder.set(row.sales_order_id, list);
    }

    let totalSubtotal = 0;
    let forecastedCommission = 0;
    const byOrder: CommissionForecast['byOrder'] = [];

    for (const order of ordersResult.rows) {
      const subtotal = Number(order.subtotal) || 0;
      const total = Number(order.total) || 0;
      totalSubtotal += subtotal;

      let forecastedAmount = 0;

      if (byProduct) {
        // SALE_BY_PRODUCT: percorre itens
        const items = itemsByOrder.get(order.id) || [];
        for (const it of items) {
          const itemTotal = Number(it.total) || 0;
          if (it.item_type === 'PRODUCT') {
            const rate = it.product_commission_rate != null
              ? parseFloat(it.product_commission_rate)
              : null;
            // Quando produto não tem rate, no faturamento real a venda é
            // BLOQUEADA. Aqui no forecast tratamos como 0 (não somamos).
            if (rate != null && rate > 0) {
              forecastedAmount += Math.round((itemTotal * rate) / 100);
            }
          } else if (it.item_type === 'SERVICE') {
            if (rateOnSales > 0) {
              forecastedAmount += Math.round((itemTotal * rateOnSales) / 100);
            }
          }
        }
      } else if (rateOnSales > 0) {
        // SALE_FIXED: total da venda × taxa fixa
        forecastedAmount = Math.round((total * rateOnSales) / 100);
      }

      forecastedCommission += forecastedAmount;
      byOrder.push({
        orderId: order.id,
        orderNumber: order.order_number,
        subtotal,
        forecastedAmount,
      });
    }

    return {
      pendingOrders: ordersResult.rowCount || 0,
      totalSubtotal,
      forecastedCommission,
      byOrder,
    };
  }

  /**
   * Resolve o sellerId efetivo respeitando a regra:
   *   - SALESPERSON: força o próprio id (ignora query param)
   *   - admin/manager: aceita ?sellerId=, fallback ao próprio se omitido
   */
  resolveSellerId(userId: string, userRole: string | undefined, querySellerId?: string): string {
    if (userRole === 'SALESPERSON') return userId;
    return querySellerId || userId;
  }
}
