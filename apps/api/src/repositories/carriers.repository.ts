import { db } from '../config/database';
import { randomUUID } from 'node:crypto';
import type { Carrier, CreateCarrierDTO, UpdateCarrierDTO } from '@ejr/shared-types';

export class CarriersRepository {
  private map(data: any): Carrier {
    return {
      id: data.id,
      code: data.code || undefined,
      name: data.name,
      document: data.document || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      contactName: data.contact_name || undefined,
      city: data.city || undefined,
      notes: data.notes || undefined,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async findMany(params: { page: number; limit: number; search?: string; status?: string }) {
    const { page, limit, search, status } = params;
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.document ILIKE $${paramIndex} OR c.city ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      whereClauses.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) as count FROM carriers c ${whereClause}`, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count, 10);

    queryParams.push(limit);
    queryParams.push((page - 1) * limit);

    const dataResult = await db.query(
      `SELECT c.* FROM carriers c ${whereClause} ORDER BY c.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return { data: dataResult.rows.map((r) => this.map(r)), total };
  }

  async findById(id: string): Promise<Carrier | null> {
    const result = await db.query('SELECT * FROM carriers WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.map(result.rows[0]);
  }

  async findByName(name: string): Promise<Carrier | null> {
    const result = await db.query('SELECT * FROM carriers WHERE lower(name) = lower($1) LIMIT 1', [name.trim()]);
    if (result.rows.length === 0) return null;
    return this.map(result.rows[0]);
  }

  private async generateCode(): Promise<string> {
    const result = await db.query(`SELECT code FROM carriers WHERE code ~ '^TRP-[0-9]+$' ORDER BY code DESC LIMIT 1`);
    if (result.rows.length === 0) return 'TRP-0001';
    const match = result.rows[0].code.match(/TRP-(\d+)/);
    const next = match ? parseInt(match[1], 10) + 1 : 1;
    return `TRP-${String(next).padStart(4, '0')}`;
  }

  async create(data: CreateCarrierDTO): Promise<Carrier> {
    const id = randomUUID();
    const code = await this.generateCode();
    const result = await db.query(
      `INSERT INTO carriers (id, code, name, document, phone, email, contact_name, city, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id, code, data.name.trim(), data.document || null, data.phone || null, data.email || null,
        data.contactName || null, data.city || null, data.notes || null, data.status || 'ACTIVE',
      ]
    );
    return this.map(result.rows[0]);
  }

  async update(id: string, data: UpdateCarrierDTO): Promise<Carrier> {
    const fields: string[] = [];
    const params: any[] = [];
    let i = 1;
    const set = (col: string, val: any) => { fields.push(`${col} = $${i++}`); params.push(val); };

    if (data.name !== undefined) set('name', data.name.trim());
    if (data.document !== undefined) set('document', data.document || null);
    if (data.phone !== undefined) set('phone', data.phone || null);
    if (data.email !== undefined) set('email', data.email || null);
    if (data.contactName !== undefined) set('contact_name', data.contactName || null);
    if (data.city !== undefined) set('city', data.city || null);
    if (data.notes !== undefined) set('notes', data.notes || null);
    if (data.status !== undefined) set('status', data.status);

    if (fields.length === 0) throw new Error('Nenhum campo para atualizar');
    params.push(id);

    const result = await db.query(`UPDATE carriers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, params);
    if (result.rows.length === 0) throw new Error('Transportadora não encontrada');
    return this.map(result.rows[0]);
  }

  async delete(id: string) {
    const result = await db.query('DELETE FROM carriers WHERE id = $1', [id]);
    if (result.rowCount === 0) throw new Error('Transportadora não encontrada');
    return { success: true };
  }
}
