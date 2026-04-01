import { db } from '../config/database';
import type { ProductSupplier, CreateProductSupplierDTO, UpdateProductSupplierDTO } from '@ejr/shared-types';

export class ProductSuppliersRepository {
  async findByProductId(productId: string) {
    // Buscar os relacionamentos produto-fornecedor
    const query = `
      SELECT
        ps.*,
        s.id as supplier_id,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone
      FROM product_suppliers ps
      LEFT JOIN suppliers s ON ps.supplier_id = s.id
      WHERE ps.product_id = $1
      ORDER BY ps.is_preferred DESC, ps.created_at ASC
    `;

    const result = await db.query(query, [productId]);

    console.log('🔍 findByProductId - productId:', productId);
    console.log('📦 findByProductId - results:', result.rows.length);

    return result.rows.map(item => ({
      id: item.id,
      productId: item.product_id,
      supplierId: item.supplier_id,
      supplierSku: item.supplier_sku,
      unitPrice: item.unit_price,
      minimumQuantity: item.minimum_quantity,
      leadTimeDays: item.lead_time_days,
      isPreferred: item.is_preferred,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      supplier: item.supplier_id ? {
        id: item.supplier_id,
        name: item.supplier_name,
        email: item.supplier_email,
        phone: item.supplier_phone,
      } : null,
    }));
  }

  async findBySupplierId(supplierId: string) {
    const query = `
      SELECT
        ps.*,
        p.id as product_id,
        p.code as product_code,
        p.name as product_name,
        p.current_stock as product_current_stock
      FROM product_suppliers ps
      INNER JOIN products p ON ps.product_id = p.id
      WHERE ps.supplier_id = $1
      ORDER BY ps.created_at ASC
    `;

    const result = await db.query(query, [supplierId]);

    return result.rows.map(item => ({
      id: item.id,
      productId: item.product_id,
      supplierId: item.supplier_id,
      supplierSku: item.supplier_sku,
      unitPrice: item.unit_price,
      minimumQuantity: item.minimum_quantity,
      leadTimeDays: item.lead_time_days,
      isPreferred: item.is_preferred,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      product: {
        id: item.product_id,
        code: item.product_code,
        name: item.product_name,
        sku: item.product_sku,
        currentStock: item.product_current_stock,
      },
    }));
  }

  async findById(id: string) {
    const query = 'SELECT * FROM product_suppliers WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      supplierSku: data.supplier_sku,
      unitPrice: data.unit_price,
      minimumQuantity: data.minimum_quantity,
      leadTimeDays: data.lead_time_days,
      isPreferred: data.is_preferred,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductSupplier;
  }

  async findByProductAndSupplier(productId: string, supplierId: string) {
    const query = 'SELECT * FROM product_suppliers WHERE product_id = $1 AND supplier_id = $2';
    const result = await db.query(query, [productId, supplierId]);

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      supplierSku: data.supplier_sku,
      unitPrice: data.unit_price,
      minimumQuantity: data.minimum_quantity,
      leadTimeDays: data.lead_time_days,
      isPreferred: data.is_preferred,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ProductSupplier;
  }

  async create(productId: string, data: CreateProductSupplierDTO) {
    console.log('➕ create - productId:', productId);
    console.log('➕ create - data:', JSON.stringify(data, null, 2));

    // Se estiver marcando como preferencial, remover preferência de outros
    if (data.isPreferred) {
      await this.removePreferredFlag(productId);
    }

    const query = `
      INSERT INTO product_suppliers (
        product_id, supplier_id, supplier_sku, unit_price,
        minimum_quantity, lead_time_days, is_preferred, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      productId,
      data.supplierId,
      data.supplierSku,
      data.unitPrice,
      data.minimumQuantity ?? 1,
      data.leadTimeDays ?? 0,
      data.isPreferred ?? false,
      data.notes,
    ];

    const result = await db.query(query, values);
    const resultData = result.rows[0];

    console.log('✅ create - result:', JSON.stringify(resultData, null, 2));

    return {
      id: resultData.id,
      productId: resultData.product_id,
      supplierId: resultData.supplier_id,
      supplierSku: resultData.supplier_sku,
      unitPrice: resultData.unit_price,
      minimumQuantity: resultData.minimum_quantity,
      leadTimeDays: resultData.lead_time_days,
      isPreferred: resultData.is_preferred,
      notes: resultData.notes,
      createdAt: resultData.created_at,
      updatedAt: resultData.updated_at,
    } as ProductSupplier;
  }

  async update(id: string, data: UpdateProductSupplierDTO) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.supplierSku !== undefined) {
      setClauses.push(`supplier_sku = $${paramIndex++}`);
      values.push(data.supplierSku);
    }
    if (data.unitPrice !== undefined) {
      setClauses.push(`unit_price = $${paramIndex++}`);
      values.push(data.unitPrice);
    }
    if (data.minimumQuantity !== undefined) {
      setClauses.push(`minimum_quantity = $${paramIndex++}`);
      values.push(data.minimumQuantity);
    }
    if (data.leadTimeDays !== undefined) {
      setClauses.push(`lead_time_days = $${paramIndex++}`);
      values.push(data.leadTimeDays);
    }
    if (data.isPreferred !== undefined) {
      setClauses.push(`is_preferred = $${paramIndex++}`);
      values.push(data.isPreferred);
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    // Se estiver marcando como preferencial, remover preferência de outros
    if (data.isPreferred) {
      const current = await this.findById(id);
      if (current) {
        await this.removePreferredFlag(current.productId, id);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE product_suppliers
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Relacionamento produto-fornecedor não encontrado');
    }

    const resultData = result.rows[0];

    return {
      id: resultData.id,
      productId: resultData.product_id,
      supplierId: resultData.supplier_id,
      supplierSku: resultData.supplier_sku,
      unitPrice: resultData.unit_price,
      minimumQuantity: resultData.minimum_quantity,
      leadTimeDays: resultData.lead_time_days,
      isPreferred: resultData.is_preferred,
      notes: resultData.notes,
      createdAt: resultData.created_at,
      updatedAt: resultData.updated_at,
    } as ProductSupplier;
  }

  async delete(id: string) {
    const query = 'DELETE FROM product_suppliers WHERE id = $1';
    await db.query(query, [id]);
    return { success: true };
  }

  private async removePreferredFlag(productId: string, exceptId?: string) {
    let query = `
      UPDATE product_suppliers
      SET is_preferred = false
      WHERE product_id = $1 AND is_preferred = true
    `;
    const values: any[] = [productId];

    if (exceptId) {
      query += ' AND id != $2';
      values.push(exceptId);
    }

    await db.query(query, values);
  }
}
