import { db } from '../config/database';

export type ExpenseCategory =
  | 'RENT' | 'PAYROLL' | 'TAX' | 'UTILITIES' | 'FREIGHT'
  | 'SERVICES' | 'MAINTENANCE' | 'MARKETING' | 'FEES' | 'OTHER';

export type ExpenseRecurrence = 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface ExpenseInstallmentDTO {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface CreateExpenseDTO {
  description: string;
  category: ExpenseCategory;
  supplierId?: string | null;
  totalAmount: number;
  issueDate?: string;
  documentNumber?: string;
  notes?: string;
  recurrence?: ExpenseRecurrence;
  recurrenceDay?: number | null;
  recurrenceUntil?: string | null;
  installments: ExpenseInstallmentDTO[];
  createdBy?: string;
}

export interface UpdateExpenseDTO {
  description?: string;
  category?: ExpenseCategory;
  supplierId?: string | null;
  documentNumber?: string;
  notes?: string;
  recurrence?: ExpenseRecurrence;
  recurrenceDay?: number | null;
  recurrenceUntil?: string | null;
}

const MONTHS_BY_RECURRENCE: Record<ExpenseRecurrence, number> = {
  NONE: 0, MONTHLY: 1, QUARTERLY: 3, YEARLY: 12,
};

export class ExpensesRepository {
  /**
   * Número sequencial DES-YYYY-NNNN.
   * Aceita `client` para poder rodar dentro de uma transação — chamar db.query()
   * de dentro de db.transaction() trava o pool (max:1 no pgbouncer de produção).
   */
  private async generateNumber(client?: any): Promise<string> {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const year = new Date().getFullYear();
    const prefix = `DES-${year}-`;
    const result = await q(
      `SELECT expense_number FROM expenses WHERE expense_number LIKE $1
       ORDER BY expense_number DESC LIMIT 1`,
      [`${prefix}%`]
    );
    const next = result.rows.length > 0
      ? parseInt(String(result.rows[0].expense_number).split('-')[2], 10) + 1
      : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  async create(dto: CreateExpenseDTO) {
    const id = await db.transaction(async (client) => {
      const expenseNumber = await this.generateNumber(client);

      const res = await client.query(
        `INSERT INTO expenses (
          expense_number, description, category, supplier_id, total_amount,
          issue_date, document_number, notes,
          recurrence, recurrence_day, recurrence_until, created_by
        ) VALUES ($1,$2,$3,$4,$5,COALESCE($6::date, CURRENT_DATE),$7,$8,$9,$10,$11::date,$12)
        RETURNING id`,
        [
          expenseNumber,
          dto.description,
          dto.category,
          dto.supplierId || null,
          Math.round(dto.totalAmount),
          dto.issueDate || null,
          dto.documentNumber || null,
          dto.notes || null,
          dto.recurrence || 'NONE',
          dto.recurrenceDay ?? null,
          dto.recurrenceUntil || null,
          dto.createdBy || null,
        ]
      );
      const expenseId = res.rows[0].id;

      for (const inst of dto.installments) {
        await client.query(
          `INSERT INTO expense_installments (expense_id, installment_number, amount, due_date, notes)
           VALUES ($1,$2,$3,$4::date,$5)`,
          [expenseId, inst.installmentNumber, Math.round(inst.amount), inst.dueDate, inst.notes || null]
        );
      }

      return expenseId;
    });

    return this.findById(id);
  }

  async findMany(params: {
    page: number; limit: number; search?: string;
    category?: string; status?: string; supplierId?: string;
    startDate?: string; endDate?: string;
  }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (params.search) {
      conditions.push(`(e.description ILIKE $${i} OR e.expense_number ILIKE $${i} OR e.document_number ILIKE $${i})`);
      values.push(`%${params.search}%`); i++;
    }
    if (params.category) { conditions.push(`e.category = $${i++}`); values.push(params.category); }
    if (params.status) { conditions.push(`e.status = $${i++}`); values.push(params.status); }
    if (params.supplierId) { conditions.push(`e.supplier_id = $${i++}`); values.push(params.supplierId); }
    if (params.startDate) { conditions.push(`e.issue_date >= $${i++}::date`); values.push(params.startDate); }
    if (params.endDate) { conditions.push(`e.issue_date <= $${i++}::date`); values.push(params.endDate); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM expenses e ${where}`, values);
    const total = countRes.rows[0]?.total || 0;

    const offset = (params.page - 1) * params.limit;
    values.push(params.limit, offset);

    const res = await db.query(
      `SELECT e.*, s.name AS supplier_name,
              (SELECT COUNT(*)::int FROM expense_installments ei WHERE ei.expense_id = e.id) AS installments_count,
              (SELECT COALESCE(SUM(ei.amount), 0)::bigint FROM expense_installments ei
                WHERE ei.expense_id = e.id AND ei.status = 'PAID') AS paid_amount,
              (SELECT MIN(ei.due_date) FROM expense_installments ei
                WHERE ei.expense_id = e.id AND ei.status = 'PENDING') AS next_due_date
       FROM expenses e
       LEFT JOIN suppliers s ON s.id = e.supplier_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      values
    );

    return { data: res.rows.map(this.mapToDTO), total };
  }

  async findById(id: string) {
    const res = await db.query(
      `SELECT e.*, s.name AS supplier_name
       FROM expenses e LEFT JOIN suppliers s ON s.id = e.supplier_id
       WHERE e.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;

    const instRes = await db.query(
      `SELECT * FROM expense_installments WHERE expense_id = $1 ORDER BY installment_number`,
      [id]
    );

    return {
      ...this.mapToDTO(res.rows[0]),
      installments: instRes.rows.map(this.mapInstallment),
    };
  }

  async update(id: string, dto: UpdateExpenseDTO) {
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    const put = (col: string, val: any) => { sets.push(`${col} = $${i++}`); values.push(val); };

    if (dto.description !== undefined) put('description', dto.description);
    if (dto.category !== undefined) put('category', dto.category);
    if (dto.supplierId !== undefined) put('supplier_id', dto.supplierId || null);
    if (dto.documentNumber !== undefined) put('document_number', dto.documentNumber || null);
    if (dto.notes !== undefined) put('notes', dto.notes || null);
    if (dto.recurrence !== undefined) put('recurrence', dto.recurrence);
    if (dto.recurrenceDay !== undefined) put('recurrence_day', dto.recurrenceDay);
    if (dto.recurrenceUntil !== undefined) { sets.push(`recurrence_until = $${i++}::date`); values.push(dto.recurrenceUntil || null); }

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      values.push(id);
      await db.query(`UPDATE expenses SET ${sets.join(', ')} WHERE id = $${i}`, values);
    }
    return this.findById(id);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    // Despesa com parcela já paga não some do histórico — vira CANCELLED
    const paid = await db.query(
      `SELECT COUNT(*)::int AS n FROM expense_installments WHERE expense_id = $1 AND status = 'PAID'`,
      [id]
    );
    if ((paid.rows[0]?.n || 0) > 0) {
      await db.query(
        `UPDATE expenses SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [id]
      );
      await db.query(
        `UPDATE expense_installments SET status = 'CANCELLED' WHERE expense_id = $1 AND status = 'PENDING'`,
        [id]
      );
      return { success: true };
    }
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
    return { success: true };
  }

  /**
   * Baixa de uma parcela. Quando é a última em aberto e a despesa é recorrente,
   * já cria a despesa do próximo período — é o que faz aluguel/salário
   * aparecerem sozinhos no Contas a Pagar do mês seguinte.
   */
  async payInstallment(installmentId: string, paidDate: string, paymentMethod?: string) {
    const expenseId = await db.transaction(async (client) => {
      const upd = await client.query(
        `UPDATE expense_installments
         SET status = 'PAID', paid_date = $1::date, payment_method = COALESCE($2, payment_method)
         WHERE id = $3 AND status = 'PENDING'
         RETURNING expense_id`,
        [paidDate, paymentMethod || null, installmentId]
      );
      if (upd.rowCount === 0) {
        throw Object.assign(new Error('Parcela não encontrada ou já baixada'), {
          statusCode: 400, code: 'INVALID_STATUS',
        });
      }
      const eId = upd.rows[0].expense_id;

      const pend = await client.query(
        `SELECT COUNT(*)::int AS n FROM expense_installments
         WHERE expense_id = $1 AND status = 'PENDING'`,
        [eId]
      );
      if ((pend.rows[0]?.n || 0) === 0) {
        await client.query(`UPDATE expenses SET status = 'PAID', updated_at = NOW() WHERE id = $1`, [eId]);
        await this.spawnNextRecurrence(client, eId);
      }
      return eId;
    });

    return this.findById(expenseId);
  }

  async unpayInstallment(installmentId: string) {
    const res = await db.query(
      `UPDATE expense_installments
       SET status = 'PENDING', paid_date = NULL
       WHERE id = $1 AND status = 'PAID'
       RETURNING expense_id`,
      [installmentId]
    );
    if (res.rowCount === 0) {
      throw Object.assign(new Error('Parcela não está paga'), { statusCode: 400, code: 'INVALID_STATUS' });
    }
    const eId = res.rows[0].expense_id;
    await db.query(`UPDATE expenses SET status = 'OPEN', updated_at = NOW() WHERE id = $1 AND status = 'PAID'`, [eId]);
    return this.findById(eId);
  }

  /**
   * Cria a ocorrência seguinte de uma despesa recorrente (dentro da transação).
   * Não faz nada se não é recorrente, se já passou de recurrence_until, ou se a
   * próxima já existe — a checagem por recurrence_parent_id evita duplicar quando
   * a mesma parcela é baixada e reaberta várias vezes.
   */
  private async spawnNextRecurrence(client: any, expenseId: string): Promise<void> {
    const res = await client.query(`SELECT * FROM expenses WHERE id = $1`, [expenseId]);
    const e = res.rows[0];
    if (!e) return;

    const step = MONTHS_BY_RECURRENCE[(e.recurrence || 'NONE') as ExpenseRecurrence] || 0;
    if (step === 0) return;

    const instRes = await client.query(
      `SELECT installment_number, amount, due_date FROM expense_installments
       WHERE expense_id = $1 ORDER BY installment_number`,
      [expenseId]
    );
    if (instRes.rows.length === 0) return;

    // Base = primeira parcela; o dia pode ser fixado em recurrence_day
    const firstDue: Date = new Date(instRes.rows[0].due_date);
    const nextBase = new Date(firstDue);
    nextBase.setMonth(nextBase.getMonth() + step);
    if (e.recurrence_day) {
      const lastDay = new Date(nextBase.getFullYear(), nextBase.getMonth() + 1, 0).getDate();
      nextBase.setDate(Math.min(Number(e.recurrence_day), lastDay));
    }

    if (e.recurrence_until && nextBase > new Date(e.recurrence_until)) return;

    const dup = await client.query(
      `SELECT 1 FROM expenses WHERE recurrence_parent_id = $1 LIMIT 1`,
      [expenseId]
    );
    if (dup.rowCount > 0) return;

    const expenseNumber = await this.generateNumber(client);
    const shiftDays = Math.round((nextBase.getTime() - firstDue.getTime()) / 86400000);

    const newRes = await client.query(
      `INSERT INTO expenses (
        expense_number, description, category, supplier_id, total_amount,
        issue_date, document_number, notes,
        recurrence, recurrence_day, recurrence_until, recurrence_parent_id, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id`,
      [
        expenseNumber, e.description, e.category, e.supplier_id, e.total_amount,
        nextBase.toISOString().slice(0, 10), e.document_number, e.notes,
        e.recurrence, e.recurrence_day, e.recurrence_until, expenseId, e.created_by,
      ]
    );
    const newId = newRes.rows[0].id;

    for (const inst of instRes.rows) {
      await client.query(
        `INSERT INTO expense_installments (expense_id, installment_number, amount, due_date)
         VALUES ($1,$2,$3, $4::date + ($5 || ' days')::interval)`,
        [newId, inst.installment_number, inst.amount, inst.due_date, shiftDays]
      );
    }
  }

  private mapToDTO = (row: any) => ({
    id: row.id,
    expenseNumber: row.expense_number,
    description: row.description,
    category: row.category,
    supplierId: row.supplier_id || undefined,
    supplierName: row.supplier_name || undefined,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: row.paid_amount != null ? Number(row.paid_amount) : undefined,
    issueDate: row.issue_date,
    documentNumber: row.document_number || undefined,
    notes: row.notes || undefined,
    recurrence: row.recurrence,
    recurrenceDay: row.recurrence_day ?? undefined,
    recurrenceUntil: row.recurrence_until ?? undefined,
    recurrenceParentId: row.recurrence_parent_id ?? undefined,
    status: row.status,
    installmentsCount: row.installments_count ?? undefined,
    nextDueDate: row.next_due_date ?? undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  private mapInstallment = (row: any) => ({
    id: row.id,
    expenseId: row.expense_id,
    installmentNumber: row.installment_number,
    amount: Number(row.amount) || 0,
    dueDate: row.due_date,
    paidDate: row.paid_date || undefined,
    status: row.status,
    paymentMethod: row.payment_method || undefined,
    notes: row.notes || undefined,
  });
}
