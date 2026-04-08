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

// Lista compartilhada de colunas estendidas para SELECT/RETURNING
const USER_COLUMNS = `
  id, email, name, role, is_active, allowed_hours,
  document, birth_date, phone, whatsapp, email_alt, address, photo_url,
  commission_rate, monthly_target, region,
  hire_date, contract_type, notes,
  created_at, updated_at
`;

// Mapeia uma row crua (snake_case) para o formato camelCase usado pelo frontend
function mapUserRow(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.is_active,
    allowedHours: user.allowed_hours,
    // Personal data
    document: user.document ?? null,
    birthDate: user.birth_date ?? null,
    phone: user.phone ?? null,
    whatsapp: user.whatsapp ?? null,
    emailAlt: user.email_alt ?? null,
    address: user.address ?? null,
    photoUrl: user.photo_url ?? null,
    // Commercial data
    commissionRate:
      user.commission_rate !== null && user.commission_rate !== undefined
        ? Number(user.commission_rate)
        : null,
    monthlyTarget: user.monthly_target ?? null,
    region: user.region ?? null,
    // Contractual data
    hireDate: user.hire_date ?? null,
    contractType: user.contract_type ?? null,
    notes: user.notes ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
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

    if (page < 1 || limit < 1 || limit > 1000) {
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
      SELECT ${USER_COLUMNS}
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await db.query(dataQuery, [...queryParams, limit, offset]);

    // Converter snake_case para camelCase
    const usersFormatted = dataResult.rows.map(mapUserRow);

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
      SELECT ${USER_COLUMNS}
      FROM users
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    return mapUserRow(result.rows[0]);
  }

  async update(id: string, data: UpdateUserDTO) {
    // Verificar se usuário existe
    await this.findById(id);

    // Preparar dados para update (converter camelCase para snake_case)
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    const pushField = (column: string, value: any) => {
      updateFields.push(`${column} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    };

    if (data.name !== undefined) pushField('name', data.name);
    if (data.email !== undefined) pushField('email', data.email);
    if (data.role !== undefined) pushField('role', data.role);
    if (data.isActive !== undefined) pushField('is_active', data.isActive);
    if (data.allowedHours !== undefined) pushField('allowed_hours', data.allowedHours);

    // Personal data
    if (data.document !== undefined) pushField('document', data.document);
    if (data.birthDate !== undefined) pushField('birth_date', data.birthDate);
    if (data.phone !== undefined) pushField('phone', data.phone);
    if (data.whatsapp !== undefined) pushField('whatsapp', data.whatsapp);
    if (data.emailAlt !== undefined) pushField('email_alt', data.emailAlt);
    if (data.address !== undefined) pushField('address', data.address);
    if (data.photoUrl !== undefined) pushField('photo_url', data.photoUrl);

    // Commercial data
    if (data.commissionRate !== undefined) pushField('commission_rate', data.commissionRate);
    if (data.monthlyTarget !== undefined) pushField('monthly_target', data.monthlyTarget);
    if (data.region !== undefined) pushField('region', data.region);

    // Contractual data
    if (data.hireDate !== undefined) pushField('hire_date', data.hireDate);
    if (data.contractType !== undefined) pushField('contract_type', data.contractType);
    if (data.notes !== undefined) pushField('notes', data.notes);

    // Se uma senha foi fornecida, fazer o hash antes de salvar
    if (data.password && data.password.trim() !== '') {
      console.log('🔐 Nova senha fornecida, gerando hash...');
      const passwordHash = await hashPassword(data.password);
      console.log('✅ Hash de senha gerado com sucesso');

      pushField('password_hash', passwordHash);

      // Buscar password_version atual
      const versionQuery = `SELECT password_version FROM users WHERE id = $1`;
      const versionResult = await db.query(versionQuery, [id]);

      // Incrementar password_version para invalidar tokens antigos
      const currentVersion = versionResult.rows[0]?.password_version || 1;
      pushField('password_version', currentVersion + 1);
      console.log(`🔄 Incrementando password_version de ${currentVersion} para ${currentVersion + 1}`);
    }

    pushField('updated_at', new Date().toISOString());

    console.log('📝 Atualizando usuário:', { id, updateFields });

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING ${USER_COLUMNS}
    `;
    updateValues.push(id);

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      console.error('❌ Nenhum usuário retornado após update');
      throw new AppError('Erro ao atualizar usuário: nenhum registro retornado', 500, 'UPDATE_ERROR');
    }

    console.log('✅ Usuário atualizado com sucesso:', result.rows[0].id);
    return mapUserRow(result.rows[0]);
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
      RETURNING ${USER_COLUMNS}
    `;
    const result = await db.query(query, [newStatus, new Date().toISOString(), id]);

    if (result.rows.length === 0) {
      throw new AppError('Erro ao alterar status do usuário', 500, 'UPDATE_ERROR');
    }

    return mapUserRow(result.rows[0]);
  }

  async delete(id: string) {
    // Verificar se usuário existe
    await this.findById(id);

    const query = `DELETE FROM users WHERE id = $1`;
    await db.query(query, [id]);

    return { success: true };
  }
}
