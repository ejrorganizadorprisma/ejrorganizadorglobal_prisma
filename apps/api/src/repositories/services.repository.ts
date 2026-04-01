import { db } from '../config/database';
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '@ejr/shared-types';

export class ServicesRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const { page, limit, search, category, isActive } = params;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get count
    const countQuery = `SELECT COUNT(*) as count FROM services ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get data
    const dataQuery = `
      SELECT * FROM services
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    const dataResult = await db.query(dataQuery, values);

    return {
      data: (dataResult.rows || []).map(this.mapToService),
      total,
    };
  }

  async findById(id: string) {
    const result = await db.query('SELECT * FROM services WHERE id = $1', [id]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return this.mapToService(result.rows[0]);
  }

  async findByCode(code: string) {
    const result = await db.query('SELECT * FROM services WHERE code = $1', [code]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return this.mapToService(result.rows[0]);
  }

  async create(serviceData: CreateServiceDTO) {
    const id = `serv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO services (id, code, name, description, category, default_price, unit, duration_minutes, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      id,
      serviceData.code,
      serviceData.name,
      serviceData.description,
      serviceData.category,
      serviceData.defaultPrice,
      serviceData.unit,
      serviceData.durationMinutes,
      serviceData.isActive ?? true,
    ];

    const result = await db.query(query, values);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Erro ao criar serviço');
    }

    return this.mapToService(result.rows[0]);
  }

  async update(id: string, serviceData: UpdateServiceDTO) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (serviceData.code !== undefined) {
      updateFields.push(`code = $${paramIndex}`);
      values.push(serviceData.code);
      paramIndex++;
    }
    if (serviceData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(serviceData.name);
      paramIndex++;
    }
    if (serviceData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(serviceData.description);
      paramIndex++;
    }
    if (serviceData.category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      values.push(serviceData.category);
      paramIndex++;
    }
    if (serviceData.defaultPrice !== undefined) {
      updateFields.push(`default_price = $${paramIndex}`);
      values.push(serviceData.defaultPrice);
      paramIndex++;
    }
    if (serviceData.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex}`);
      values.push(serviceData.unit);
      paramIndex++;
    }
    if (serviceData.durationMinutes !== undefined) {
      updateFields.push(`duration_minutes = $${paramIndex}`);
      values.push(serviceData.durationMinutes);
      paramIndex++;
    }
    if (serviceData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      values.push(serviceData.isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    values.push(id);
    const query = `
      UPDATE services
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Erro ao atualizar serviço');
    }

    return this.mapToService(result.rows[0]);
  }

  async delete(id: string) {
    const result = await db.query('DELETE FROM services WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error('Serviço não encontrado');
    }

    return { success: true };
  }

  private mapToService(data: any): Service {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      defaultPrice: data.default_price,
      unit: data.unit,
      durationMinutes: data.duration_minutes,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
