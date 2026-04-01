import { db } from '../config/database';

export class InventoryMovementsRepository {
  async findByProduct(productId: string, limit: number = 100, type?: string) {
    const params: any[] = [productId];
    let paramIdx = 2;

    let query = `
      SELECT
        im.*,
        json_build_object('name', p.name, 'code', p.code) as product,
        json_build_object('name', COALESCE(u.name, 'Sistema'), 'email', u.email) as "user"
      FROM inventory_movements im
      LEFT JOIN products p ON p.id = im.product_id
      LEFT JOIN users u ON u.id = im.user_id
      WHERE im.product_id = $1
    `;

    if (type) {
      query += ` AND im.type = $${paramIdx}`;
      params.push(type);
      paramIdx++;
    }

    query += ` ORDER BY im.created_at DESC LIMIT $${paramIdx}`;
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  }

  async create(movement: {
    productId: string;
    type: string;
    quantity: number;
    userId: string;
    reason?: string;
  }) {
    const query = `
      INSERT INTO inventory_movements (id, product_id, type, quantity, user_id, reason)
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      movement.productId,
      movement.type,
      movement.quantity,
      movement.userId,
      movement.reason || null,
    ]);

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar movimentação');
    }

    return result.rows[0];
  }
}
