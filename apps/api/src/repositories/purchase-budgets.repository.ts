import { db } from '../config/database';
import type {
  PurchaseBudget,
  PurchaseBudgetItem,
  PurchaseBudgetQuote,
  PurchaseBudgetStatus,
  BudgetPriority,
} from '@ejr/shared-types';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class PurchaseBudgetsRepository {
  // ==================== BUDGETS ====================

  async findMany(params: {
    page: number;
    limit: number;
    status?: PurchaseBudgetStatus;
    priority?: BudgetPriority;
    supplierId?: string;
    createdBy?: string;
    search?: string;
  }) {
    const { page, limit, status, priority, supplierId, createdBy, search } = params;
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`pb.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    if (priority) {
      conditions.push(`pb.priority = $${paramIndex++}`);
      queryParams.push(priority);
    }
    if (supplierId) {
      conditions.push(`pb.supplier_id = $${paramIndex++}`);
      queryParams.push(supplierId);
    }
    if (createdBy) {
      conditions.push(`pb.created_by = $${paramIndex++}`);
      queryParams.push(createdBy);
    }
    if (search) {
      conditions.push(`(pb.title ILIKE $${paramIndex} OR pb.budget_number ILIKE $${paramIndex} OR pb.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM purchase_budgets pb ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const dataParams = [...queryParams, limit, offset];

    const result = await db.query(
      `SELECT pb.*,
        s.name as supplier_name,
        u.name as created_by_name, u.email as created_by_email,
        po.id as po_id, po.order_number as po_order_number, po.status as po_status
      FROM purchase_budgets pb
      LEFT JOIN suppliers s ON s.id = pb.supplier_id
      LEFT JOIN users u ON u.id = pb.created_by
      LEFT JOIN purchase_orders po ON po.purchase_budget_id = pb.id
      ${whereClause}
      ORDER BY pb.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    return {
      data: result.rows.map((row: any) => {
        const budget = this.mapToBudget(row);
        if (row.po_id) {
          budget.purchaseOrder = {
            id: row.po_id,
            orderNumber: row.po_order_number,
            status: row.po_status,
          };
        }
        return budget;
      }),
      total,
    };
  }

  async findById(id: string): Promise<PurchaseBudget | null> {
    const result = await db.query(
      `SELECT pb.*,
        s.name as supplier_name,
        u.name as created_by_name, u.email as created_by_email,
        ua.name as approved_by_name, ua.email as approved_by_email,
        up.name as purchased_by_name, up.email as purchased_by_email
      FROM purchase_budgets pb
      LEFT JOIN suppliers s ON s.id = pb.supplier_id
      LEFT JOIN users u ON u.id = pb.created_by
      LEFT JOIN users ua ON ua.id = pb.approved_by
      LEFT JOIN users up ON up.id = pb.purchased_by
      WHERE pb.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const budget = this.mapToBudget(result.rows[0]);

    // Fetch items with quotes
    const items = await this.getItems(id);
    budget.items = items;

    // Fetch linked purchase order if exists
    const poResult = await db.query(
      'SELECT id, order_number, status FROM purchase_orders WHERE purchase_budget_id = $1 LIMIT 1',
      [id]
    );
    if (poResult.rows.length > 0) {
      budget.purchaseOrder = {
        id: poResult.rows[0].id,
        orderNumber: poResult.rows[0].order_number,
        status: poResult.rows[0].status,
      };
    }

    return budget;
  }

  async create(data: {
    title: string;
    description?: string;
    justification?: string;
    priority?: BudgetPriority;
    department?: string;
    supplierId?: string;
    paymentTerms?: string;
    leadTimeDays?: number;
    currency?: string;
    exchangeRate1?: number;
    exchangeRate2?: number;
    exchangeRate3?: number;
    additionalCosts?: any[];
    manufacturers?: string[];
    createdBy: string;
    items?: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      notes?: string;
    }>;
  }): Promise<PurchaseBudget> {
    const id = generateId('pb');

    const numberResult = await db.query('SELECT generate_budget_number() as budget_number');
    const budgetNumber = numberResult.rows[0].budget_number;

    await db.query(
      `INSERT INTO purchase_budgets (
        id, budget_number, title, description, justification,
        priority, department, status, created_by, supplier_id,
        payment_terms, lead_time_days,
        currency, exchange_rate_1, exchange_rate_2, exchange_rate_3, additional_costs, manufacturers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id,
        budgetNumber,
        data.title,
        data.description || null,
        data.justification || null,
        data.priority || 'NORMAL',
        data.department || null,
        data.createdBy,
        data.supplierId || null,
        data.paymentTerms || null,
        data.leadTimeDays || null,
        data.currency || 'BRL',
        data.exchangeRate1 || 0,
        data.exchangeRate2 || 0,
        data.exchangeRate3 || 0,
        JSON.stringify(data.additionalCosts || []),
        JSON.stringify(data.manufacturers || []),
      ]
    );

    // Create items if provided
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await this.addItem(id, item);
      }
    }

    return (await this.findById(id))!;
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    justification?: string;
    priority?: BudgetPriority;
    department?: string;
    supplierId?: string;
    paymentTerms?: string;
    leadTimeDays?: number;
    currency?: string;
    exchangeRate1?: number;
    exchangeRate2?: number;
    exchangeRate3?: number;
    additionalCosts?: any[];
    manufacturers?: string[];
  }): Promise<PurchaseBudget> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      queryParams.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      queryParams.push(data.description);
    }
    if (data.justification !== undefined) {
      setClauses.push(`justification = $${paramIndex++}`);
      queryParams.push(data.justification);
    }
    if (data.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      queryParams.push(data.priority);
    }
    if (data.department !== undefined) {
      setClauses.push(`department = $${paramIndex++}`);
      queryParams.push(data.department);
    }
    if (data.supplierId !== undefined) {
      setClauses.push(`supplier_id = $${paramIndex++}`);
      queryParams.push(data.supplierId || null);
    }
    if (data.paymentTerms !== undefined) {
      setClauses.push(`payment_terms = $${paramIndex++}`);
      queryParams.push(data.paymentTerms || null);
    }
    if (data.leadTimeDays !== undefined) {
      setClauses.push(`lead_time_days = $${paramIndex++}`);
      queryParams.push(data.leadTimeDays || null);
    }
    if (data.currency !== undefined) {
      setClauses.push(`currency = $${paramIndex++}`);
      queryParams.push(data.currency);
    }
    if (data.exchangeRate1 !== undefined) {
      setClauses.push(`exchange_rate_1 = $${paramIndex++}`);
      queryParams.push(data.exchangeRate1);
    }
    if (data.exchangeRate2 !== undefined) {
      setClauses.push(`exchange_rate_2 = $${paramIndex++}`);
      queryParams.push(data.exchangeRate2);
    }
    if (data.exchangeRate3 !== undefined) {
      setClauses.push(`exchange_rate_3 = $${paramIndex++}`);
      queryParams.push(data.exchangeRate3);
    }
    if (data.additionalCosts !== undefined) {
      setClauses.push(`additional_costs = $${paramIndex++}`);
      queryParams.push(JSON.stringify(data.additionalCosts));
    }
    if (data.manufacturers !== undefined) {
      setClauses.push(`manufacturers = $${paramIndex++}`);
      queryParams.push(JSON.stringify(data.manufacturers));
    }

    if (setClauses.length > 0) {
      queryParams.push(id);
      await db.query(
        `UPDATE purchase_budgets SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        queryParams
      );
    }

    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await db.query('DELETE FROM purchase_budgets WHERE id = $1', [id]);
    return { success: true };
  }

  async updateStatus(id: string, status: PurchaseBudgetStatus, extra?: Record<string, any>): Promise<PurchaseBudget> {
    const setClauses = ['status = $1'];
    const queryParams: any[] = [status];
    let paramIndex = 2;

    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setClauses.push(`${snakeKey} = $${paramIndex++}`);
        queryParams.push(value);
      }
    }

    queryParams.push(id);
    await db.query(
      `UPDATE purchase_budgets SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      queryParams
    );

    return (await this.findById(id))!;
  }

  async recalculateTotal(budgetId: string): Promise<void> {
    // Sum selected quotes for each item
    const subtotalResult = await db.query(
      `SELECT COALESCE(SUM(ROUND(q.unit_price * i.quantity)), 0) as subtotal
       FROM purchase_budget_items i
       LEFT JOIN purchase_budget_quotes q ON q.id = i.selected_quote_id
       WHERE i.budget_id = $1`,
      [budgetId]
    );
    const subtotal = parseInt(subtotalResult.rows[0].subtotal) || 0;

    // Get additional costs percentage
    const costsResult = await db.query(
      'SELECT additional_costs FROM purchase_budgets WHERE id = $1',
      [budgetId]
    );
    const costs = costsResult.rows[0]?.additional_costs || [];
    const totalPct = costs.reduce((s: number, c: any) => s + (c.percentage || 0), 0);

    // Apply additional costs: total = subtotal * (1 + totalPercentage / 100)
    const total = Math.round(subtotal * (1 + totalPct / 100));

    await db.query(
      'UPDATE purchase_budgets SET total_amount = $1 WHERE id = $2',
      [total, budgetId]
    );
  }

  // ==================== INSTALLMENTS ====================

  async payInstallment(budgetId: string, installmentId: string, paidDate: string): Promise<PurchaseBudget> {
    await db.query(
      `UPDATE purchase_budgets
       SET payment_installments = (
         SELECT jsonb_agg(
           CASE
             WHEN elem->>'id' = $2
             THEN elem || jsonb_build_object('status', 'PAID', 'paidDate', $3::text)
             ELSE elem
           END
         )
         FROM jsonb_array_elements(payment_installments) AS elem
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [budgetId, installmentId, paidDate]
    );

    return (await this.findById(budgetId))!;
  }

  // ==================== ITEMS ====================

  async getItems(budgetId: string): Promise<PurchaseBudgetItem[]> {
    const result = await db.query(
      `SELECT i.*, p.name as db_product_name, p.factory_code as product_factory_code
       FROM purchase_budget_items i
       LEFT JOIN products p ON p.id = i.product_id
       WHERE i.budget_id = $1
       ORDER BY i.created_at ASC`,
      [budgetId]
    );

    const items: PurchaseBudgetItem[] = [];
    for (const row of result.rows) {
      const quotes = await this.getQuotes(row.id);
      items.push({
        id: row.id,
        budgetId: row.budget_id,
        productId: row.product_id,
        productName: row.product_name || row.db_product_name || '',
        factoryCode: row.product_factory_code || undefined,
        quantity: row.quantity,
        unit: row.unit || 'UNIT',
        notes: row.notes,
        selectedQuoteId: row.selected_quote_id,
        quotes,
        createdAt: row.created_at,
      });
    }

    return items;
  }

  async addItem(budgetId: string, data: {
    productId?: string;
    productName: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }): Promise<PurchaseBudgetItem> {
    const id = generateId('pbi');

    await db.query(
      `INSERT INTO purchase_budget_items (
        id, budget_id, product_id, product_name, quantity, unit, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        budgetId,
        data.productId || null,
        data.productName,
        data.quantity,
        data.unit || 'UNIT',
        data.notes || null,
      ]
    );

    return {
      id,
      budgetId,
      productId: data.productId,
      productName: data.productName,
      quantity: data.quantity,
      unit: data.unit || 'UNIT',
      notes: data.notes,
      selectedQuoteId: undefined,
      quotes: [],
      createdAt: new Date().toISOString(),
    };
  }

  async updateItem(itemId: string, data: {
    productId?: string;
    productName?: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }): Promise<void> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (data.productId !== undefined) {
      setClauses.push(`product_id = $${paramIndex++}`);
      queryParams.push(data.productId || null);
    }
    if (data.productName !== undefined) {
      setClauses.push(`product_name = $${paramIndex++}`);
      queryParams.push(data.productName);
    }
    if (data.quantity !== undefined) {
      setClauses.push(`quantity = $${paramIndex++}`);
      queryParams.push(data.quantity);
    }
    if (data.unit !== undefined) {
      setClauses.push(`unit = $${paramIndex++}`);
      queryParams.push(data.unit);
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      queryParams.push(data.notes);
    }

    if (setClauses.length > 0) {
      queryParams.push(itemId);
      await db.query(
        `UPDATE purchase_budget_items SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        queryParams
      );
    }
  }

  async deleteItem(itemId: string): Promise<{ success: boolean }> {
    await db.query('DELETE FROM purchase_budget_items WHERE id = $1', [itemId]);
    return { success: true };
  }

  async getItemBudgetId(itemId: string): Promise<string | null> {
    const result = await db.query(
      'SELECT budget_id FROM purchase_budget_items WHERE id = $1',
      [itemId]
    );
    return result.rows[0]?.budget_id || null;
  }

  async selectQuote(itemId: string, quoteId: string): Promise<void> {
    await db.query(
      'UPDATE purchase_budget_items SET selected_quote_id = $1 WHERE id = $2',
      [quoteId, itemId]
    );
  }

  // ==================== QUOTES ====================

  async getQuotes(itemId: string): Promise<PurchaseBudgetQuote[]> {
    const result = await db.query(
      `SELECT q.*, s.name as supplier_name
       FROM purchase_budget_quotes q
       LEFT JOIN suppliers s ON s.id = q.supplier_id
       WHERE q.item_id = $1
       ORDER BY q.unit_price ASC`,
      [itemId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      itemId: row.item_id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      unitPrice: parseFloat(row.unit_price) || 0,
      leadTimeDays: row.lead_time_days,
      paymentTerms: row.payment_terms,
      validityDate: row.validity_date,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  async addQuote(itemId: string, data: {
    supplierId: string;
    unitPrice: number;
    leadTimeDays?: number;
    paymentTerms?: string;
    validityDate?: string;
    notes?: string;
  }): Promise<PurchaseBudgetQuote> {
    const id = generateId('pbq');

    await db.query(
      `INSERT INTO purchase_budget_quotes (
        id, item_id, supplier_id, unit_price, lead_time_days,
        payment_terms, validity_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        itemId,
        data.supplierId,
        data.unitPrice,
        data.leadTimeDays || null,
        data.paymentTerms || null,
        data.validityDate || null,
        data.notes || null,
      ]
    );

    const supplierResult = await db.query('SELECT name FROM suppliers WHERE id = $1', [data.supplierId]);

    return {
      id,
      itemId,
      supplierId: data.supplierId,
      supplierName: supplierResult.rows[0]?.name,
      unitPrice: data.unitPrice,
      leadTimeDays: data.leadTimeDays,
      paymentTerms: data.paymentTerms,
      validityDate: data.validityDate,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
  }

  async updateQuote(quoteId: string, data: {
    unitPrice?: number;
    leadTimeDays?: number;
    paymentTerms?: string;
    validityDate?: string;
    notes?: string;
  }): Promise<void> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (data.unitPrice !== undefined) {
      setClauses.push(`unit_price = $${paramIndex++}`);
      queryParams.push(data.unitPrice);
    }
    if (data.leadTimeDays !== undefined) {
      setClauses.push(`lead_time_days = $${paramIndex++}`);
      queryParams.push(data.leadTimeDays);
    }
    if (data.paymentTerms !== undefined) {
      setClauses.push(`payment_terms = $${paramIndex++}`);
      queryParams.push(data.paymentTerms);
    }
    if (data.validityDate !== undefined) {
      setClauses.push(`validity_date = $${paramIndex++}`);
      queryParams.push(data.validityDate);
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      queryParams.push(data.notes);
    }

    if (setClauses.length > 0) {
      queryParams.push(quoteId);
      await db.query(
        `UPDATE purchase_budget_quotes SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        queryParams
      );
    }
  }

  async deleteQuote(quoteId: string): Promise<{ success: boolean }> {
    // Clear selected_quote_id if this was the selected quote
    await db.query(
      'UPDATE purchase_budget_items SET selected_quote_id = NULL WHERE selected_quote_id = $1',
      [quoteId]
    );
    await db.query('DELETE FROM purchase_budget_quotes WHERE id = $1', [quoteId]);
    return { success: true };
  }

  async getQuoteItemId(quoteId: string): Promise<string | null> {
    const result = await db.query(
      'SELECT item_id FROM purchase_budget_quotes WHERE id = $1',
      [quoteId]
    );
    return result.rows[0]?.item_id || null;
  }

  // ==================== MAPPER ====================

  private mapToBudget(data: any): PurchaseBudget {
    return {
      id: data.id,
      budgetNumber: data.budget_number,
      title: data.title,
      description: data.description,
      justification: data.justification,
      priority: data.priority,
      department: data.department,
      supplierId: data.supplier_id,
      supplierName: data.supplier_name,
      status: data.status,
      totalAmount: data.total_amount,
      approvedBy: data.approved_by,
      approvedByUser: data.approved_by_name ? { name: data.approved_by_name, email: data.approved_by_email } : undefined,
      approvedAt: data.approved_at,
      rejectionReason: data.rejection_reason,
      purchasedBy: data.purchased_by,
      purchasedByUser: data.purchased_by_name ? { name: data.purchased_by_name, email: data.purchased_by_email } : undefined,
      purchasedAt: data.purchased_at,
      invoiceNumber: data.invoice_number,
      finalAmount: data.final_amount,
      paymentMethod: data.payment_method || undefined,
      paymentInstallments: data.payment_installments || [],
      paymentTerms: data.payment_terms || undefined,
      leadTimeDays: data.lead_time_days ? parseInt(data.lead_time_days) : undefined,
      currency: data.currency || 'BRL',
      exchangeRate1: parseFloat(data.exchange_rate_1) || 0,
      exchangeRate2: parseFloat(data.exchange_rate_2) || 0,
      exchangeRate3: parseFloat(data.exchange_rate_3) || 0,
      additionalCosts: data.additional_costs || [],
      manufacturers: data.manufacturers || [],
      createdBy: data.created_by,
      createdByUser: data.created_by_name ? { name: data.created_by_name, email: data.created_by_email } : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
