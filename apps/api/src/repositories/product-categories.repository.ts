import { db } from '../config/database';
import type { ProductCategory, CreateProductCategoryDTO, UpdateProductCategoryDTO } from '@ejr/shared-types';

export class ProductCategoriesRepository {
  async findAll(): Promise<ProductCategory[]> {
    const query = `
      SELECT * FROM product_categories
      ORDER BY name ASC
    `;

    const result = await db.query(query);
    return result.rows.map(this.mapToCategory);
  }

  async findActive(): Promise<ProductCategory[]> {
    const query = `
      SELECT * FROM product_categories
      WHERE is_active = true
      ORDER BY name ASC
    `;

    const result = await db.query(query);
    return result.rows.map(this.mapToCategory);
  }

  async findById(id: string): Promise<ProductCategory | null> {
    const query = 'SELECT * FROM product_categories WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToCategory(result.rows[0]);
  }

  async findByName(name: string): Promise<ProductCategory | null> {
    const query = 'SELECT * FROM product_categories WHERE LOWER(name) = LOWER($1)';
    const result = await db.query(query, [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToCategory(result.rows[0]);
  }

  async create(categoryData: CreateProductCategoryDTO): Promise<ProductCategory> {
    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO product_categories (id, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      id,
      categoryData.name.trim(),
      categoryData.description || null,
      categoryData.isActive ?? true,
    ];

    try {
      const result = await db.query(query, values);
      return this.mapToCategory(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Já existe uma categoria com este nome');
      }
      throw new Error(`Erro ao criar categoria: ${error.message}`);
    }
  }

  async update(id: string, categoryData: UpdateProductCategoryDTO): Promise<ProductCategory> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (categoryData.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(categoryData.name.trim());
    }
    if (categoryData.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(categoryData.description);
    }
    if (categoryData.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(categoryData.isActive);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE product_categories
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Categoria não encontrada');
      }

      return this.mapToCategory(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Já existe uma categoria com este nome');
      }
      throw new Error(`Erro ao atualizar categoria: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    // Check if there are products using this category
    const category = await this.findById(id);
    if (category) {
      const countQuery = `
        SELECT COUNT(*) as count
        FROM products
        WHERE category = $1
      `;
      const countResult = await db.query(countQuery, [category.name]);
      const productCount = parseInt(countResult.rows[0].count, 10);

      if (productCount > 0) {
        throw new Error(`Não é possível excluir esta categoria pois existem ${productCount} produto(s) usando-a`);
      }
    }

    const query = 'DELETE FROM product_categories WHERE id = $1';
    await db.query(query, [id]);
  }

  private mapToCategory(data: any): ProductCategory {
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
