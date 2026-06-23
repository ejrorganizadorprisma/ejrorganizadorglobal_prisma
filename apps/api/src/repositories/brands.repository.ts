import { db } from '../config/database';
import { randomUUID } from 'node:crypto';

// Marca — atributo do produto, opcionalmente ligada a uma Indústria (manufacturers).
export interface Brand {
  id: string;
  code?: string;
  name: string;
  manufacturerId?: string;
  manufacturerName?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDTO {
  name: string;
  manufacturerId?: string | null;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBrandDTO {
  name?: string;
  manufacturerId?: string | null;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export class BrandsRepository {
  private map(data: any): Brand {
    return {
      id: data.id,
      code: data.code || undefined,
      name: data.name,
      manufacturerId: data.manufacturer_id || undefined,
      manufacturerName: data.manufacturer_name || undefined,
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
      whereClauses.push(`(b.name ILIKE $${paramIndex} OR b.code ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`b.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM brands b ${whereClause}`;
    const countResult = await db.query(countSql, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count, 10);

    queryParams.push(limit);
    queryParams.push((page - 1) * limit);

    const dataSql = `
      SELECT b.*, m.name AS manufacturer_name
      FROM brands b
      LEFT JOIN manufacturers m ON m.id = b.manufacturer_id
      ${whereClause}
      ORDER BY b.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await db.query(dataSql, queryParams);

    return {
      data: dataResult.rows.map((r) => this.map(r)),
      total,
    };
  }

  async findById(id: string): Promise<Brand | null> {
    const result = await db.query(
      `SELECT b.*, m.name AS manufacturer_name
       FROM brands b LEFT JOIN manufacturers m ON m.id = b.manufacturer_id
       WHERE b.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.map(result.rows[0]);
  }

  async findByName(name: string): Promise<Brand | null> {
    const result = await db.query('SELECT * FROM brands WHERE lower(name) = lower($1) LIMIT 1', [name.trim()]);
    if (result.rows.length === 0) return null;
    return this.map(result.rows[0]);
  }

  private async generateCode(client?: any): Promise<string> {
    const exec = client || db;
    const result = await exec.query(
      `SELECT code FROM brands WHERE code ~ '^BRC-[0-9]+$' ORDER BY code DESC LIMIT 1`
    );
    if (result.rows.length === 0) return 'BRC-0001';
    const match = result.rows[0].code.match(/BRC-(\d+)/);
    const next = match ? parseInt(match[1], 10) + 1 : 1;
    return `BRC-${String(next).padStart(4, '0')}`;
  }

  async create(data: CreateBrandDTO): Promise<Brand> {
    const id = randomUUID();
    const code = await this.generateCode();

    const result = await db.query(
      `INSERT INTO brands (id, code, name, manufacturer_id, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, code, data.name.trim(), data.manufacturerId || null, data.notes, data.status || 'ACTIVE']
    );

    return (await this.findById(result.rows[0].id))!;
  }

  // Resolve marca pelo nome, criando se não existir (sem indústria). Retorna o id.
  async findOrCreateByName(name: string, client?: any): Promise<string | null> {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;

    const exec = client || db;

    const existing = await exec.query('SELECT id FROM brands WHERE lower(name) = lower($1) LIMIT 1', [trimmed]);
    if (existing.rows.length > 0) return existing.rows[0].id;

    // Insere com retry: ON CONFLICT cobre colisão de NOME; colisão de CODE
    // (concorrência gerando o mesmo BRC-XXXX) estoura 23505 → novo código e retry.
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = randomUUID();
      const code = await this.generateCode(client);
      try {
        const inserted = await exec.query(
          `INSERT INTO brands (id, code, name, status)
           VALUES ($1, $2, $3, 'ACTIVE')
           ON CONFLICT (lower(name)) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [id, code, trimmed]
        );
        return inserted.rows[0].id;
      } catch (e: any) {
        if (e?.code === '23505') continue;
        throw e;
      }
    }
    const fallback = await exec.query('SELECT id FROM brands WHERE lower(name) = lower($1) LIMIT 1', [trimmed]);
    return fallback.rows[0]?.id ?? null;
  }

  async update(id: string, data: UpdateBrandDTO): Promise<Brand> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(data.name.trim());
    }
    if (data.manufacturerId !== undefined) {
      updateFields.push(`manufacturer_id = $${paramIndex++}`);
      queryParams.push(data.manufacturerId || null);
    }
    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      queryParams.push(data.notes);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(data.status);
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(id);

    const result = await db.query(
      `UPDATE brands SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      queryParams
    );

    if (result.rows.length === 0) {
      throw new Error('Marca não encontrada');
    }

    const updated = (await this.findById(id))!;

    // Mantém o texto denormalizado em products sincronizado com o nome
    if (data.name !== undefined) {
      await db.query('UPDATE products SET brand = $1 WHERE brand_id = $2', [updated.name, id]);
    }

    return updated;
  }

  async delete(id: string) {
    await db.query('UPDATE products SET brand = NULL WHERE brand_id = $1', [id]);
    const result = await db.query('DELETE FROM brands WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new Error('Marca não encontrada');
    }
    return { success: true };
  }

  async listNames(search?: string): Promise<string[]> {
    let sql = `SELECT name FROM brands WHERE status = 'ACTIVE'`;
    const params: any[] = [];
    if (search && search.trim() !== '') {
      sql += ` AND name ILIKE $1`;
      params.push(`%${search.trim()}%`);
    }
    sql += ` ORDER BY name ASC`;
    const result = await db.query(sql, params);
    return result.rows.map((r) => r.name);
  }
}
