import { db } from '../config/database';
import { AppError } from '../utils/errors';
import { hashPassword } from '../utils/password';
import type { UpdateUserDTO, UserRole } from '@ejr/shared-types';

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export class UsersService {
  async findMany(params: FindManyParams = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
    } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const offset = (page - 1) * limit;

    // Construir query e parâmetros
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Aplicar filtros
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query para contar total
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Query para buscar usuários
    const dataQuery = `
      SELECT id, email, name, role, is_active, allowed_hours, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await db.query(dataQuery, [...queryParams, limit, offset]);

    // Converter snake_case para camelCase
    const usersFormatted = dataResult.rows.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      allowedHours: user.allowed_hours,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return {
      data: usersFormatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const query = `
      SELECT id, email, name, role, is_active, allowed_hours, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    const user = result.rows[0];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      allowedHours: user.allowed_hours,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async update(id: string, data: UpdateUserDTO) {
    // Verificar se usuário existe
    await this.findById(id);

    // Preparar dados para update (converter camelCase para snake_case)
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(data.name);
      paramIndex++;
    }

    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(data.email);
      paramIndex++;
    }

    if (data.role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push(data.role);
      paramIndex++;
    }

    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(data.isActive);
      paramIndex++;
    }

    if (data.allowedHours !== undefined) {
      updateFields.push(`allowed_hours = $${paramIndex}`);
      updateValues.push(data.allowedHours);
      paramIndex++;
    }

    // Se uma senha foi fornecida, fazer o hash antes de salvar
    if (data.password && data.password.trim() !== '') {
      console.log('🔐 Nova senha fornecida, gerando hash...');
      const passwordHash = await hashPassword(data.password);
      console.log('✅ Hash de senha gerado com sucesso');

      updateFields.push(`password_hash = $${paramIndex}`);
      updateValues.push(passwordHash);
      paramIndex++;

      // Buscar password_version atual
      const versionQuery = `SELECT password_version FROM users WHERE id = $1`;
      const versionResult = await db.query(versionQuery, [id]);

      // Incrementar password_version para invalidar tokens antigos
      const currentVersion = versionResult.rows[0]?.password_version || 1;
      updateFields.push(`password_version = $${paramIndex}`);
      updateValues.push(currentVersion + 1);
      paramIndex++;
      console.log(`🔄 Incrementando password_version de ${currentVersion} para ${currentVersion + 1}`);
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date().toISOString());
    paramIndex++;

    console.log('📝 Atualizando usuário:', { id, updateFields });

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, is_active, allowed_hours, created_at, updated_at
    `;
    updateValues.push(id);

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      console.error('❌ Nenhum usuário retornado após update');
      throw new AppError('Erro ao atualizar usuário: nenhum registro retornado', 500, 'UPDATE_ERROR');
    }

    const user = result.rows[0];
    console.log('✅ Usuário atualizado com sucesso:', user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      allowedHours: user.allowed_hours,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async toggleStatus(id: string) {
    // Buscar usuário atual
    const user = await this.findById(id);

    // Inverter o status
    const newStatus = !user.isActive;

    // Atualizar
    const query = `
      UPDATE users
      SET is_active = $1, updated_at = $2
      WHERE id = $3
      RETURNING id, email, name, role, is_active, allowed_hours, created_at, updated_at
    `;
    const result = await db.query(query, [newStatus, new Date().toISOString(), id]);

    if (result.rows.length === 0) {
      throw new AppError('Erro ao alterar status do usuário', 500, 'UPDATE_ERROR');
    }

    const updatedUser = result.rows[0];

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.is_active,
      allowedHours: updatedUser.allowed_hours,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    };
  }

  async delete(id: string) {
    // Verificar se usuário existe
    await this.findById(id);

    const query = `DELETE FROM users WHERE id = $1`;
    await db.query(query, [id]);

    return { success: true };
  }
}
