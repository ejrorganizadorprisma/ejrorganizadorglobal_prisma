import { db } from '../config/database';
import { randomUUID } from 'node:crypto';

// Indústria (UI) — tabela "manufacturers". Cadastro central referenciado por
// products.manufacturer_id e suppliers.manufacturer_id.
export interface Manufacturer {
  id: string;
  code?: string;
  name: string;
  legalName?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateManufacturerDTO {
  name: string;
  legalName?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateManufacturerDTO {
  name?: string;
  legalName?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export class ManufacturersRepository {
  private map(data: any): Manufacturer {
    return {
      id: data.id,
      code: data.code || undefined,
      name: data.name,
      legalName: data.legal_name || undefined,
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
      whereClauses.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR legal_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM manufacturers ${whereClause}`;
    const countResult = await db.query(countSql, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count, 10);

    queryParams.push(limit);
    queryParams.push((page - 1) * limit);

    const dataSql = `
      SELECT * FROM manufacturers
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await db.query(dataSql, queryParams);

    return {
      data: dataResult.rows.map((r) => this.map(r)),
      total,
    };
  }

  async findById(id: string): Promise<Manufacturer | null> {
    const result = await db.query('SELECT * FROM manufacturers WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.map(result.rows[0]);
  }

  async findByName(name: string, client?: any): Promise<Manufacturer | null> {
    const exec = client || db;
    const result = await exec.query('SELECT * FROM manufacturers WHERE lower(name) = lower($1) LIMIT 1', [name.trim()]);
    if (result.rows.length === 0) return null;
    return this.map(result.rows[0]);
  }

  // Gera próximo código IND-XXXX
  private async generateCode(client?: any): Promise<string> {
    const exec = client || db;
    const result = await exec.query(
      `SELECT code FROM manufacturers WHERE code ~ '^IND-[0-9]+$' ORDER BY code DESC LIMIT 1`
    );
    if (result.rows.length === 0) return 'IND-0001';
    const match = result.rows[0].code.match(/IND-(\d+)/);
    const next = match ? parseInt(match[1], 10) + 1 : 1;
    return `IND-${String(next).padStart(4, '0')}`;
  }

  async create(data: CreateManufacturerDTO): Promise<Manufacturer> {
    const id = randomUUID();
    const code = await this.generateCode();

    const result = await db.query(
      `INSERT INTO manufacturers (id, code, name, legal_name, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, code, data.name.trim(), data.legalName, data.notes, data.status || 'ACTIVE']
    );

    return this.map(result.rows[0]);
  }

  // Resolve uma indústria pelo nome, criando se não existir. Retorna o id.
  // Aceita client opcional (transação pgbouncer) — usa o mesmo client em toda a operação.
  async findOrCreateByName(name: string, client?: any): Promise<string | null> {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;

    const exec = client || db;

    const existing = await exec.query('SELECT id FROM manufacturers WHERE lower(name) = lower($1) LIMIT 1', [trimmed]);
    if (existing.rows.length > 0) return existing.rows[0].id;

    // Insere com retry: o ON CONFLICT cobre colisão de NOME; já a colisão de
    // CODE (dois nomes novos gerando o mesmo IND-XXXX sob concorrência) não é
    // coberta e estoura 23505 — nesse caso geramos novo código e tentamos de novo.
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = randomUUID();
      const code = await this.generateCode(client);
      try {
        const inserted = await exec.query(
          `INSERT INTO manufacturers (id, code, name, status)
           VALUES ($1, $2, $3, 'ACTIVE')
           ON CONFLICT (lower(name)) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [id, code, trimmed]
        );
        return inserted.rows[0].id;
      } catch (e: any) {
        if (e?.code === '23505') continue; // colisão de code → novo código e retry
        throw e;
      }
    }
    // Fallback: provavelmente outra requisição criou com o mesmo nome
    const fallback = await exec.query('SELECT id FROM manufacturers WHERE lower(name) = lower($1) LIMIT 1', [trimmed]);
    return fallback.rows[0]?.id ?? null;
  }

  async update(id: string, data: UpdateManufacturerDTO): Promise<Manufacturer> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(data.name.trim());
      paramIndex++;
    }
    if (data.legalName !== undefined) {
      updateFields.push(`legal_name = $${paramIndex}`);
      queryParams.push(data.legalName);
      paramIndex++;
    }
    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      queryParams.push(data.notes);
      paramIndex++;
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      queryParams.push(data.status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(id);

    const result = await db.query(
      `UPDATE manufacturers SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      queryParams
    );

    if (result.rows.length === 0) {
      throw new Error('Indústria não encontrada');
    }

    const updated = this.map(result.rows[0]);

    // Mantém o texto denormalizado em products/suppliers sincronizado com o nome
    if (data.name !== undefined) {
      await db.query('UPDATE products SET manufacturer = $1 WHERE manufacturer_id = $2', [updated.name, id]);
      await db.query('UPDATE suppliers SET manufacturer = $1 WHERE manufacturer_id = $2', [updated.name, id]);
    }

    return updated;
  }

  async delete(id: string) {
    // FK ON DELETE SET NULL zera manufacturer_id; limpamos também o texto denormalizado.
    await db.query('UPDATE products SET manufacturer = NULL WHERE manufacturer_id = $1', [id]);
    await db.query('UPDATE suppliers SET manufacturer = NULL WHERE manufacturer_id = $1', [id]);
    const result = await db.query('DELETE FROM manufacturers WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new Error('Indústria não encontrada');
    }
    return { success: true };
  }

  // Lista nomes (para autocomplete/compatibilidade com o endpoint distinct antigo)
  async listNames(search?: string): Promise<string[]> {
    let sql = `SELECT name FROM manufacturers WHERE status = 'ACTIVE'`;
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
