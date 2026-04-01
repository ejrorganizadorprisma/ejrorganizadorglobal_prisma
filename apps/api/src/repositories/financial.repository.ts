import { db } from '../config/database';
import type {
  FinancialEntry,
  FinancialSummary,
  CashFlowResponse,
  CashFlowDay,
  CalendarResponse,
  CalendarDay,
  FinancialFilters,
  FinancialListResponse,
  Debtor,
  DebtorListResponse,
  DebtorFilters,
  PaymentMethodBreakdown,
  AgingAnalysis,
} from '@ejr/shared-types';

export class FinancialRepository {
  /**
   * Obter resumo financeiro: totais por status, próximos vencimentos e atrasados
   */
  async getSummary(): Promise<FinancialSummary> {
    // ── Contas a Receber agrupadas por status ──
    const receivableQuery = `
      SELECT
        CASE
          WHEN sp.status = 'PENDING' AND sp.due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE sp.status::text
        END AS effective_status,
        COUNT(*)::int AS count,
        COALESCE(SUM(sp.amount), 0)::bigint AS total
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      GROUP BY effective_status
    `;

    // ── Contas a Pagar agrupadas por status ──
    const payableQuery = `
      SELECT
        CASE
          WHEN (inst->>'status') = 'PENDING' AND (inst->>'dueDate')::date < CURRENT_DATE THEN 'OVERDUE'
          ELSE inst->>'status'
        END AS effective_status,
        COUNT(*)::int AS count,
        COALESCE(SUM((inst->>'amount')::bigint), 0)::bigint AS total
      FROM purchase_budgets pb,
           jsonb_array_elements(pb.payment_installments) AS inst
      WHERE pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')
        AND pb.payment_installments IS NOT NULL
        AND jsonb_array_length(pb.payment_installments) > 0
      GROUP BY effective_status
    `;

    // ── Vencimentos hoje ──
    const dueTodayReceivableQuery = `
      SELECT COALESCE(SUM(sp.amount), 0)::bigint AS total
      FROM sale_payments sp
      WHERE sp.status = 'PENDING'
        AND sp.due_date = CURRENT_DATE
    `;

    const dueTodayPayableQuery = `
      SELECT COALESCE(SUM((inst->>'amount')::bigint), 0)::bigint AS total
      FROM purchase_budgets pb,
           jsonb_array_elements(pb.payment_installments) AS inst
      WHERE pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')
        AND pb.payment_installments IS NOT NULL
        AND jsonb_array_length(pb.payment_installments) > 0
        AND (inst->>'status') = 'PENDING'
        AND (inst->>'dueDate')::date = CURRENT_DATE
    `;

    // ── Top 10 próximos vencimentos (PENDING, due_date >= hoje) ──
    const upcomingQuery = `
      (
        SELECT
          sp.id::text AS id,
          'RECEIVABLE' AS direction,
          'SALE' AS source_type,
          s.id::text AS source_id,
          s.sale_number AS source_number,
          sp.installment_number,
          sp.amount::bigint AS amount,
          sp.due_date::text AS due_date,
          sp.paid_date::text AS paid_date,
          'PENDING' AS status,
          sp.payment_method::text AS payment_method,
          sp.notes,
          c.id::text AS entity_id,
          COALESCE(c.name, 'Cliente não identificado') AS entity_name
        FROM sale_payments sp
        INNER JOIN sales s ON s.id = sp.sale_id
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE sp.status = 'PENDING'
          AND sp.due_date >= CURRENT_DATE
        ORDER BY sp.due_date ASC
        LIMIT 10
      )
      UNION ALL
      (
        SELECT
          (inst->>'id')::text AS id,
          'PAYABLE' AS direction,
          'PURCHASE_BUDGET' AS source_type,
          pb.id::text AS source_id,
          pb.budget_number AS source_number,
          (inst->>'installmentNumber')::int AS installment_number,
          (inst->>'amount')::bigint AS amount,
          (inst->>'dueDate')::text AS due_date,
          (inst->>'paidDate')::text AS paid_date,
          'PENDING' AS status,
          pb.payment_method::text AS payment_method,
          inst->>'notes' AS notes,
          sup.id::text AS entity_id,
          COALESCE(sup.name, 'Fornecedor não identificado') AS entity_name
        FROM purchase_budgets pb
        CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
        LEFT JOIN suppliers sup ON sup.id = pb.supplier_id
        WHERE pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')
          AND pb.payment_installments IS NOT NULL
          AND jsonb_array_length(pb.payment_installments) > 0
          AND (inst->>'status') = 'PENDING'
          AND (inst->>'dueDate')::date >= CURRENT_DATE
        ORDER BY (inst->>'dueDate')::date ASC
        LIMIT 10
      )
      ORDER BY due_date ASC
      LIMIT 10
    `;

    // ── Top 10 atrasados (PENDING com due_date < hoje) ──
    const overdueQuery = `
      (
        SELECT
          sp.id::text AS id,
          'RECEIVABLE' AS direction,
          'SALE' AS source_type,
          s.id::text AS source_id,
          s.sale_number AS source_number,
          sp.installment_number,
          sp.amount::bigint AS amount,
          sp.due_date::text AS due_date,
          sp.paid_date::text AS paid_date,
          'OVERDUE' AS status,
          sp.payment_method::text AS payment_method,
          sp.notes,
          c.id::text AS entity_id,
          COALESCE(c.name, 'Cliente não identificado') AS entity_name
        FROM sale_payments sp
        INNER JOIN sales s ON s.id = sp.sale_id
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE sp.status = 'PENDING'
          AND sp.due_date < CURRENT_DATE
        ORDER BY sp.due_date ASC
        LIMIT 10
      )
      UNION ALL
      (
        SELECT
          (inst->>'id')::text AS id,
          'PAYABLE' AS direction,
          'PURCHASE_BUDGET' AS source_type,
          pb.id::text AS source_id,
          pb.budget_number AS source_number,
          (inst->>'installmentNumber')::int AS installment_number,
          (inst->>'amount')::bigint AS amount,
          (inst->>'dueDate')::text AS due_date,
          (inst->>'paidDate')::text AS paid_date,
          'OVERDUE' AS status,
          pb.payment_method::text AS payment_method,
          inst->>'notes' AS notes,
          sup.id::text AS entity_id,
          COALESCE(sup.name, 'Fornecedor não identificado') AS entity_name
        FROM purchase_budgets pb
        CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
        LEFT JOIN suppliers sup ON sup.id = pb.supplier_id
        WHERE pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')
          AND pb.payment_installments IS NOT NULL
          AND jsonb_array_length(pb.payment_installments) > 0
          AND (inst->>'status') = 'PENDING'
          AND (inst->>'dueDate')::date < CURRENT_DATE
        ORDER BY (inst->>'dueDate')::date ASC
        LIMIT 10
      )
      ORDER BY due_date ASC
      LIMIT 10
    `;

    // ── Payment method breakdown ──
    const paymentMethodBreakdownQuery = `
      SELECT sp.payment_method::text AS method, COUNT(*)::int AS count,
        COALESCE(SUM(sp.amount), 0)::bigint AS total_amount,
        COALESCE(SUM(CASE WHEN sp.status = 'PENDING' THEN sp.amount ELSE 0 END), 0)::bigint AS pending_amount,
        COALESCE(SUM(CASE WHEN sp.status = 'PAID' THEN sp.amount ELSE 0 END), 0)::bigint AS paid_amount
      FROM sale_payments sp GROUP BY sp.payment_method ORDER BY total_amount DESC
    `;

    // ── Receivable aging ──
    const receivableAgingQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date::date BETWEEN 0 AND 30 THEN amount ELSE 0 END), 0)::bigint AS current_amount,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date::date BETWEEN 31 AND 60 THEN amount ELSE 0 END), 0)::bigint AS days_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date::date BETWEEN 61 AND 90 THEN amount ELSE 0 END), 0)::bigint AS days_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date::date > 90 THEN amount ELSE 0 END), 0)::bigint AS days_90plus,
        COUNT(CASE WHEN CURRENT_DATE - due_date::date BETWEEN 0 AND 30 THEN 1 END)::int AS current_count,
        COUNT(CASE WHEN CURRENT_DATE - due_date::date BETWEEN 31 AND 60 THEN 1 END)::int AS days_30_count,
        COUNT(CASE WHEN CURRENT_DATE - due_date::date BETWEEN 61 AND 90 THEN 1 END)::int AS days_60_count,
        COUNT(CASE WHEN CURRENT_DATE - due_date::date > 90 THEN 1 END)::int AS days_90plus_count
      FROM sale_payments WHERE status = 'PENDING' AND due_date < CURRENT_DATE
    `;

    // ── Sales today ──
    const salesTodayQuery = `
      SELECT COUNT(*)::int AS sales_count, COALESCE(SUM(total), 0)::bigint AS revenue
      FROM sales WHERE DATE(sale_date) = CURRENT_DATE
    `;

    // ── Top 5 debtors ──
    const topDebtorsQuery = `
      SELECT
        c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
        c.email AS customer_email, c.allowed_payment_methods, c.credit_max_days,
        COUNT(DISTINCT s.id)::int AS total_sales,
        COALESCE(SUM(sp.amount), 0)::bigint AS total_debt,
        COALESCE(SUM(CASE WHEN sp.due_date < CURRENT_DATE THEN sp.amount ELSE 0 END), 0)::bigint AS overdue_amount,
        COALESCE(SUM(CASE WHEN sp.due_date >= CURRENT_DATE THEN sp.amount ELSE 0 END), 0)::bigint AS pending_amount,
        MIN(sp.due_date)::text AS oldest_due_date,
        GREATEST((CURRENT_DATE - MIN(sp.due_date)::date)::int, 0) AS days_overdue,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date BETWEEN 0 AND 30 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_current,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date BETWEEN 31 AND 60 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date BETWEEN 61 AND 90 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date > 90 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_90plus
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      INNER JOIN customers c ON c.id = s.customer_id
      WHERE sp.status = 'PENDING'
      GROUP BY c.id, c.name, c.phone, c.email, c.allowed_payment_methods, c.credit_max_days
      HAVING COALESCE(SUM(sp.amount), 0) > 0
      ORDER BY total_debt DESC
      LIMIT 5
    `;

    const [
      receivableResult,
      payableResult,
      dueTodayRecResult,
      dueTodayPayResult,
      upcomingResult,
      overdueResult,
      paymentMethodResult,
      receivableAgingResult,
      salesTodayResult,
      topDebtorsResult,
    ] = await Promise.all([
      db.query(receivableQuery),
      db.query(payableQuery),
      db.query(dueTodayReceivableQuery),
      db.query(dueTodayPayableQuery),
      db.query(upcomingQuery),
      db.query(overdueQuery),
      db.query(paymentMethodBreakdownQuery),
      db.query(receivableAgingQuery),
      db.query(salesTodayQuery),
      db.query(topDebtorsQuery),
    ]);

    // Montar receivableByStatus
    const receivableByStatus: Record<string, { count: number; total: number }> = {};
    let totalReceivable = 0;
    let overdueReceivable = 0;

    for (const row of receivableResult.rows) {
      const status = row.effective_status;
      const total = Number(row.total);
      const count = Number(row.count);
      receivableByStatus[status] = { count, total };

      if (status !== 'CANCELLED') {
        totalReceivable += total;
      }
      if (status === 'OVERDUE') {
        overdueReceivable += total;
      }
    }

    // Montar payableByStatus
    const payableByStatus: Record<string, { count: number; total: number }> = {};
    let totalPayable = 0;
    let overduePayable = 0;

    for (const row of payableResult.rows) {
      const status = row.effective_status;
      const total = Number(row.total);
      const count = Number(row.count);
      payableByStatus[status] = { count, total };

      if (status !== 'CANCELLED') {
        totalPayable += total;
      }
      if (status === 'OVERDUE') {
        overduePayable += total;
      }
    }

    const dueTodayReceivable = Number(dueTodayRecResult.rows[0]?.total || 0);
    const dueTodayPayable = Number(dueTodayPayResult.rows[0]?.total || 0);

    const projectedBalance = totalReceivable - totalPayable;

    const upcomingEntries: FinancialEntry[] = upcomingResult.rows.map(this.mapRowToEntry);
    const overdueEntries: FinancialEntry[] = overdueResult.rows.map(this.mapRowToEntry);

    // Map payment method breakdown
    const paymentMethodBreakdown: PaymentMethodBreakdown[] = paymentMethodResult.rows.map((row: any) => ({
      method: row.method || 'UNKNOWN',
      count: Number(row.count),
      totalAmount: Number(row.total_amount),
      pendingAmount: Number(row.pending_amount),
      paidAmount: Number(row.paid_amount),
    }));

    // Map receivable aging
    const agingRow = receivableAgingResult.rows[0];
    const receivableAging: AgingAnalysis = {
      current: Number(agingRow?.current_amount || 0),
      days30: Number(agingRow?.days_30 || 0),
      days60: Number(agingRow?.days_60 || 0),
      days90plus: Number(agingRow?.days_90plus || 0),
      currentCount: Number(agingRow?.current_count || 0),
      days30Count: Number(agingRow?.days_30_count || 0),
      days60Count: Number(agingRow?.days_60_count || 0),
      days90plusCount: Number(agingRow?.days_90plus_count || 0),
    };

    // Map sales today
    const salesTodayRow = salesTodayResult.rows[0];
    const salesToday = Number(salesTodayRow?.sales_count || 0);
    const revenueTodayTotal = Number(salesTodayRow?.revenue || 0);

    // Map top debtors
    const topDebtors: Debtor[] = topDebtorsResult.rows.map((row: any) => this.mapRowToDebtor(row));

    return {
      totalReceivable,
      totalPayable,
      projectedBalance,
      overdueReceivable,
      overduePayable,
      dueTodayReceivable,
      dueTodayPayable,
      receivableByStatus,
      payableByStatus,
      upcomingEntries,
      overdueEntries,
      paymentMethodBreakdown,
      receivableAging,
      topDebtors,
      salesToday,
      revenueTodayTotal,
    };
  }

  /**
   * Fluxo de caixa: agrupa recebimentos e pagamentos por dia nos próximos N dias
   */
  async getCashFlow(days: number): Promise<CashFlowResponse> {
    // Recebíveis por dia (PENDING apenas, pois PAID já foi recebido)
    const receivableByDayQuery = `
      SELECT
        sp.due_date::text AS day,
        COALESCE(SUM(sp.amount), 0)::bigint AS total
      FROM sale_payments sp
      WHERE sp.status = 'PENDING'
        AND sp.due_date >= CURRENT_DATE
        AND sp.due_date < CURRENT_DATE + $1::int
      GROUP BY sp.due_date
      ORDER BY sp.due_date
    `;

    // Pagáveis por dia
    const payableByDayQuery = `
      SELECT
        (inst->>'dueDate')::date::text AS day,
        COALESCE(SUM((inst->>'amount')::bigint), 0)::bigint AS total
      FROM purchase_budgets pb,
           jsonb_array_elements(pb.payment_installments) AS inst
      WHERE pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')
        AND pb.payment_installments IS NOT NULL
        AND jsonb_array_length(pb.payment_installments) > 0
        AND (inst->>'status') = 'PENDING'
        AND (inst->>'dueDate')::date >= CURRENT_DATE
        AND (inst->>'dueDate')::date < CURRENT_DATE + $1::int
      GROUP BY (inst->>'dueDate')::date
      ORDER BY (inst->>'dueDate')::date
    `;

    const [receivableResult, payableResult] = await Promise.all([
      db.query(receivableByDayQuery, [days]),
      db.query(payableByDayQuery, [days]),
    ]);

    // Indexar resultados por dia
    const receivableMap = new Map<string, number>();
    for (const row of receivableResult.rows) {
      receivableMap.set(row.day, Number(row.total));
    }

    const payableMap = new Map<string, number>();
    for (const row of payableResult.rows) {
      payableMap.set(row.day, Number(row.total));
    }

    // Gerar array de dias
    const cashFlowDays: CashFlowDay[] = [];
    let cumulativeBalance = 0;
    let totalReceivable = 0;
    let totalPayable = 0;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const receivable = receivableMap.get(dateStr) || 0;
      const payable = payableMap.get(dateStr) || 0;
      const balance = receivable - payable;
      cumulativeBalance += balance;

      totalReceivable += receivable;
      totalPayable += payable;

      cashFlowDays.push({
        date: dateStr,
        receivable,
        payable,
        balance,
        cumulativeBalance,
      });
    }

    return {
      days: cashFlowDays,
      totalReceivable,
      totalPayable,
      netBalance: totalReceivable - totalPayable,
    };
  }

  /**
   * Calendário financeiro: todas as parcelas de um mês, agrupadas por dia
   */
  async getCalendar(month: string): Promise<CalendarResponse> {
    // month no formato "YYYY-MM"
    const startOfMonth = `${month}-01`;

    // Recebíveis do mês
    const receivableQuery = `
      SELECT
        sp.id::text AS id,
        'RECEIVABLE' AS direction,
        'SALE' AS source_type,
        s.id::text AS source_id,
        s.sale_number AS source_number,
        sp.installment_number,
        sp.amount::bigint AS amount,
        sp.due_date::text AS due_date,
        sp.paid_date::text AS paid_date,
        CASE
          WHEN sp.status = 'PENDING' AND sp.due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE sp.status::text
        END AS status,
        sp.payment_method,
        sp.notes,
        c.id::text AS entity_id,
        COALESCE(c.name, 'Cliente não identificado') AS entity_name
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE sp.due_date >= $1::date
        AND sp.due_date < ($1::date + INTERVAL '1 month')
    `;

    // Pagáveis do mês
    const payableQuery = `
      SELECT
        (inst->>'id')::text AS id,
        'PAYABLE' AS direction,
        'PURCHASE_BUDGET' AS source_type,
        pb.id::text AS source_id,
        pb.budget_number AS source_number,
        (inst->>'installmentNumber')::int AS installment_number,
        (inst->>'amount')::bigint AS amount,
        (inst->>'dueDate')::text AS due_date,
        (inst->>'paidDate')::text AS paid_date,
        CASE
          WHEN (inst->>'status') = 'PENDING' AND (inst->>'dueDate')::date < CURRENT_DATE THEN 'OVERDUE'
          ELSE inst->>'status'
        END AS status,
        pb.payment_method,
        inst->>'notes' AS notes,
        sup.id::text AS entity_id,
        COALESCE(sup.name, 'Fornecedor não identificado') AS entity_name
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      LEFT JOIN suppliers sup ON sup.id = pb.supplier_id
      WHERE pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')
        AND pb.payment_installments IS NOT NULL
        AND jsonb_array_length(pb.payment_installments) > 0
        AND (inst->>'dueDate')::date >= $1::date
        AND (inst->>'dueDate')::date < ($1::date + INTERVAL '1 month')
    `;

    const [receivableResult, payableResult] = await Promise.all([
      db.query(receivableQuery, [startOfMonth]),
      db.query(payableQuery, [startOfMonth]),
    ]);

    // Combinar todas as entradas
    const allEntries: FinancialEntry[] = [
      ...receivableResult.rows.map(this.mapRowToEntry),
      ...payableResult.rows.map(this.mapRowToEntry),
    ];

    // Agrupar por dia
    const dayMap = new Map<string, FinancialEntry[]>();
    for (const entry of allEntries) {
      const dateKey = entry.dueDate.substring(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, []);
      }
      dayMap.get(dateKey)!.push(entry);
    }

    // Construir array de CalendarDay
    const calendarDays: CalendarDay[] = [];
    let monthTotalReceivable = 0;
    let monthTotalPayable = 0;

    // Ordenar dias
    const sortedDates = Array.from(dayMap.keys()).sort();

    for (const date of sortedDates) {
      const entries = dayMap.get(date)!;
      let totalReceivable = 0;
      let totalPayable = 0;

      for (const entry of entries) {
        if (entry.direction === 'RECEIVABLE') {
          totalReceivable += entry.amount;
        } else {
          totalPayable += entry.amount;
        }
      }

      monthTotalReceivable += totalReceivable;
      monthTotalPayable += totalPayable;

      calendarDays.push({
        date,
        entries,
        totalReceivable,
        totalPayable,
      });
    }

    return {
      month,
      days: calendarDays,
      monthTotalReceivable,
      monthTotalPayable,
    };
  }

  /**
   * Lista paginada de contas a receber (sale_payments) com filtros e totais por status
   */
  async getReceivables(filters: FinancialFilters): Promise<FinancialListResponse> {
    const {
      status,
      startDate,
      endDate,
      entityId,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      if (status === 'OVERDUE') {
        conditions.push(`sp.status = 'PENDING' AND sp.due_date < CURRENT_DATE`);
      } else {
        conditions.push(`sp.status = $${paramIndex}::text`);
        queryParams.push(status);
        paramIndex++;
        // Se filtrou por PENDING, excluir os que já estão atrasados
        if (status === 'PENDING') {
          conditions.push(`sp.due_date >= CURRENT_DATE`);
        }
      }
    }

    if (startDate) {
      conditions.push(`sp.due_date >= $${paramIndex}::date`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`sp.due_date <= $${paramIndex}::date`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (entityId) {
      conditions.push(`s.customer_id = $${paramIndex}`);
      queryParams.push(entityId);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(s.sale_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = countResult.rows[0]?.total || 0;

    // Totais por status (usa os mesmos filtros, exceto status)
    const statusConditions = conditions.filter(
      (c) =>
        !c.includes('sp.status') &&
        !c.includes('sp.due_date >= CURRENT_DATE')
    );
    const statusParams = queryParams.filter((_, idx) => {
      // Remover o parâmetro do status se existia
      if (status && status !== 'OVERDUE') {
        return idx !== 0;
      }
      return true;
    });

    // Para simplificar, recalcular totais sem filtro de status
    const totalsConditions: string[] = [];
    const totalsParams: any[] = [];
    let totalsParamIndex = 1;

    if (startDate) {
      totalsConditions.push(`sp.due_date >= $${totalsParamIndex}::date`);
      totalsParams.push(startDate);
      totalsParamIndex++;
    }
    if (endDate) {
      totalsConditions.push(`sp.due_date <= $${totalsParamIndex}::date`);
      totalsParams.push(endDate);
      totalsParamIndex++;
    }
    if (entityId) {
      totalsConditions.push(`s.customer_id = $${totalsParamIndex}`);
      totalsParams.push(entityId);
      totalsParamIndex++;
    }
    if (search) {
      totalsConditions.push(`(s.sale_number ILIKE $${totalsParamIndex} OR c.name ILIKE $${totalsParamIndex})`);
      totalsParams.push(`%${search}%`);
      totalsParamIndex++;
    }

    const totalsWhereClause = totalsConditions.length > 0
      ? `WHERE ${totalsConditions.join(' AND ')}`
      : '';

    const totalsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN sp.status = 'PENDING' AND sp.due_date >= CURRENT_DATE THEN sp.amount ELSE 0 END), 0)::bigint AS pending,
        COALESCE(SUM(CASE WHEN sp.status = 'PAID' THEN sp.amount ELSE 0 END), 0)::bigint AS paid,
        COALESCE(SUM(CASE WHEN sp.status = 'PENDING' AND sp.due_date < CURRENT_DATE THEN sp.amount ELSE 0 END), 0)::bigint AS overdue,
        COALESCE(SUM(CASE WHEN sp.status = 'CANCELLED' THEN sp.amount ELSE 0 END), 0)::bigint AS cancelled,
        COALESCE(SUM(sp.amount), 0)::bigint AS total
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      ${totalsWhereClause}
    `;

    const totalsResult = await db.query(totalsQuery, totalsParams);
    const totals = {
      pending: Number(totalsResult.rows[0]?.pending || 0),
      paid: Number(totalsResult.rows[0]?.paid || 0),
      overdue: Number(totalsResult.rows[0]?.overdue || 0),
      cancelled: Number(totalsResult.rows[0]?.cancelled || 0),
      total: Number(totalsResult.rows[0]?.total || 0),
    };

    // Dados paginados
    const dataQuery = `
      SELECT
        sp.id::text AS id,
        'RECEIVABLE' AS direction,
        'SALE' AS source_type,
        s.id::text AS source_id,
        s.sale_number AS source_number,
        sp.installment_number,
        sp.amount::bigint AS amount,
        sp.due_date::text AS due_date,
        sp.paid_date::text AS paid_date,
        CASE
          WHEN sp.status = 'PENDING' AND sp.due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE sp.status::text
        END AS status,
        sp.payment_method,
        sp.notes,
        c.id::text AS entity_id,
        COALESCE(c.name, 'Cliente não identificado') AS entity_name,
        c.credit_max_days AS customer_credit_max_days,
        c.allowed_payment_methods AS customer_allowed_payment_methods,
        GREATEST((CURRENT_DATE - sp.due_date::date)::int, 0) AS days_overdue_calc,
        CASE WHEN c.credit_max_days IS NOT NULL AND sp.status != 'PAID' AND sp.due_date < CURRENT_DATE
          AND (CURRENT_DATE - sp.due_date::date)::int > c.credit_max_days THEN true ELSE false END AS is_credit_exceeded
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id
      ${whereClause}
      ORDER BY sp.due_date ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await db.query(dataQuery, queryParams);

    return {
      data: dataResult.rows.map((row: any): FinancialEntry => ({
        ...this.mapRowToEntry(row),
        customerCreditMaxDays: row.customer_credit_max_days ?? null,
        customerAllowedPaymentMethods: row.customer_allowed_payment_methods || [],
        daysOverdue: row.days_overdue_calc > 0 ? row.days_overdue_calc : undefined,
        isCreditExceeded: row.is_credit_exceeded || false,
      })),
      total,
      totals,
    };
  }

  /**
   * Lista paginada de contas a pagar (purchase_budgets JSONB) com filtros e totais por status
   */
  async getPayables(filters: FinancialFilters): Promise<FinancialListResponse> {
    const {
      status,
      startDate,
      endDate,
      entityId,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const baseConditions: string[] = [
      `pb.status NOT IN ('CANCELLED', 'DRAFT', 'REJECTED')`,
      `pb.payment_installments IS NOT NULL`,
      `jsonb_array_length(pb.payment_installments) > 0`,
    ];
    const conditions: string[] = [...baseConditions];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      if (status === 'OVERDUE') {
        conditions.push(`(inst->>'status') = 'PENDING' AND (inst->>'dueDate')::date < CURRENT_DATE`);
      } else {
        conditions.push(`(inst->>'status') = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
        if (status === 'PENDING') {
          conditions.push(`(inst->>'dueDate')::date >= CURRENT_DATE`);
        }
      }
    }

    if (startDate) {
      conditions.push(`(inst->>'dueDate')::date >= $${paramIndex}::date`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`(inst->>'dueDate')::date <= $${paramIndex}::date`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (entityId) {
      conditions.push(`pb.supplier_id = $${paramIndex}`);
      queryParams.push(entityId);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(pb.budget_number ILIKE $${paramIndex} OR sup.name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      LEFT JOIN suppliers sup ON sup.id = pb.supplier_id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = countResult.rows[0]?.total || 0;

    // Totais por status (sem filtro de status)
    const totalsConditions: string[] = [...baseConditions];
    const totalsParams: any[] = [];
    let totalsParamIndex = 1;

    if (startDate) {
      totalsConditions.push(`(inst->>'dueDate')::date >= $${totalsParamIndex}::date`);
      totalsParams.push(startDate);
      totalsParamIndex++;
    }
    if (endDate) {
      totalsConditions.push(`(inst->>'dueDate')::date <= $${totalsParamIndex}::date`);
      totalsParams.push(endDate);
      totalsParamIndex++;
    }
    if (entityId) {
      totalsConditions.push(`pb.supplier_id = $${totalsParamIndex}`);
      totalsParams.push(entityId);
      totalsParamIndex++;
    }
    if (search) {
      totalsConditions.push(`(pb.budget_number ILIKE $${totalsParamIndex} OR sup.name ILIKE $${totalsParamIndex})`);
      totalsParams.push(`%${search}%`);
      totalsParamIndex++;
    }

    const totalsWhereClause = `WHERE ${totalsConditions.join(' AND ')}`;

    const totalsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN (inst->>'status') = 'PENDING' AND (inst->>'dueDate')::date >= CURRENT_DATE THEN (inst->>'amount')::bigint ELSE 0 END), 0)::bigint AS pending,
        COALESCE(SUM(CASE WHEN (inst->>'status') = 'PAID' THEN (inst->>'amount')::bigint ELSE 0 END), 0)::bigint AS paid,
        COALESCE(SUM(CASE WHEN (inst->>'status') = 'PENDING' AND (inst->>'dueDate')::date < CURRENT_DATE THEN (inst->>'amount')::bigint ELSE 0 END), 0)::bigint AS overdue,
        COALESCE(SUM(CASE WHEN (inst->>'status') = 'CANCELLED' THEN (inst->>'amount')::bigint ELSE 0 END), 0)::bigint AS cancelled,
        COALESCE(SUM((inst->>'amount')::bigint), 0)::bigint AS total
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      LEFT JOIN suppliers sup ON sup.id = pb.supplier_id
      ${totalsWhereClause}
    `;

    const totalsResult = await db.query(totalsQuery, totalsParams);
    const totals = {
      pending: Number(totalsResult.rows[0]?.pending || 0),
      paid: Number(totalsResult.rows[0]?.paid || 0),
      overdue: Number(totalsResult.rows[0]?.overdue || 0),
      cancelled: Number(totalsResult.rows[0]?.cancelled || 0),
      total: Number(totalsResult.rows[0]?.total || 0),
    };

    // Dados paginados
    const dataQuery = `
      SELECT
        (inst->>'id')::text AS id,
        'PAYABLE' AS direction,
        'PURCHASE_BUDGET' AS source_type,
        pb.id::text AS source_id,
        pb.budget_number AS source_number,
        (inst->>'installmentNumber')::int AS installment_number,
        (inst->>'amount')::bigint AS amount,
        (inst->>'dueDate')::text AS due_date,
        (inst->>'paidDate')::text AS paid_date,
        CASE
          WHEN (inst->>'status') = 'PENDING' AND (inst->>'dueDate')::date < CURRENT_DATE THEN 'OVERDUE'
          ELSE inst->>'status'
        END AS status,
        pb.payment_method,
        inst->>'notes' AS notes,
        sup.id::text AS entity_id,
        COALESCE(sup.name, 'Fornecedor não identificado') AS entity_name
      FROM purchase_budgets pb
      CROSS JOIN LATERAL jsonb_array_elements(pb.payment_installments) AS inst
      LEFT JOIN suppliers sup ON sup.id = pb.supplier_id
      ${whereClause}
      ORDER BY (inst->>'dueDate')::date ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await db.query(dataQuery, queryParams);

    return {
      data: dataResult.rows.map(this.mapRowToEntry),
      total,
      totals,
    };
  }

  /**
   * Lista de devedores agrupados por cliente com aging e filtros
   */
  async getDebtors(filters: DebtorFilters): Promise<DebtorListResponse> {
    const {
      search,
      onlyOverdue,
      onlyCreditExceeded,
      sortBy = 'overdue',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [`sp.status = 'PENDING'`];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`c.name ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Build HAVING clause
    const havingParts: string[] = [`COALESCE(SUM(sp.amount), 0) > 0`];

    if (onlyOverdue) {
      havingParts.push(`SUM(CASE WHEN sp.due_date < CURRENT_DATE THEN sp.amount ELSE 0 END) > 0`);
    }

    if (onlyCreditExceeded) {
      havingParts.push(`c.credit_max_days IS NOT NULL AND GREATEST((CURRENT_DATE - MIN(sp.due_date)::date)::int, 0) > c.credit_max_days`);
    }

    const havingClause = `HAVING ${havingParts.join(' AND ')}`;

    // Map sort columns
    const sortColumnMap: Record<string, string> = {
      debt: 'total_debt',
      overdue: 'overdue_amount',
      daysOverdue: 'days_overdue',
      name: 'customer_name',
    };
    const sortColumn = sortColumnMap[sortBy] || 'overdue_amount';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const baseQuery = `
      SELECT
        c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
        c.email AS customer_email, c.allowed_payment_methods, c.credit_max_days,
        COUNT(DISTINCT s.id)::int AS total_sales,
        COALESCE(SUM(sp.amount), 0)::bigint AS total_debt,
        COALESCE(SUM(CASE WHEN sp.due_date < CURRENT_DATE THEN sp.amount ELSE 0 END), 0)::bigint AS overdue_amount,
        COALESCE(SUM(CASE WHEN sp.due_date >= CURRENT_DATE THEN sp.amount ELSE 0 END), 0)::bigint AS pending_amount,
        MIN(sp.due_date)::text AS oldest_due_date,
        GREATEST((CURRENT_DATE - MIN(sp.due_date)::date)::int, 0) AS days_overdue,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date BETWEEN 0 AND 30 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_current,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date BETWEEN 31 AND 60 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date BETWEEN 61 AND 90 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - sp.due_date::date > 90 THEN sp.amount ELSE 0 END), 0)::bigint AS aging_90plus
      FROM sale_payments sp
      INNER JOIN sales s ON s.id = sp.sale_id
      INNER JOIN customers c ON c.id = s.customer_id
      ${whereClause}
      GROUP BY c.id, c.name, c.phone, c.email, c.allowed_payment_methods, c.credit_max_days
      ${havingClause}
    `;

    // Count query
    const countQuery = `SELECT COUNT(*)::int AS total FROM (${baseQuery}) AS debtors`;
    const countResult = await db.query(countQuery, queryParams);
    const total = countResult.rows[0]?.total || 0;

    // Totals query
    const totalsQuery = `
      SELECT
        COALESCE(SUM(total_debt), 0)::bigint AS total_debt,
        COALESCE(SUM(overdue_amount), 0)::bigint AS total_overdue,
        COALESCE(SUM(pending_amount), 0)::bigint AS total_pending,
        COUNT(*)::int AS debtor_count
      FROM (${baseQuery}) AS debtors
    `;
    const totalsResult = await db.query(totalsQuery, queryParams);
    const totalsRow = totalsResult.rows[0];

    // Data query with sort and pagination
    const dataQuery = `
      ${baseQuery}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...queryParams, limit, offset];
    const dataResult = await db.query(dataQuery, dataParams);

    const data: Debtor[] = dataResult.rows.map((row: any) => this.mapRowToDebtor(row));

    return {
      data,
      total,
      totals: {
        totalDebt: Number(totalsRow?.total_debt || 0),
        totalOverdue: Number(totalsRow?.total_overdue || 0),
        totalPending: Number(totalsRow?.total_pending || 0),
        debtorCount: Number(totalsRow?.debtor_count || 0),
      },
    };
  }

  /**
   * Mapeia uma row do banco para FinancialEntry
   */
  private mapRowToEntry = (row: any): FinancialEntry => {
    return {
      id: row.id,
      direction: row.direction,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceNumber: row.source_number,
      installmentNumber: Number(row.installment_number),
      amount: Number(row.amount),
      dueDate: row.due_date,
      paidDate: row.paid_date || undefined,
      status: row.status,
      paymentMethod: row.payment_method || undefined,
      notes: row.notes || undefined,
      entityId: row.entity_id || undefined,
      entityName: row.entity_name,
    };
  };

  /**
   * Mapeia uma row do banco para Debtor
   */
  private mapRowToDebtor = (row: any): Debtor => {
    const daysOverdue = Number(row.days_overdue || 0);
    const creditMaxDays = row.credit_max_days != null ? Number(row.credit_max_days) : null;

    return {
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone || undefined,
      customerEmail: row.customer_email || undefined,
      allowedPaymentMethods: row.allowed_payment_methods || [],
      creditMaxDays,
      totalDebt: Number(row.total_debt),
      overdueAmount: Number(row.overdue_amount),
      pendingAmount: Number(row.pending_amount),
      totalSales: Number(row.total_sales),
      oldestDueDate: row.oldest_due_date,
      daysOverdue,
      creditExpiresInDays: creditMaxDays !== null ? creditMaxDays - daysOverdue : null,
      isCreditExceeded: creditMaxDays !== null && daysOverdue > creditMaxDays,
      aging: {
        current: Number(row.aging_current),
        days30: Number(row.aging_30),
        days60: Number(row.aging_60),
        days90plus: Number(row.aging_90plus),
      },
    };
  };
}
