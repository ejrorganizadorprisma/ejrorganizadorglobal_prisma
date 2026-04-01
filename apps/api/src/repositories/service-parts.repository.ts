import { db } from '../config/database';
import type { ServicePart, AddServicePartDTO } from '@ejr/shared-types';

export class ServicePartsRepository {
  async findByServiceOrderId(serviceOrderId: string) {
    const query = `
      SELECT
        sp.*,
        p.id as product_id_rel,
        p.code as product_code,
        p.name as product_name,
        p.cost_price as product_cost_price,
        p.current_stock as product_current_stock
      FROM service_parts sp
      LEFT JOIN products p ON sp.product_id = p.id
      WHERE sp.service_order_id = $1
      ORDER BY sp.created_at ASC
    `;

    const result = await db.query(query, [serviceOrderId]);

    // Converte snake_case para camelCase
    return (result.rows || []).map(item => ({
      id: item.id,
      serviceOrderId: item.service_order_id,
      productId: item.product_id,
      quantity: item.quantity,
      unitCost: item.unit_cost,
      totalCost: item.total_cost,
      createdAt: item.created_at,
      product: item.product_id_rel ? {
        id: item.product_id_rel,
        code: item.product_code,
        name: item.product_name,
        costPrice: item.product_cost_price,
        currentStock: item.product_current_stock,
      } : undefined,
    }));
  }

  async findById(id: string) {
    const result = await db.query('SELECT * FROM service_parts WHERE id = $1', [id]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];
    return {
      id: data.id,
      serviceOrderId: data.service_order_id,
      productId: data.product_id,
      quantity: data.quantity,
      unitCost: data.unit_cost,
      totalCost: data.total_cost,
      createdAt: data.created_at,
    } as ServicePart;
  }

  async add(serviceOrderId: string, partData: AddServicePartDTO) {
    // Usar RPC para adicionar peça (vai atualizar estoque e custos automaticamente)
    const result = await db.query(
      'SELECT add_service_part($1, $2, $3) as data',
      [serviceOrderId, partData.productId, partData.quantity]
    );

    return result.rows[0]?.data;
  }

  async remove(id: string) {
    const result = await db.query('DELETE FROM service_parts WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error('Peça não encontrada');
    }

    return { success: true };
  }
}
