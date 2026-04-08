import { db } from '../config/database';
import type { CustomerType, CreateCustomerDTO, UpdateCustomerDTO } from '@ejr/shared-types';

interface FindManyParams {
  page: number;
  limit: number;
  search?: string;
  type?: CustomerType;
  createdBy?: string;
  responsibleUserId?: string;
  approvalStatus?: string;
  includeDeleted?: boolean;
}

interface CountParams {
  search?: string;
  type?: CustomerType;
  createdBy?: string;
  responsibleUserId?: string;
  approvalStatus?: string;
  includeDeleted?: boolean;
}

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    document: row.document,
    ci: row.ci,
    ruc: row.ruc,
    rg: row.rg ?? null,
    birthDate: row.birth_date ?? null,
    gender: row.gender ?? null,
    maritalStatus: row.marital_status ?? null,
    profession: row.profession ?? null,
    whatsapp: row.whatsapp ?? null,
    phoneAlt: row.phone_alt ?? null,
    emailAlt: row.email_alt ?? null,
    notes: row.notes ?? null,
    type: row.type,
    address: row.address,
    allowedPaymentMethods: row.allowed_payment_methods,
    creditMaxDays: row.credit_max_days,
    createdBy: row.created_by,
    responsibleUserId: row.responsible_user_id,
    responsibleUserName: row.responsible_user_name ?? null,
    approvalStatus: row.approval_status,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectionReason: row.rejection_reason,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildWhere(params: CountParams): { whereClause: string; queryParams: any[]; nextIndex: number } {
  const whereClauses: string[] = [];
  const queryParams: any[] = [];
  let i = 1;

  if (!params.includeDeleted) {
    whereClauses.push('c.deleted_at IS NULL');
  }

  if (params.search) {
    whereClauses.push(
      `(c.name ILIKE $${i} OR c.email ILIKE $${i} OR c.document ILIKE $${i} OR c.ci ILIKE $${i} OR c.ruc ILIKE $${i})`
    );
    queryParams.push(`%${params.search}%`);
    i++;
  }

  if (params.type) {
    whereClauses.push(`c.type = $${i}`);
    queryParams.push(params.type);
    i++;
  }

  if (params.createdBy) {
    whereClauses.push(`c.created_by = $${i}`);
    queryParams.push(params.createdBy);
    i++;
  }

  if (params.responsibleUserId) {
    whereClauses.push(`c.responsible_user_id = $${i}`);
    queryParams.push(params.responsibleUserId);
    i++;
  }

  if (params.approvalStatus) {
    whereClauses.push(`c.approval_status = $${i}`);
    queryParams.push(params.approvalStatus);
    i++;
  }

  return {
    whereClause: whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '',
    queryParams,
    nextIndex: i,
  };
}

export class CustomersRepository {
  async findMany(params: FindManyParams) {
    const { page, limit } = params;
    const { whereClause, queryParams, nextIndex } = buildWhere(params);

    queryParams.push(limit);
    queryParams.push((page - 1) * limit);

    const sql = `
      SELECT c.*, u.name AS responsible_user_name
      FROM customers c
      LEFT JOIN users u ON u.id = c.responsible_user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
    `;

    const result = await db.query(sql, queryParams);
    return result.rows.map(mapRow);
  }

  async count(params: CountParams) {
    const { whereClause, queryParams } = buildWhere(params);
    const sql = `SELECT COUNT(*) AS count FROM customers c ${whereClause}`;
    const result = await db.query(sql, queryParams);
    return parseInt(result.rows[0].count, 10);
  }

  async findById(id: string, opts: { includeDeleted?: boolean } = {}) {
    const sql = opts.includeDeleted
      ? `SELECT c.*, u.name AS responsible_user_name FROM customers c LEFT JOIN users u ON u.id = c.responsible_user_id WHERE c.id = $1`
      : `SELECT c.*, u.name AS responsible_user_name FROM customers c LEFT JOIN users u ON u.id = c.responsible_user_id WHERE c.id = $1 AND c.deleted_at IS NULL`;
    const result = await db.query(sql, [id]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async findByDocument(document: string) {
    const sql = `SELECT c.*, u.name AS responsible_user_name FROM customers c LEFT JOIN users u ON u.id = c.responsible_user_id WHERE c.document = $1 AND c.deleted_at IS NULL`;
    const result = await db.query(sql, [document]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async create(
    customerData: CreateCustomerDTO,
    userId?: string,
    opts: { approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'; responsibleUserId?: string | null } = {}
  ) {
    const id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const approvalStatus = opts.approvalStatus ?? 'APPROVED';
    const approvedAt = approvalStatus === 'APPROVED' ? new Date() : null;
    const approvedBy = approvalStatus === 'APPROVED' ? userId ?? null : null;
    const responsibleUserId =
      opts.responsibleUserId !== undefined ? opts.responsibleUserId : (customerData as any).responsibleUserId ?? null;

    const sql = `
      INSERT INTO customers (
        id, name, email, phone, document, ci, ruc, type, address,
        allowed_payment_methods, credit_max_days, created_by,
        responsible_user_id, approval_status, approved_at, approved_by,
        rg, birth_date, gender, marital_status, profession,
        whatsapp, phone_alt, email_alt, notes
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      RETURNING *
    `;

    const data: any = customerData;

    const result = await db.query(sql, [
      id,
      customerData.name,
      customerData.email,
      customerData.phone,
      customerData.document || null,
      customerData.ci || null,
      customerData.ruc || null,
      customerData.type,
      customerData.address,
      customerData.allowedPaymentMethods || null,
      customerData.creditMaxDays || null,
      userId || null,
      responsibleUserId,
      approvalStatus,
      approvedAt,
      approvedBy,
      data.rg ?? null,
      data.birthDate ?? null,
      data.gender ?? null,
      data.maritalStatus ?? null,
      data.profession ?? null,
      data.whatsapp ?? null,
      data.phoneAlt ?? null,
      data.emailAlt ?? null,
      data.notes ?? null,
    ]);

    return mapRow(result.rows[0]);
  }

  async update(id: string, customerData: UpdateCustomerDTO & { responsibleUserId?: string | null }) {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let i = 1;

    const setField = (column: string, value: any) => {
      updateFields.push(`${column} = $${i}`);
      queryParams.push(value);
      i++;
    };

    const data: any = customerData;

    if (customerData.name !== undefined) setField('name', customerData.name);
    if (customerData.email !== undefined) setField('email', customerData.email);
    if (customerData.phone !== undefined) setField('phone', customerData.phone);
    if (customerData.document !== undefined) setField('document', customerData.document || null);
    if (customerData.ci !== undefined) setField('ci', customerData.ci || null);
    if (customerData.ruc !== undefined) setField('ruc', customerData.ruc || null);
    if (customerData.type !== undefined) setField('type', customerData.type);
    if (customerData.address !== undefined) setField('address', customerData.address);
    if (customerData.allowedPaymentMethods !== undefined)
      setField('allowed_payment_methods', customerData.allowedPaymentMethods);
    if (customerData.creditMaxDays !== undefined) setField('credit_max_days', customerData.creditMaxDays);
    if (customerData.responsibleUserId !== undefined)
      setField('responsible_user_id', customerData.responsibleUserId);

    if (data.rg !== undefined) setField('rg', data.rg || null);
    if (data.birthDate !== undefined) setField('birth_date', data.birthDate || null);
    if (data.gender !== undefined) setField('gender', data.gender || null);
    if (data.maritalStatus !== undefined) setField('marital_status', data.maritalStatus || null);
    if (data.profession !== undefined) setField('profession', data.profession || null);
    if (data.whatsapp !== undefined) setField('whatsapp', data.whatsapp || null);
    if (data.phoneAlt !== undefined) setField('phone_alt', data.phoneAlt || null);
    if (data.emailAlt !== undefined) setField('email_alt', data.emailAlt || null);
    if (data.notes !== undefined) setField('notes', data.notes ?? null);

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    updateFields.push('updated_at = NOW()');
    queryParams.push(id);

    const sql = `UPDATE customers SET ${updateFields.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await db.query(sql, queryParams);
    if (result.rows.length === 0) throw new Error('Cliente não encontrado');
    return mapRow(result.rows[0]);
  }

  async approve(id: string, approvedBy: string, responsibleUserId: string | null) {
    const sql = `
      UPDATE customers
      SET approval_status = 'APPROVED',
          approved_at = NOW(),
          approved_by = $1,
          responsible_user_id = COALESCE($2, responsible_user_id),
          rejection_reason = NULL,
          updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(sql, [approvedBy, responsibleUserId, id]);
    if (result.rows.length === 0) throw new Error('Cliente não encontrado');
    return mapRow(result.rows[0]);
  }

  async reject(id: string, rejectedBy: string, reason: string) {
    const sql = `
      UPDATE customers
      SET approval_status = 'REJECTED',
          rejection_reason = $1,
          approved_by = $2,
          updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(sql, [reason, rejectedBy, id]);
    if (result.rows.length === 0) throw new Error('Cliente não encontrado');
    return mapRow(result.rows[0]);
  }

  /** Soft delete — sets deleted_at so mobile sync can detect removal. */
  async softDelete(id: string) {
    const result = await db.query(
      `UPDATE customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      throw new Error('Cliente não encontrado');
    }
    return { success: true };
  }

  async delete(id: string) {
    return this.softDelete(id);
  }
}
