import { db } from '../config/database';
import type {
  Sale,
  SaleItem,
  SalePayment,
  SaleStatus,
  PaymentStatus,
  CreateSaleDTO,
  UpdateSaleDTO,
  SaleFilters,
  SaleStats,
  CreateSalePaymentDTO,
  UpdateSalePaymentDTO,
} from '@ejr/shared-types';

export class SalesRepository {
  /**
   * Listar vendas com filtros e paginação
   */
  async findAll(filters: SaleFilters) {
    const {
      page = 1,
      limit = 20,
      customerId,
      status,
      startDate,
      endDate,
      search,
    } = filters;

    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (search) {
      conditions.push(`s.sale_number ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (customerId) {
      conditions.push(`s.customer_id = $${paramIndex}`);
      queryParams.push(customerId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`s.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`s.sale_date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`s.sale_date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (filters.sellerId) {
      conditions.push(`s.created_by = $${paramIndex}`);
      queryParams.push(filters.sellerId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sales s
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Main query with joins
    const query = `
      SELECT
        s.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.document as customer_document,
        u.id as created_by_user_id,
        u.name as created_by_user_name,
        u.email as created_by_user_email
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(query, queryParams);

    // Fetch items and payments for each sale
    const sales = await Promise.all(
      result.rows.map(async (row) => {
        const itemsResult = await db.query(
          `
          SELECT
            si.*,
            p.id as product_id,
            p.code as product_code,
            p.name as product_name,
            p.current_stock as product_current_stock
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = $1
          `,
          [row.id]
        );

        const paymentsResult = await db.query(
          'SELECT * FROM sale_payments WHERE sale_id = $1',
          [row.id]
        );

        return this.mapToSale({
          ...row,
          customer: {
            id: row.customer_id,
            name: row.customer_name,
            email: row.customer_email,
            phone: row.customer_phone,
            document: row.customer_document,
          },
          items: itemsResult.rows.map((item) => ({
            ...item,
            product: item.product_id ? {
              id: item.product_id,
              code: item.product_code,
              name: item.product_name,
              current_stock: item.product_current_stock,
            } : null,
          })),
          payments: paymentsResult.rows,
          created_by_user: row.created_by_user_id ? {
            id: row.created_by_user_id,
            name: row.created_by_user_name,
            email: row.created_by_user_email,
          } : null,
        });
      })
    );

    return {
      data: sales,
      total,
    };
  }

  /**
   * Buscar venda por ID
   */
  async findById(id: string): Promise<Sale | null> {
    const query = `
      SELECT
        s.*,
        row_to_json(c.*) as customer,
        row_to_json(u.*) as created_by_user
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const sale = result.rows[0];

    // Fetch items with products
    const itemsResult = await db.query(
      `
      SELECT
        si.*,
        row_to_json(p.*) as product
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
      `,
      [id]
    );

    // Fetch payments
    const paymentsResult = await db.query(
      'SELECT * FROM sale_payments WHERE sale_id = $1',
      [id]
    );

    return this.mapToSale({
      ...sale,
      items: itemsResult.rows,
      payments: paymentsResult.rows,
    });
  }

  /**
   * Criar nova venda
   */
  async create(saleData: CreateSaleDTO, userId: string): Promise<Sale> {
    await db.query('BEGIN');

    try {
    const saleNumber = await this.generateSaleNumber();

    // Calcular totais
    let subtotal = 0;
    const items = saleData.items.map((item) => {
      const itemDiscount = item.discount || 0;
      const itemTotal = item.quantity * item.unitPrice - itemDiscount;
      subtotal += itemTotal;
      return { ...item, discount: itemDiscount, total: itemTotal };
    });

    const discount = saleData.discount || 0;
    const total = subtotal - discount;
    const installments = saleData.installments || 1;

    // Gerar ID único
    const id = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Inserir venda
    const insertSaleQuery = `
      INSERT INTO sales (
        id, sale_number, customer_id, quote_id, status, sale_date, due_date,
        subtotal, discount, total, total_paid, total_pending, installments,
        notes, internal_notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const saleResult = await db.query(insertSaleQuery, [
      id,
      saleNumber,
      saleData.customerId,
      saleData.quoteId || null,
      'PENDING',
      saleData.saleDate,
      saleData.dueDate || null,
      subtotal,
      discount,
      total,
      0,
      total,
      installments,
      saleData.notes || null,
      saleData.internalNotes || null,
      userId,
    ]);

    const createdSale = saleResult.rows[0];

    // Inserir items
    for (const item of items) {
      const itemId = `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const insertItemQuery = `
        INSERT INTO sale_items (
          id, sale_id, item_type, product_id, service_name, service_description,
          quantity, unit_price, discount, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await db.query(insertItemQuery, [
        itemId,
        createdSale.id,
        item.itemType,
        item.productId || null,
        item.serviceName || null,
        item.serviceDescription || null,
        item.quantity,
        item.unitPrice,
        item.discount,
        item.total,
      ]);
    }

    // Criar parcelas de pagamento
    const amountPerInstallment = Math.floor(total / installments);
    const remainder = total - amountPerInstallment * installments;
    const saleDate = new Date(saleData.saleDate);
    const dueDate = saleData.dueDate ? new Date(saleData.dueDate) : saleDate;

    for (let i = 0; i < installments; i++) {
      const installmentDueDate = new Date(dueDate);
      installmentDueDate.setMonth(dueDate.getMonth() + i);

      let installmentAmount = amountPerInstallment;
      // Adicionar o resto na primeira parcela
      if (i === 0) {
        installmentAmount += remainder;
      }

      const paymentId = `spay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
      const insertPaymentQuery = `
        INSERT INTO sale_payments (
          id, sale_id, installment_number, payment_method, amount, due_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await db.query(insertPaymentQuery, [
        paymentId,
        createdSale.id,
        i + 1,
        saleData.paymentMethod,
        installmentAmount,
        installmentDueDate.toISOString().split('T')[0],
        'PENDING',
      ]);
    }

    // Atualizar estoque dos produtos
    for (const item of items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        const stockQuery = `
          SELECT update_product_stock(
            $1::TEXT, $2::INTEGER, $3::TEXT, $4::VARCHAR, $5::TEXT, $6::TEXT, $7::VARCHAR
          )
        `;

        await db.query(stockQuery, [
          item.productId,
          -item.quantity,
          userId,
          'SALE',
          `Venda ${saleNumber}`,
          createdSale.id,
          'SALE',
        ]);
      }
    }

    // Se foi criado a partir de um orçamento, marcar como convertido
    if (saleData.quoteId) {
      try {
        await db.query(
          'UPDATE quotes SET status = $1 WHERE id = $2',
          ['CONVERTED', saleData.quoteId]
        );
      } catch (error) {
        console.error('Erro ao atualizar status do orçamento:', error);
      }
    }

    // Buscar venda completa
    const sale = await this.findById(createdSale.id);
    if (!sale) {
      throw new Error('Erro ao buscar venda criada');
    }

    await db.query('COMMIT');

    return sale;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Atualizar venda
   */
  async update(id: string, saleData: UpdateSaleDTO): Promise<Sale> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (saleData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(saleData.status);
      paramIndex++;
    }
    if (saleData.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(saleData.dueDate);
      paramIndex++;
    }
    if (saleData.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(saleData.notes);
      paramIndex++;
    }
    if (saleData.internalNotes !== undefined) {
      updates.push(`internal_notes = $${paramIndex}`);
      values.push(saleData.internalNotes);
      paramIndex++;
    }

    if (updates.length === 0) {
      const sale = await this.findById(id);
      if (!sale) {
        throw new Error('Venda não encontrada');
      }
      return sale;
    }

    const query = `
      UPDATE sales
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    values.push(id);

    await db.query(query, values);

    const sale = await this.findById(id);
    if (!sale) {
      throw new Error('Venda não encontrada após atualização');
    }

    return sale;
  }

  /**
   * Deletar venda
   */
  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM sales WHERE id = $1', [id]);
  }

  /**
   * Restaurar estoque dos produtos de uma venda cancelada
   */
  async restoreStock(saleId: string, userId: string): Promise<void> {
    // Buscar items da venda que são produtos
    const itemsResult = await db.query(
      'SELECT * FROM sale_items WHERE sale_id = $1 AND item_type = \'PRODUCT\' AND product_id IS NOT NULL',
      [saleId]
    );

    // Buscar sale_number da venda
    const saleResult = await db.query(
      'SELECT sale_number FROM sales WHERE id = $1',
      [saleId]
    );
    const saleNumber = saleResult.rows[0]?.sale_number || saleId;

    // Para cada item, devolver o estoque (quantidade POSITIVA + movement_type SALE_CANCELLED)
    for (const item of itemsResult.rows) {
      await db.query(
        'SELECT update_product_stock($1::TEXT, $2::INTEGER, $3::TEXT, $4::TEXT, $5::TEXT, $6::TEXT, $7::TEXT)',
        [
          item.product_id,
          item.quantity,
          userId,
          'SALE_CANCELLED',
          `Cancelamento venda ${saleNumber}`,
          saleId,
          'SALE',
        ]
      );
    }
  }

  /**
   * Adicionar pagamento a uma parcela
   */
  async addPayment(
    saleId: string,
    paymentData: CreateSalePaymentDTO
  ): Promise<SalePayment> {
    const id = `spay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO sale_payments (
        id, sale_id, installment_number, payment_method, amount, due_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      saleId,
      paymentData.installmentNumber,
      paymentData.paymentMethod,
      paymentData.amount,
      paymentData.dueDate,
      'PENDING',
      paymentData.notes || null,
    ]);

    // Atualizar totais da venda
    await this.recalculateSaleTotals(saleId);

    return this.mapToPayment(result.rows[0]);
  }

  /**
   * Atualizar pagamento
   */
  async updatePayment(
    paymentId: string,
    paymentData: UpdateSalePaymentDTO
  ): Promise<SalePayment> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (paymentData.paidDate !== undefined) {
      updates.push(`paid_date = $${paramIndex}`);
      values.push(paymentData.paidDate);
      paramIndex++;
    }
    if (paymentData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(paymentData.status);
      paramIndex++;
    }
    if (paymentData.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(paymentData.notes);
      paramIndex++;
    }

    if (updates.length > 0) {
      const query = `
        UPDATE sale_payments
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(paymentId);

      const result = await db.query(query, values);

      // Buscar sale_id do pagamento
      const paymentResult = await db.query(
        'SELECT sale_id FROM sale_payments WHERE id = $1',
        [paymentId]
      );

      if (paymentResult.rows.length > 0) {
        await this.recalculateSaleTotals(paymentResult.rows[0].sale_id);
      }

      return this.mapToPayment(result.rows[0]);
    }

    // Se não há atualizações, apenas retornar o pagamento atual
    const result = await db.query(
      'SELECT * FROM sale_payments WHERE id = $1',
      [paymentId]
    );

    return this.mapToPayment(result.rows[0]);
  }

  /**
   * Obter estatísticas de vendas
   */
  async getStats(filters?: SaleFilters): Promise<SaleStats> {
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters?.startDate) {
      conditions.push(`sale_date >= $${paramIndex}`);
      queryParams.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      conditions.push(`sale_date <= $${paramIndex}`);
      queryParams.push(filters.endDate);
      paramIndex++;
    }

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramIndex}`);
      queryParams.push(filters.customerId);
      paramIndex++;
    }

    if (filters?.sellerId) {
      conditions.push(`created_by = $${paramIndex}`);
      queryParams.push(filters.sellerId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT * FROM sales ${whereClause}`;
    const result = await db.query(query, queryParams);
    const sales = result.rows;

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalPaid = sales.reduce((sum, s) => sum + s.total_paid, 0);
    const totalPending = sales.reduce((sum, s) => sum + s.total_pending, 0);

    // Total atrasado (vendas com status OVERDUE)
    const totalOverdue = sales
      .filter((s) => s.status === 'OVERDUE')
      .reduce((sum, s) => sum + s.total_pending, 0);

    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Vendas por status
    const salesByStatus = sales.reduce(
      (acc, s) => {
        acc[s.status as SaleStatus] = (acc[s.status as SaleStatus] || 0) + 1;
        return acc;
      },
      {} as Record<SaleStatus, number>
    );

    // Receita por mês
    const revenueByMonth: Array<{ month: string; revenue: number; count: number }> = [];
    const monthsMap = new Map<string, { revenue: number; count: number }>();

    sales.forEach((sale) => {
      const month = new Date(sale.sale_date).toISOString().substring(0, 7); // YYYY-MM
      const existing = monthsMap.get(month) || { revenue: 0, count: 0 };
      monthsMap.set(month, {
        revenue: existing.revenue + sale.total,
        count: existing.count + 1,
      });
    });

    monthsMap.forEach((value, key) => {
      revenueByMonth.push({ month: key, ...value });
    });

    // Top clientes
    const topCustomersQuery = `
      SELECT
        get_top_customers(
          $1::DATE,
          $2::DATE,
          $3::INTEGER
        ) as result
    `;

    const topCustomersResult = await db.query(topCustomersQuery, [
      filters?.startDate || null,
      filters?.endDate || null,
      10,
    ]);

    const topCustomers = topCustomersResult.rows[0]?.result || [];

    return {
      totalSales,
      totalRevenue,
      totalPaid,
      totalPending,
      totalOverdue,
      averageTicket,
      salesByStatus,
      revenueByMonth: revenueByMonth.sort((a, b) => a.month.localeCompare(b.month)),
      topCustomers,
    };
  }

  /**
   * Gerar número da venda
   */
  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VND-${year}-`;

    const query = `
      SELECT sale_number
      FROM sales
      WHERE sale_number LIKE $1
      ORDER BY sale_number DESC
      LIMIT 1
    `;

    const result = await db.query(query, [`${prefix}%`]);

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = parseInt(result.rows[0].sale_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Recalcular totais de pagamentos da venda
   */
  private async recalculateSaleTotals(saleId: string): Promise<void> {
    const paymentsResult = await db.query(
      'SELECT * FROM sale_payments WHERE sale_id = $1',
      [saleId]
    );

    const payments = paymentsResult.rows;
    if (!payments.length) return;

    const totalPaid = payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    const saleResult = await db.query(
      'SELECT total FROM sales WHERE id = $1',
      [saleId]
    );

    if (saleResult.rows.length === 0) return;

    const sale = saleResult.rows[0];
    const totalPending = sale.total - totalPaid;

    // Determinar status
    let status: SaleStatus;
    if (totalPaid === 0) {
      // Verificar se está atrasado
      const hasOverdue = payments.some(
        (p) =>
          p.status === 'PENDING' &&
          new Date(p.due_date) < new Date() &&
          !p.paid_date
      );
      status = hasOverdue ? ('OVERDUE' as SaleStatus) : ('PENDING' as SaleStatus);
    } else if (totalPaid >= sale.total) {
      status = 'PAID' as SaleStatus;
    } else {
      status = 'PARTIAL' as SaleStatus;
    }

    await db.query(
      `UPDATE sales
       SET total_paid = $1, total_pending = $2, status = $3
       WHERE id = $4`,
      [totalPaid, totalPending, status, saleId]
    );
  }

  /**
   * Mapear dados do banco para Sale
   */
  private mapToSale(data: any): Sale {
    return {
      id: data.id,
      saleNumber: data.sale_number,
      customerId: data.customer_id,
      quoteId: data.quote_id || undefined,
      status: data.status,
      saleDate: data.sale_date,
      dueDate: data.due_date || undefined,
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      totalPaid: data.total_paid,
      totalPending: data.total_pending,
      installments: data.installments,
      notes: data.notes || undefined,
      internalNotes: data.internal_notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      customer: data.customer
        ? {
            id: data.customer.id,
            name: data.customer.name,
            email: data.customer.email || undefined,
            phone: data.customer.phone || undefined,
            document: data.customer.document || undefined,
          }
        : undefined,
      items: data.items
        ? data.items.map((item: any) => this.mapToItem(item))
        : undefined,
      payments: data.payments
        ? data.payments.map((payment: any) => this.mapToPayment(payment))
        : undefined,
      createdByUser: data.created_by_user
        ? {
            id: data.created_by_user.id,
            name: data.created_by_user.name,
            email: data.created_by_user.email,
          }
        : undefined,
    };
  }

  /**
   * Mapear dados do banco para SaleItem
   */
  private mapToItem(data: any): SaleItem {
    return {
      id: data.id,
      saleId: data.sale_id,
      itemType: data.item_type,
      productId: data.product_id || undefined,
      serviceName: data.service_name || undefined,
      serviceDescription: data.service_description || undefined,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      discount: data.discount,
      total: data.total,
      product: data.product
        ? {
            id: data.product.id,
            code: data.product.code,
            name: data.product.name,
            currentStock: data.product.current_stock,
          }
        : undefined,
    };
  }

  /**
   * Mapear dados do banco para SalePayment
   */
  private mapToPayment(data: any): SalePayment {
    return {
      id: data.id,
      saleId: data.sale_id,
      installmentNumber: data.installment_number,
      paymentMethod: data.payment_method,
      amount: data.amount,
      dueDate: data.due_date,
      paidDate: data.paid_date || undefined,
      status: data.status,
      notes: data.notes || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
