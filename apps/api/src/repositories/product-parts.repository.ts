import { db } from '../config/database';
import type { ProductPart, ProductPartWithProduct, BOMExplosion, BOMAvailability, AddProductPartDTO, UpdateProductPartDTO } from '@ejr/shared-types';

export class ProductPartsRepository {
  async findByProductId(productId: string) {
    const query = `
      SELECT
        pp.*,
        p.id as part_id,
        p.code as part_code,
        p.name as part_name,
        p.cost_price as part_cost_price,
        p.current_stock as part_current_stock,
        p.status as part_status
      FROM product_parts pp
      INNER JOIN products p ON pp.part_id = p.id
      WHERE pp.product_id = $1
      ORDER BY pp.created_at ASC
    `;

    const result = await db.query(query, [productId]);

    // Converte snake_case para camelCase
    return result.rows.map(item => ({
      id: item.id,
      productId: item.product_id,
      partId: item.part_id,
      quantity: item.quantity,
      isOptional: item.is_optional,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      part: {
        id: item.part_id,
        code: item.part_code,
        name: item.part_name,
        costPrice: item.part_cost_price,
        currentStock: item.part_current_stock,
        status: item.part_status,
      },
    })) as ProductPartWithProduct[];
  }

  async findById(id: string) {
    const query = 'SELECT * FROM product_parts WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async findByProductAndPart(productId: string, partId: string) {
    const query = 'SELECT * FROM product_parts WHERE product_id = $1 AND part_id = $2';
    const result = await db.query(query, [productId, partId]);

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async addPart(productId: string, partData: AddProductPartDTO) {
    const query = `
      INSERT INTO product_parts (product_id, part_id, quantity, is_optional)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      productId,
      partData.partId,
      partData.quantity,
      partData.isOptional ?? false,
    ];

    const result = await db.query(query, values);
    const data = result.rows[0];

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async updatePart(productPartId: string, partData: UpdateProductPartDTO) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (partData.quantity !== undefined) {
      setClauses.push(`quantity = $${paramIndex++}`);
      values.push(partData.quantity);
    }
    if (partData.isOptional !== undefined) {
      setClauses.push(`is_optional = $${paramIndex++}`);
      values.push(partData.isOptional);
    }

    if (setClauses.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(productPartId);

    const query = `
      UPDATE product_parts
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Peça do produto não encontrada');
    }

    const data = result.rows[0];

    return {
      id: data.id,
      productId: data.product_id,
      partId: data.part_id,
      quantity: data.quantity,
      isOptional: data.is_optional,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductPart;
  }

  async removePart(productPartId: string) {
    const query = 'DELETE FROM product_parts WHERE id = $1';
    await db.query(query, [productPartId]);
    return { success: true };
  }

  async getBOM(productId: string) {
    const query = 'SELECT get_product_bom($1) as result';
    const result = await db.query(query, [productId]);

    const items = result.rows[0]?.result || [];

    // Converte snake_case para camelCase
    return items.map((item: any) => ({
      partId: item.part_id,
      partCode: item.part_code,
      partName: item.part_name,
      quantity: item.quantity,
      isOptional: item.is_optional,
      isAssembly: item.is_assembly,
      unitCost: item.unit_cost,
      totalCost: item.total_cost,
      availableStock: item.available_stock,
    })) as BOMExplosion[];
  }

  async checkAvailability(productId: string, quantity: number = 1) {
    const query = 'SELECT check_assembly_availability($1, $2) as result';
    const result = await db.query(query, [productId, quantity]);

    const data = result.rows[0].result;

    // Converte snake_case para camelCase
    return {
      canAssemble: data.can_assemble,
      missingParts: (data.missing_parts || []).map((part: any) => ({
        partId: part.part_id,
        partName: part.part_name,
        required: part.required,
        available: part.available,
        missing: part.missing,
      })),
    } as BOMAvailability;
  }
}
