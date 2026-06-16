import { PurchaseBudgetsRepository } from '../repositories/purchase-budgets.repository';
import { ApprovalDelegationsRepository } from '../repositories/approval-delegations.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import type {
  PurchaseBudgetStatus,
  BudgetPriority,
  CreatePurchaseBudgetDTO,
  UpdatePurchaseBudgetDTO,
  CreateBudgetItemDTO,
  UpdateBudgetItemDTO,
  CreateBudgetQuoteDTO,
  UpdateBudgetQuoteDTO,
} from '@ejr/shared-types';
import { db } from '../config/database';

export class PurchaseBudgetsService {
  private repository: PurchaseBudgetsRepository;
  private delegationsRepo: ApprovalDelegationsRepository;
  private notificationsRepo: NotificationsRepository;

  constructor() {
    this.repository = new PurchaseBudgetsRepository();
    this.delegationsRepo = new ApprovalDelegationsRepository();
    this.notificationsRepo = new NotificationsRepository();
  }

  // ==================== BUDGETS ====================

  async findMany(params: {
    page?: number;
    limit?: number;
    status?: PurchaseBudgetStatus;
    priority?: BudgetPriority;
    supplierId?: string;
    createdBy?: string;
    search?: string;
  }) {
    return this.repository.findMany({
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status,
      priority: params.priority,
      supplierId: params.supplierId,
      createdBy: params.createdBy,
      search: params.search,
    });
  }

  async findById(id: string) {
    const budget = await this.repository.findById(id);
    if (!budget) {
      throw Object.assign(new Error('Orçamento não encontrado'), { statusCode: 404, code: 'BUDGET_NOT_FOUND' });
    }
    return budget;
  }

  async create(data: CreatePurchaseBudgetDTO & { createdBy: string }) {
    return this.repository.create(data);
  }

  // Status em que o orçamento ainda pode ser editado (preços/itens/quantidade).
  // DRAFT = rascunho; PENDING = enviado para aprovação (indústria pode devolver
  // proposta atualizada e precisamos ajustar SEM recriar o orçamento — Demanda 3).
  private static readonly EDITABLE_STATUSES = ['DRAFT', 'PENDING', 'ORDERED'];

  private assertEditable(status: string, entity: string) {
    if (!PurchaseBudgetsService.EDITABLE_STATUSES.includes(status)) {
      throw Object.assign(
        new Error(`${entity} só pode ser alterado enquanto o orçamento está em rascunho ou aguardando aprovação`),
        { statusCode: 400, code: 'INVALID_STATUS' }
      );
    }
  }

  async update(id: string, data: UpdatePurchaseBudgetDTO, userId?: string) {
    const budget = await this.findById(id);
    this.assertEditable(budget.status, 'O orçamento');

    // Log de histórico dos campos alterados (valor anterior → novo)
    const tracked: Record<string, any> = {
      title: budget.title,
      description: (budget as any).description,
      supplierId: (budget as any).supplierId,
      paymentTerms: (budget as any).paymentTerms,
      leadTimeDays: (budget as any).leadTimeDays,
      priority: (budget as any).priority,
      department: (budget as any).department,
    };
    for (const [field, oldVal] of Object.entries(tracked)) {
      if ((data as any)[field] !== undefined && String((data as any)[field] ?? '') !== String(oldVal ?? '')) {
        await this.repository.logHistory({
          budgetId: id, userId, action: 'BUDGET_UPDATE', field,
          oldValue: oldVal == null ? null : String(oldVal),
          newValue: (data as any)[field] == null ? null : String((data as any)[field]),
        });
      }
    }

    await this.repository.update(id, data);
    // Recalculate total if additional costs changed
    if (data.additionalCosts !== undefined) {
      await this.repository.recalculateTotal(id);
    }
    return this.repository.findById(id) as any;
  }

  async getHistory(id: string) {
    await this.findById(id); // garante que existe (404 se não)
    return this.repository.getHistory(id);
  }

  async delete(id: string) {
    const budget = await this.findById(id);
    if (['PURCHASED', 'RECEIVED'].includes(budget.status)) {
      throw Object.assign(new Error('Não é possível excluir orçamentos comprados ou recebidos'), { statusCode: 400, code: 'CANNOT_DELETE' });
    }
    return this.repository.delete(id);
  }

  // ==================== STATUS TRANSITIONS ====================

  async submit(id: string, userId: string) {
    const budget = await this.findById(id);
    if (budget.status !== 'DRAFT') {
      throw Object.assign(new Error('Somente rascunhos podem ser enviados para aprovação'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    // Validate: all items must have at least one quote
    if (!budget.items || budget.items.length === 0) {
      throw Object.assign(new Error('O orçamento precisa ter pelo menos um item'), { statusCode: 400, code: 'NO_ITEMS' });
    }

    for (const item of budget.items) {
      if (!item.quotes || item.quotes.length === 0) {
        throw Object.assign(new Error(`O item "${item.productName}" precisa ter pelo menos uma cotação`), { statusCode: 400, code: 'NO_QUOTES' });
      }
    }

    if (!budget.supplierId) {
      throw Object.assign(new Error('Defina o fornecedor do orçamento antes de enviar'), { statusCode: 400, code: 'NO_SUPPLIER' });
    }

    const result = await this.repository.updateStatus(id, 'PENDING');

    // Notify admins and active delegates
    await this.notifyApprovers(budget.budgetNumber);

    return result;
  }

  async approve(id: string, userId: string, userRole: string) {
    const budget = await this.findById(id);
    if (budget.status !== 'PENDING') {
      throw Object.assign(new Error('Somente orçamentos pendentes podem ser aprovados'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    await this.validateApprover(userId, userRole);

    const result = await this.repository.updateStatus(id, 'ORDERED', {
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
    });

    // Auto-create purchase order from budget
    const purchaseOrder = await this.createPurchaseOrderFromBudget(budget, userId);

    // Notify creator
    await this.notificationsRepo.create({
      userId: budget.createdBy,
      type: 'SUCCESS',
      title: 'Orçamento Aprovado',
      message: `Seu orçamento ${budget.budgetNumber} foi aprovado. Pedido ${purchaseOrder.orderNumber} gerado.`,
    });

    return { ...result, purchaseOrder };
  }

  async reject(id: string, userId: string, userRole: string, reason: string) {
    const budget = await this.findById(id);
    if (budget.status !== 'PENDING') {
      throw Object.assign(new Error('Somente orçamentos pendentes podem ser rejeitados'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    if (!reason || reason.trim().length === 0) {
      throw Object.assign(new Error('É necessário informar o motivo da rejeição'), { statusCode: 400, code: 'REASON_REQUIRED' });
    }

    await this.validateApprover(userId, userRole);

    const result = await this.repository.updateStatus(id, 'REJECTED', {
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason,
    });

    // Notify creator
    await this.notificationsRepo.create({
      userId: budget.createdBy,
      type: 'WARNING',
      title: 'Orçamento Rejeitado',
      message: `Seu orçamento ${budget.budgetNumber} foi rejeitado. Motivo: ${reason}`,
    });

    return result;
  }

  async reopen(id: string, userId: string) {
    const budget = await this.findById(id);
    if (budget.status !== 'REJECTED') {
      throw Object.assign(new Error('Somente orçamentos rejeitados podem ser reabertos'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    if (budget.createdBy !== userId) {
      throw Object.assign(new Error('Somente o criador pode reabrir o orçamento'), { statusCode: 403, code: 'FORBIDDEN' });
    }

    return this.repository.updateStatus(id, 'DRAFT', {
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    });
  }

  async purchase(id: string, userId: string, data: {
    invoiceNumber?: string;
    finalAmount?: number;
    paymentMethod?: string;
    installments?: Array<{
      installmentNumber: number;
      amount: number;
      dueDate: string;
      notes?: string;
    }>;
  }) {
    const budget = await this.findById(id);
    if (budget.status !== 'ORDERED') {
      throw Object.assign(new Error('Somente pedidos autorizados podem ser marcados como comprados'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    const paymentInstallments = (data.installments || []).map((inst) => ({
      id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      installmentNumber: inst.installmentNumber,
      amount: inst.amount,
      dueDate: inst.dueDate,
      status: 'PENDING',
      notes: inst.notes || null,
    }));

    const result = await this.repository.updateStatus(id, 'PURCHASED', {
      purchasedBy: userId,
      purchasedAt: new Date().toISOString(),
      invoiceNumber: data.invoiceNumber || null,
      finalAmount: data.finalAmount || null,
      paymentMethod: data.paymentMethod || null,
      paymentInstallments: JSON.stringify(paymentInstallments),
    });

    // Notify stock team
    const stockUsers = await db.query(
      "SELECT id FROM users WHERE role = 'STOCK' AND is_active = true"
    );
    for (const user of stockUsers.rows) {
      await this.notificationsRepo.create({
        userId: user.id,
        type: 'INFO',
        title: 'Compra Realizada',
        message: `Compra ${budget.budgetNumber} realizada, aguardando recebimento.`,
      });
    }

    return result;
  }

  async cancel(id: string, userId: string, userRole: string) {
    const budget = await this.findById(id);
    if (['PURCHASED', 'RECEIVED', 'CANCELLED'].includes(budget.status)) {
      throw Object.assign(new Error('Este orçamento não pode ser cancelado'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    // Only creator or admin can cancel
    const isAdmin = userRole === 'OWNER' || userRole === 'DIRECTOR';
    if (budget.createdBy !== userId && !isAdmin) {
      throw Object.assign(new Error('Sem permissão para cancelar este orçamento'), { statusCode: 403, code: 'FORBIDDEN' });
    }

    return this.repository.updateStatus(id, 'CANCELLED');
  }

  // ==================== INSTALLMENTS ====================

  async payInstallment(budgetId: string, installmentId: string, paidDate: string) {
    const budget = await this.findById(budgetId);
    if (!budget) {
      throw Object.assign(new Error('Orçamento não encontrado'), { statusCode: 404, code: 'BUDGET_NOT_FOUND' });
    }
    return this.repository.payInstallment(budgetId, installmentId, paidDate);
  }

  // ==================== ITEMS ====================

  async getItems(budgetId: string) {
    await this.findById(budgetId); // validates existence
    return this.repository.getItems(budgetId);
  }

  async addItem(budgetId: string, data: CreateBudgetItemDTO, userId?: string) {
    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Itens');

    // Validações (Demanda 6)
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw Object.assign(new Error('A quantidade deve ser maior que zero'), { statusCode: 400, code: 'INVALID_QUANTITY' });
    }
    // Evita duplicidade do mesmo produto (apenas para itens vinculados a produto)
    if (data.productId) {
      const existing = (budget.items || []).find((i: any) => i.productId === data.productId);
      if (existing) {
        throw Object.assign(new Error(`O produto "${data.productName}" já está no orçamento`), { statusCode: 400, code: 'DUPLICATE_ITEM' });
      }
    }

    const item = await this.repository.addItem(budgetId, data);
    await this.repository.recalculateTotal(budgetId);
    await this.repository.logHistory({
      budgetId, userId, action: 'ITEM_ADD', field: 'item',
      newValue: `${data.productName} (qtd ${data.quantity ?? 1})`,
      description: `Item adicionado: ${data.productName}`,
    });
    return item;
  }

  async duplicateItem(itemId: string, userId?: string) {
    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });
    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Itens');

    const item = await this.repository.duplicateItem(itemId);
    if (!item) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });
    await this.repository.recalculateTotal(budgetId);
    await this.repository.logHistory({
      budgetId, userId, action: 'ITEM_ADD', field: 'item',
      newValue: item.productName,
      description: `Item duplicado: ${item.productName}`,
    });
    return item;
  }

  async updateItem(itemId: string, data: UpdateBudgetItemDTO, userId?: string) {
    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });

    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Itens');

    if (data.quantity !== undefined && data.quantity <= 0) {
      throw Object.assign(new Error('A quantidade deve ser maior que zero'), { statusCode: 400, code: 'INVALID_QUANTITY' });
    }

    const before = await this.repository.getItemById(itemId);

    await this.repository.updateItem(itemId, data);
    await this.repository.recalculateTotal(budgetId);

    if (before) {
      if (data.quantity !== undefined && Number(data.quantity) !== Number(before.quantity)) {
        await this.repository.logHistory({
          budgetId, userId, action: 'ITEM_UPDATE', field: 'quantity',
          oldValue: String(before.quantity), newValue: String(data.quantity),
          description: `Quantidade de "${before.product_name}": ${before.quantity} → ${data.quantity}`,
        });
      }
      if (data.notes !== undefined && (data.notes || '') !== (before.notes || '')) {
        await this.repository.logHistory({
          budgetId, userId, action: 'ITEM_UPDATE', field: 'notes',
          oldValue: before.notes || null, newValue: data.notes || null,
          description: `Observação de "${before.product_name}" alterada`,
        });
      }
    }
    return { success: true };
  }

  async deleteItem(itemId: string, userId?: string) {
    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });

    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Itens');

    const before = await this.repository.getItemById(itemId);
    await this.repository.deleteItem(itemId);
    await this.repository.recalculateTotal(budgetId);
    await this.repository.logHistory({
      budgetId, userId, action: 'ITEM_DELETE', field: 'item',
      oldValue: before?.product_name || itemId,
      description: `Item removido: ${before?.product_name || itemId}`,
    });
    return { success: true };
  }

  async selectQuote(itemId: string, quoteId: string, userId?: string) {
    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });

    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Cotações');

    await this.repository.selectQuote(itemId, quoteId);
    await this.repository.recalculateTotal(budgetId);
    await this.repository.logHistory({
      budgetId, userId, action: 'QUOTE_SELECT', field: 'selected_quote',
      newValue: quoteId, description: 'Cotação selecionada alterada',
    });
    return { success: true };
  }

  // ==================== QUOTES ====================

  async getQuotes(itemId: string) {
    return this.repository.getQuotes(itemId);
  }

  async addQuote(itemId: string, data: CreateBudgetQuoteDTO, userId?: string) {
    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });

    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Cotações');

    // Validação (Demanda 6): preço maior que zero
    if (data.unitPrice === undefined || data.unitPrice <= 0) {
      throw Object.assign(new Error('O preço unitário deve ser maior que zero'), { statusCode: 400, code: 'INVALID_PRICE' });
    }

    const quote = await this.repository.addQuote(itemId, data);
    await this.repository.recalculateTotal(budgetId);
    await this.repository.logHistory({
      budgetId, userId, action: 'QUOTE_ADD', field: 'unit_price',
      newValue: String(data.unitPrice),
      description: `Cotação adicionada (${(data.unitPrice / 100).toFixed(2)})`,
    });
    return quote;
  }

  async updateQuote(quoteId: string, data: UpdateBudgetQuoteDTO, userId?: string) {
    const itemId = await this.repository.getQuoteItemId(quoteId);
    if (!itemId) throw Object.assign(new Error('Cotação não encontrada'), { statusCode: 404, code: 'QUOTE_NOT_FOUND' });

    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });

    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Cotações');

    if (data.unitPrice !== undefined && data.unitPrice <= 0) {
      throw Object.assign(new Error('O preço unitário deve ser maior que zero'), { statusCode: 400, code: 'INVALID_PRICE' });
    }

    const before = await this.repository.getQuoteById(quoteId);

    await this.repository.updateQuote(quoteId, data);
    await this.repository.recalculateTotal(budgetId);

    if (before && data.unitPrice !== undefined && Number(data.unitPrice) !== Number(before.unit_price)) {
      await this.repository.logHistory({
        budgetId, userId, action: 'QUOTE_UPDATE', field: 'unit_price',
        oldValue: String(before.unit_price), newValue: String(data.unitPrice),
        description: `Preço unitário: ${(before.unit_price / 100).toFixed(2)} → ${(data.unitPrice / 100).toFixed(2)}`,
      });
    }
    return { success: true };
  }

  async deleteQuote(quoteId: string, userId?: string) {
    const itemId = await this.repository.getQuoteItemId(quoteId);
    if (!itemId) throw Object.assign(new Error('Cotação não encontrada'), { statusCode: 404, code: 'QUOTE_NOT_FOUND' });

    const budgetId = await this.repository.getItemBudgetId(itemId);
    if (!budgetId) throw Object.assign(new Error('Item não encontrado'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });

    const budget = await this.findById(budgetId);
    this.assertEditable(budget.status, 'Cotações');

    await this.repository.deleteQuote(quoteId);
    await this.repository.recalculateTotal(budgetId);
    await this.repository.logHistory({
      budgetId, userId, action: 'QUOTE_DELETE', field: 'unit_price',
      description: 'Cotação removida',
    });
    return { success: true };
  }

  // ==================== TRANSFORMAR EM PEDIDO ====================

  // Transforma o orçamento em pedido: muda para ORDERED e gera o Pedido por
  // Fornecedor (aparece em /supplier-orders). O orçamento continua editável;
  // ao reconverter, o pedido é regenerado — desde que ainda não tenha recebimento.
  async convertToOrder(budgetId: string, userId: string) {
    const budget = await this.findById(budgetId);

    if (['PURCHASED', 'RECEIVED', 'CANCELLED'].includes(budget.status)) {
      throw Object.assign(new Error('Este orçamento não pode mais ser transformado em pedido'), { statusCode: 400, code: 'INVALID_STATUS' });
    }
    if (!budget.items || budget.items.length === 0) {
      throw Object.assign(new Error('O orçamento precisa ter pelo menos um item'), { statusCode: 400, code: 'NO_ITEMS' });
    }
    for (const item of budget.items) {
      if (!item.selectedQuoteId) {
        throw Object.assign(new Error(`Informe o preço do item "${item.productName}" antes de transformar em pedido`), { statusCode: 400, code: 'NO_QUOTES' });
      }
    }
    if (!budget.supplierId) {
      throw Object.assign(new Error('Defina o fornecedor do orçamento antes de transformar em pedido'), { statusCode: 400, code: 'NO_SUPPLIER' });
    }

    // Já existe pedido para este orçamento? Regenera, se ainda não houve recebimento.
    const existingPOs = await db.query('SELECT id FROM purchase_orders WHERE purchase_budget_id = $1', [budgetId]);
    if (existingPOs.rows.length > 0) {
      const poIds = existingPOs.rows.map((r: any) => r.id);
      const recv = await db.query(
        `SELECT COALESCE(SUM(soi.quantity_received), 0)::int AS received
         FROM supplier_order_items soi
         JOIN supplier_orders so ON so.id = soi.supplier_order_id
         WHERE so.purchase_order_id = ANY($1::text[])`,
        [poIds]
      );
      if ((recv.rows[0]?.received || 0) > 0) {
        throw Object.assign(
          new Error('Este pedido já possui recebimentos e não pode ser regenerado. Edite diretamente o Pedido por Fornecedor.'),
          { statusCode: 400, code: 'HAS_RECEIPTS' }
        );
      }
      // Sem recebimentos: remove o pedido antigo (cascateia supplier_orders/itens) e recria
      await db.query('DELETE FROM purchase_orders WHERE purchase_budget_id = $1', [budgetId]);
    }

    if (budget.status !== 'ORDERED') {
      await this.repository.updateStatus(budgetId, 'ORDERED', {
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
      });
    }

    const purchaseOrder = await this.createPurchaseOrderFromBudget(budget, userId);

    await this.repository.logHistory({
      budgetId, userId, action: 'STATUS_CHANGE', field: 'status',
      newValue: 'Pedido',
      description: `Transformado em pedido ${purchaseOrder.orderNumber}`,
    });

    return { ...(await this.repository.findById(budgetId) as any), purchaseOrder };
  }

  // ==================== HELPERS ====================

  private async createPurchaseOrderFromBudget(
    budget: any,
    approvedBy: string
  ): Promise<{ id: string; orderNumber: string }> {
    // Generate PO number
    const lastPO = await db.query(
      'SELECT order_number FROM purchase_orders ORDER BY created_at DESC LIMIT 1'
    );
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    let orderNumber: string;
    if (!lastPO.rows || lastPO.rows.length === 0) {
      orderNumber = `PO${year}${month}0001`;
    } else {
      const lastSeq = parseInt(lastPO.rows[0].order_number.slice(-4));
      orderNumber = `PO${year}${month}${String(lastSeq + 1).padStart(4, '0')}`;
    }

    const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Collect items with selected quotes
    const poItems: Array<{ productId: string; quantity: number; unitPrice: number; notes?: string }> = [];

    if (budget.items) {
      for (const item of budget.items) {
        if (!item.productId || !item.selectedQuoteId || !item.quotes) continue;
        const selectedQuote = item.quotes.find((q: any) => q.id === item.selectedQuoteId);
        if (!selectedQuote) continue;

        poItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: selectedQuote.unitPrice,
          notes: item.notes || undefined,
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of poItems) {
      subtotal += Math.round(item.quantity * item.unitPrice);
    }

    // Apply additional costs percentage from budget
    const additionalCosts = budget.additionalCosts || [];
    const totalAdditionalPct = additionalCosts.reduce((s: number, c: any) => s + (c.percentage || 0), 0);
    const totalWithCosts = Math.round(subtotal * (1 + totalAdditionalPct / 100));

    // Insert purchase order
    await db.query(
      `INSERT INTO purchase_orders (
        id, order_number, supplier_id, status, order_date,
        subtotal, tax_amount, total_amount,
        notes, created_by, payment_status,
        shipping_cost, discount_amount, purchase_budget_id
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        poId,
        orderNumber,
        budget.supplierId,
        'CONFIRMED',
        subtotal,
        0,
        totalWithCosts,
        `Gerado automaticamente do orçamento de compra ${budget.budgetNumber}`,
        approvedBy,
        'PENDING',
        0,
        0,
        budget.id,
      ]
    );

    // Insert PO items (with supplier_id for supplier order generation)
    for (const item of poItems) {
      const itemId = `po-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const totalPrice = item.quantity * item.unitPrice;

      await db.query(
        `INSERT INTO purchase_order_items (
          id, purchase_order_id, product_id, quantity, unit_price,
          tax_rate, discount_percentage, total_price, notes, supplier_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          itemId,
          poId,
          item.productId,
          item.quantity,
          item.unitPrice,
          0,
          0,
          totalPrice,
          item.notes || null,
          budget.supplierId || null,
        ]
      );
    }

    // Auto-generate supplier order from PO
    try {
      await this.generateSupplierOrderFromPO(poId, budget.supplierId!, approvedBy);
      console.log(`✅ Supplier order gerada para PO ${orderNumber}`);
    } catch (err: any) {
      console.error(`❌ Erro ao gerar pedido de fornecedor para PO ${orderNumber}:`, err?.message || err);
    }

    return { id: poId, orderNumber };
  }

  private async generateSupplierOrderFromPO(
    purchaseOrderId: string,
    supplierId: string,
    userId: string
  ): Promise<void> {
    // Get PO info
    const poResult = await db.query(
      'SELECT order_number, payment_terms FROM purchase_orders WHERE id = $1',
      [purchaseOrderId]
    );
    if (poResult.rows.length === 0) return;
    const po = poResult.rows[0];

    // Get PO items
    const itemsResult = await db.query(
      `SELECT id, product_id, quantity, unit_price, total_price, notes
       FROM purchase_order_items WHERE purchase_order_id = $1`,
      [purchaseOrderId]
    );
    if (itemsResult.rows.length === 0) return;

    // Generate order number
    const lastSO = await db.query(
      'SELECT order_number FROM supplier_orders ORDER BY created_at DESC LIMIT 1'
    );
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    let orderNumber: string;
    if (!lastSO.rows || lastSO.rows.length === 0) {
      orderNumber = `SO${year}${month}0001`;
    } else {
      const lastNum = lastSO.rows[0].order_number;
      const lastSeq = parseInt(lastNum.slice(-4)) || 0;
      orderNumber = `SO${year}${month}${String(lastSeq + 1).padStart(4, '0')}`;
    }

    const soId = `so-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const groupCode = `GRP-${po.order_number}`;

    // Calculate subtotal
    let subtotal = 0;
    for (const item of itemsResult.rows) {
      subtotal += item.total_price;
    }

    // Create supplier order
    await db.query(
      `INSERT INTO supplier_orders (
        id, order_number, supplier_id, purchase_order_id, group_code,
        status, subtotal, total_amount, payment_terms, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        soId, orderNumber, supplierId, purchaseOrderId, groupCode,
        'PENDING', subtotal, subtotal, po.payment_terms || null,
        `Gerado automaticamente da OC ${po.order_number}`, userId,
      ]
    );

    // Create supplier order items
    for (const item of itemsResult.rows) {
      const soItemId = `soi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await db.query(
        `INSERT INTO supplier_order_items (
          id, supplier_order_id, purchase_order_item_id, product_id,
          quantity, unit_price, total_price, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          soItemId, soId, item.id, item.product_id,
          item.quantity, item.unit_price, item.total_price, item.notes || null,
        ]
      );
    }
  }

  private async validateApprover(userId: string, userRole: string): Promise<void> {
    const isAdmin = userRole === 'OWNER' || userRole === 'DIRECTOR';
    if (isAdmin) return;

    // Check if user has active delegation
    const hasActiveDelegation = await this.delegationsRepo.isActiveDelegateFor(userId);
    if (!hasActiveDelegation) {
      throw Object.assign(new Error('Sem permissão para aprovar orçamentos'), { statusCode: 403, code: 'FORBIDDEN' });
    }
  }

  private async notifyApprovers(budgetNumber: string): Promise<void> {
    // Notify all OWNER/DIRECTOR users
    const admins = await db.query(
      "SELECT id FROM users WHERE role IN ('OWNER', 'DIRECTOR') AND is_active = true"
    );

    // Notify active delegates
    const delegates = await this.delegationsRepo.getActiveDelegates();

    const userIds = new Set<string>();
    for (const admin of admins.rows) userIds.add(admin.id);
    for (const delegate of delegates) userIds.add(delegate.delegatedTo);

    for (const userId of userIds) {
      await this.notificationsRepo.create({
        userId,
        type: 'INFO',
        title: 'Novo Orçamento para Aprovação',
        message: `O orçamento ${budgetNumber} está aguardando aprovação.`,
      });
    }
  }
}
