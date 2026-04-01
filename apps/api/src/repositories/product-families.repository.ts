import { db } from '../config/database';
import type { ProductFamily, CreateProductFamilyDTO, UpdateProductFamilyDTO } from '@ejr/shared-types';

export class ProductFamiliesRepository {
  async findAll(): Promise<ProductFamily[]> {
    const query = `
      SELECT * FROM product_families
      ORDER BY name ASC
    `;

    const result = await db.query(query);
    return result.rows.map(this.mapToFamily);
  }

  async findActive(): Promise<ProductFamily[]> {
    const query = `
      SELECT * FROM product_families
      WHERE is_active = true
      ORDER BY name ASC
    `;

    const result = await db.query(query);
    return result.rows.map(this.mapToFamily);
  }

  async findById(id: string): Promise<ProductFamily | null> {
    const query = 'SELECT * FROM product_families WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToFamily(result.rows[0]);
  }

  async findByName(name: string): Promise<ProductFamily | null> {
    const query = 'SELECT * FROM product_families WHERE LOWER(name) = LOWER($1)';
    const result = await db.query(query, [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToFamily(result.rows[0]);
  }

  async create(familyData: CreateProductFamilyDTO): Promise<ProductFamily> {
    const id = `fam-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO product_families (id, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      id,
      familyData.name.trim(),
      familyData.description || null,
      familyData.isActive ?? true,
    ];

    try {
      const result = await db.query(query, values);
      return this.mapToFamily(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Já existe uma família com este nome');
      }
      throw new Error(`Erro ao criar família: ${error.message}`);
    }
  }

  async update(id: string, familyData: UpdateProductFamilyDTO): Promise<ProductFamily> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (familyData.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(familyData.name.trim());
    }
    if (familyData.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(familyData.description);
    }
    if (familyData.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(familyData.isActive);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE product_families
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Família não encontrada');
      }

      return this.mapToFamily(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Já existe uma família com este nome');
      }
      throw new Error(`Erro ao atualizar família: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    // Check if there are products using this family
    const family = await this.findById(id);
    if (family) {
      const countQuery = `
        SELECT COUNT(*) as count
        FROM products
        WHERE family = $1
      `;
      const countResult = await db.query(countQuery, [family.name]);
      const productCount = parseInt(countResult.rows[0].count, 10);

      if (productCount > 0) {
        throw new Error(`Não é possível excluir esta família pois existem ${productCount} produto(s) usando-a`);
      }
    }

    const query = 'DELETE FROM product_families WHERE id = $1';
    await db.query(query, [id]);
  }

  private mapToFamily(data: any): ProductFamily {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
