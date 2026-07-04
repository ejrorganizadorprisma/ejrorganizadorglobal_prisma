import { SalesOrdersRepository } from '../repositories/sales-orders.repository';
import { QuotesRepository } from '../repositories/quotes.repository';
import { SalesService } from './sales.service';
import { CustomersRepository } from '../repositories/customers.repository';
import { PushNotificationsService } from './push-notifications.service';
import { db } from '../config/database';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../utils/errors';
import {
  SalesOrderStatus,
  type CreateSalesOrderDTO,
  type UpdateSalesOrderDTO,
  type SalesOrderFilters,
  type CreateSaleDTO,
  type PaymentMethod,
  type ShippingMethod,
  type DeliveryAddress,
} from '@ejr/shared-types';

// Roles administrativos que podem cancelar/deletar qualquer pedido e faturar.
const ADMIN_ROLES = ['OWNER', 'DIRECTOR', 'ADMIN', 'MANAGER', 'FINANCE'] as const;
function isAdminRole(role?: string): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

// Status terminais ou de transição que não permitem alteração via update normal.
function isTerminalStatus(status: string): boolean {
  return (
    status === SalesOrderStatus.CONVERTED ||
    status === SalesOrderStatus.CANCELLED ||
    status === SalesOrderStatus.CONVERTING ||
    status === SalesOrderStatus.PARTIALLY_CONVERTED
  );
}

// Transições de status permitidas via PUT /sales-orders/:id (update genérico).
// CONVERTED/CANCELLED só podem ser atingidos pelos endpoints dedicados
// (convert-to-sale e cancel). CONVERTING é interno.
const ALLOWED_UPDATE_TRANSITIONS: Record<string, string[]> = {
  [SalesOrderStatus.DRAFT]: [SalesOrderStatus.DRAFT, SalesOrderStatus.PENDING],
  [SalesOrderStatus.PENDING]: [SalesOrderStatus.PENDING, SalesOrderStatus.APPROVED, SalesOrderStatus.DRAFT],
  [SalesOrderStatus.APPROVED]: [SalesOrderStatus.APPROVED, SalesOrderStatus.PENDING],
};

interface ConvertToSaleDTO {
  // Dados obrigatórios da venda
  paymentMethod: PaymentMethod;
  saleDate?: string;
  dueDate?: string;
  installments?: number;
  // Itens editados (se não enviado, usa os do pedido original)
  items?: Array<{
    itemType: 'PRODUCT' | 'SERVICE';
    productId?: string;
    serviceName?: string;
    serviceDescription?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  discount?: number;
  notes?: string;
  internalNotes?: string;
  // Frete / logística
  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  carrierName?: string;
  trackingCode?: string;
  deliveryAddress?: DeliveryAddress;
  shippingNotes?: string;
}

export class SalesOrdersService {
  private repository = new SalesOrdersRepository();
  private quotesRepository = new QuotesRepository();
  private customersRepository = new CustomersRepository();
  private salesService = new SalesService();

  async list(filters: SalesOrderFilters) {
    return this.repository.findAll(filters);
  }

  async getById(id: string, userId?: string, userRole?: string) {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundError('Pedido não encontrado');

    // SALESPERSON só pode ler pedidos próprios (sellerId === userId).
    if (userRole === 'SALESPERSON' && userId && order.sellerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para visualizar este pedido');
    }

    return order;
  }

  /**
   * Criar novo pedido.
   * Se userRole === 'SALESPERSON', força o sellerId = userId (vendedor não
   * pode criar pedido em nome de outro). Outros papéis podem passar sellerId.
   */
  async create(data: CreateSalesOrderDTO, userId: string, userRole?: string) {
    // Validações básicas
    if (!data.customerId) {
      throw new BadRequestError('Cliente é obrigatório');
    }
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError('O pedido deve ter pelo menos um item');
    }
    for (const item of data.items) {
      if (item.itemType === 'PRODUCT' && !item.productId) {
        throw new BadRequestError('ProductId é obrigatório para items do tipo PRODUCT');
      }
      if (item.itemType === 'SERVICE' && !item.serviceName) {
        throw new BadRequestError('ServiceName é obrigatório para items do tipo SERVICE');
      }
      if (item.quantity <= 0) {
        throw new BadRequestError('Quantidade deve ser maior que zero');
      }
      if (item.unitPrice < 0) {
        throw new BadRequestError('Preço unitário não pode ser negativo');
      }
    }

    // Cliente precisa estar aprovado para vendedor mobile
    const customer = await this.customersRepository.findById(data.customerId);
    if (!customer) {
      throw new BadRequestError('Cliente não encontrado');
    }
    const isMobileSeller = userRole === 'SALESPERSON';
    if (isMobileSeller && customer.approvalStatus !== 'APPROVED') {
      throw new BadRequestError(
        'Cliente não aprovado. Aguarde a aprovação do administrador antes de registrar pedidos.'
      );
    }

    // Vendedor mobile não pode criar pedido em nome de outro vendedor
    const sellerIdOverride = isMobileSeller ? userId : undefined;
    if (isMobileSeller && data.sellerId && data.sellerId !== userId) {
      throw new BadRequestError('Vendedor não pode criar pedido em nome de outro vendedor');
    }

    // Pedido criado pela web (admin/owner/manager/etc) já entra como APPROVED —
    // não precisa do passo intermediário de aprovação. SALESPERSON (mobile)
    // continua como PENDING para que admin revise antes de faturar.
    const initialStatus = isMobileSeller
      ? SalesOrderStatus.PENDING
      : SalesOrderStatus.APPROVED;

    const created = await this.repository.create(data, userId, sellerIdOverride, {
      initialStatus,
      approvedBy: isMobileSeller ? null : userId,
    });

    // Push fire-and-forget: notifica admins sobre novo pedido
    const sellerName = created.seller?.name || 'Vendedor';
    PushNotificationsService.instance()
      .sendToRoles(['ADMIN', 'OWNER', 'MANAGER'], {
        title: 'Novo pedido',
        body: `${created.orderNumber} de ${sellerName}`,
        data: { type: 'NEW_ORDER', orderId: created.id },
      })
      .catch((err) => console.error('[push] sales-order create:', err));

    return created;
  }

  /**
   * Atualizar pedido.
   *
   * Suporta edição completa: cliente, data, items, desconto, notas.
   * SALESPERSON não pode editar pela web. Pedidos CONVERTED/CANCELLED são imutáveis.
   */
  async update(id: string, data: UpdateSalesOrderDTO, userId?: string, userRole?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');
    if (existing.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestError('Pedido já convertido em venda não pode ser editado');
    }
    if (existing.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestError('Pedido cancelado não pode ser editado');
    }
    if (existing.status === SalesOrderStatus.CONVERTING) {
      throw new BadRequestError('Pedido em processo de faturamento não pode ser editado');
    }
    if (existing.status === SalesOrderStatus.PARTIALLY_CONVERTED) {
      throw new BadRequestError(
        'Pedido com faturamento parcial não pode ser editado. Fature o saldo ou cancele o pedido.'
      );
    }
    if (userRole === 'SALESPERSON') {
      throw new BadRequestError('Vendedores não podem editar pedidos pela plataforma web');
    }

    // Validar transição de status, se enviada.
    if (data.status !== undefined && data.status !== existing.status) {
      const allowed = ALLOWED_UPDATE_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(data.status)) {
        throw new BadRequestError(
          `Transição de status inválida (${existing.status} → ${data.status}). ` +
            `Use os endpoints dedicados de cancelamento ou faturamento.`
        );
      }
    }

    // Validar items se foram enviados
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        if (item.itemType === 'PRODUCT' && !item.productId) {
          throw new BadRequestError('ProductId é obrigatório para items do tipo PRODUCT');
        }
        if (item.itemType === 'SERVICE' && !item.serviceName) {
          throw new BadRequestError('ServiceName é obrigatório para items do tipo SERVICE');
        }
        if (item.quantity <= 0) {
          throw new BadRequestError('Quantidade deve ser maior que zero');
        }
        if (item.unitPrice < 0) {
          throw new BadRequestError('Preço unitário não pode ser negativo');
        }
      }
    }

    // Validar cliente se foi alterado
    if (data.customerId) {
      const customer = await this.customersRepository.findById(data.customerId);
      if (!customer) {
        throw new BadRequestError('Cliente não encontrado');
      }
    }

    // Se items vieram mas discount não, manter o discount existente
    if (data.items && data.discount === undefined) {
      data.discount = existing.discount;
    }

    return this.repository.update(id, data);
  }

  /**
   * Cancelar pedido.
   *
   * Permissões:
   *   - SALESPERSON: só cancela pedido próprio (sellerId === userId), e
   *     somente se status for PENDING ou DRAFT.
   *   - OWNER/DIRECTOR/ADMIN/MANAGER/FINANCE: cancela qualquer pedido não
   *     convertido/cancelado.
   */
  async cancel(id: string, cancelledBy: string, reason?: string, userRole?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');
    if (existing.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestError('Pedido já convertido em venda não pode ser cancelado');
    }
    if (existing.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestError('Pedido já está cancelado');
    }
    if (existing.status === SalesOrderStatus.CONVERTING) {
      throw new BadRequestError('Pedido em processo de faturamento não pode ser cancelado');
    }

    if (userRole === 'SALESPERSON') {
      if (existing.sellerId !== cancelledBy) {
        throw new ForbiddenError('Vendedor só pode cancelar seus próprios pedidos');
      }
      if (
        existing.status !== SalesOrderStatus.PENDING &&
        existing.status !== SalesOrderStatus.DRAFT
      ) {
        throw new ForbiddenError(
          'Vendedor só pode cancelar pedidos em status PENDING ou DRAFT'
        );
      }
    } else if (!isAdminRole(userRole)) {
      throw new ForbiddenError('Sem permissão para cancelar pedidos');
    }

    const cancelled = await this.repository.cancel(id, cancelledBy, reason);

    // Push fire-and-forget: notifica vendedor dono do pedido
    PushNotificationsService.instance()
      .sendToUser(existing.sellerId, {
        title: 'Pedido cancelado',
        body: reason
          ? `${existing.orderNumber} foi cancelado. Motivo: ${reason}`
          : `${existing.orderNumber} foi cancelado.`,
        data: { type: 'ORDER_CANCELLED', orderId: id },
      })
      .catch((err) => console.error('[push] cancel:', err));

    return cancelled;
  }

  /**
   * Deletar pedido.
   *
   * Permissões:
   *   - SALESPERSON: só deleta pedido próprio em DRAFT.
   *   - OWNER/ADMIN: deleta qualquer pedido sem sale_id.
   *   - Demais (DIRECTOR/MANAGER/FINANCE): negado (use cancel).
   */
  async delete(id: string, userId?: string, userRole?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');
    if (existing.saleId) {
      throw new BadRequestError('Pedido já convertido em venda não pode ser deletado');
    }
    if (existing.status === SalesOrderStatus.CONVERTING) {
      throw new BadRequestError('Pedido em processo de faturamento não pode ser deletado');
    }

    if (userRole === 'SALESPERSON') {
      if (!userId || existing.sellerId !== userId) {
        throw new ForbiddenError('Vendedor só pode deletar seus próprios pedidos');
      }
      if (existing.status !== SalesOrderStatus.DRAFT) {
        throw new ForbiddenError(
          'Vendedor só pode deletar pedidos em rascunho (DRAFT)'
        );
      }
    } else if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw new ForbiddenError(
        'Apenas OWNER ou ADMIN podem deletar pedidos. Considere cancelar.'
      );
    }

    await this.repository.delete(id);
    return { success: true };
  }

  /**
   * Converter Orçamento (quote) em Pedido.
   *
   * Substitui o antigo sales.convertFromQuote: a partir de v1.5.0 o orçamento
   * vira Pedido (sales_orders), não mais Venda direta.
   */
  async convertFromQuote(
    quoteId: string,
    userId: string,
    userRole?: string,
    extraData?: {
      notes?: string;
      internalNotes?: string;
      orderDate?: string;
    }
  ) {
    const quote = await this.quotesRepository.findById(quoteId);
    if (!quote) throw new NotFoundError('Orçamento não encontrado');

    if (quote.status === 'CONVERTED') {
      throw new BadRequestError('Este orçamento já foi convertido');
    }
    if (quote.status !== 'APPROVED') {
      throw new BadRequestError('Apenas orçamentos aprovados podem virar pedido');
    }
    if (!quote.items || quote.items.length === 0) {
      throw new BadRequestError('Orçamento sem itens não pode ser convertido');
    }

    // O vendedor dono do pedido é quem criou o orçamento (responsibleUserId).
    // Se for um SALESPERSON convertendo seu próprio quote, bate com userId;
    // se for admin convertendo quote de outro, preserva o seller original.
    const dto: CreateSalesOrderDTO = {
      customerId: quote.customerId,
      quoteId: quote.id,
      sellerId: quote.responsibleUserId || undefined,
      orderDate: extraData?.orderDate || new Date().toISOString(),
      discount: quote.discount || 0,
      notes: extraData?.notes || quote.notes || undefined,
      internalNotes: extraData?.internalNotes || undefined,
      items: quote.items.map((item) => ({
        itemType: item.itemType as 'PRODUCT' | 'SERVICE',
        productId: item.productId || undefined,
        serviceName: item.serviceName || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
      })),
    };

    return this.create(dto, userId, userRole);
  }

  /**
   * Transformar Pedido em Venda.
   *
   * Chamado por quem tem permissão de faturamento (admin/financeiro). O
   * usuário pode editar livremente itens/preços/descontos e adiciona frete.
   * Ao final o pedido é marcado como CONVERTED e a Sale criada recebe
   * seller_id = pedido.seller_id (dono da comissão).
   */
  async convertToSale(
    salesOrderId: string,
    dto: ConvertToSaleDTO,
    userId: string,
    userRole?: string
  ) {
    // Validações estáticas (antes de pegar o lock — falha barata)
    if (!dto.paymentMethod) {
      throw new BadRequestError('paymentMethod é obrigatório');
    }

    const order = await this.repository.findById(salesOrderId);
    if (!order) throw new NotFoundError('Pedido não encontrado');

    if (order.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestError('Pedido já foi convertido em venda');
    }
    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestError('Pedido cancelado não pode ser convertido');
    }
    if (order.status === SalesOrderStatus.CONVERTING) {
      throw new BadRequestError(
        'Pedido já está sendo processado por outro usuário. Aguarde.'
      );
    }

    // Cliente precisa estar APROVADO (regra global — vale também para admin).
    const customer = await this.customersRepository.findById(order.customerId);
    if (!customer) {
      throw new BadRequestError('Cliente do pedido não encontrado');
    }
    if (customer.approvalStatus !== 'APPROVED') {
      throw new BadRequestError(
        'Cliente não aprovado, não pode ser faturado. Aprove o cadastro antes de prosseguir.'
      );
    }

    // ── LOCK OTIMISTA ──────────────────────────────────────────────
    // Marca o pedido como CONVERTING dentro de uma transação curta.
    // Se falhar, é porque outro request já está processando ou status mudou.
    const lock = await this.repository.tryAcquireConvertingLock(salesOrderId);
    if (!lock) {
      throw new BadRequestError(
        'Pedido já está sendo processado ou foi convertido/cancelado'
      );
    }

    try {
      // Snapshot dos itens originais do pedido (qty antes do faturamento parcial)
      const originalItems = (order.items || []).map((i) => ({
        itemType: i.itemType,
        productId: i.productId,
        serviceName: i.serviceName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      }));

      // Itens a faturar: se usuário enviou lista editada, usa ela; senão usa todos.
      const billedItems =
        dto.items && dto.items.length > 0 ? dto.items : originalItems;

      if (billedItems.length === 0) {
        throw new BadRequestError('Venda precisa ter ao menos um item');
      }

      // Calcular itens remanescentes (saldo a faturar futuramente).
      // Match por productId (PRODUCT) ou serviceName (SERVICE). Se um item original
      // não estiver na lista enviada, é considerado totalmente não faturado.
      const remaining = originalItems
        .map((orig) => {
          const billed = billedItems.find((b) => {
            if (orig.itemType === 'PRODUCT' && orig.productId) {
              return b.productId === orig.productId;
            }
            if (orig.itemType === 'SERVICE' && orig.serviceName) {
              return b.serviceName === orig.serviceName;
            }
            return false;
          });
          const billedQty = billed ? billed.quantity : 0;
          return { ...orig, quantity: orig.quantity - billedQty };
        })
        .filter((r) => r.quantity > 0);

      const saleData: CreateSaleDTO = {
        customerId: order.customerId,
        salesOrderId: order.id,
        sellerId: order.sellerId, // quem ganha comissão = autor do pedido
        saleDate: dto.saleDate || new Date().toISOString(),
        dueDate: dto.dueDate,
        items: billedItems,
        discount: dto.discount ?? order.discount,
        installments: dto.installments || 1,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes ?? order.notes,
        internalNotes: dto.internalNotes ?? order.internalNotes,
        shippingMethod: dto.shippingMethod,
        shippingCost: dto.shippingCost,
        carrierName: dto.carrierName,
        trackingCode: dto.trackingCode,
        deliveryAddress: dto.deliveryAddress,
        shippingNotes: dto.shippingNotes,
      };

      const sale = await this.salesService.create(saleData, userId, userRole);

      // Conferência OK: a venda nasce com estágio de fulfillment "Conferido".
      try {
        await db.query(
          `UPDATE sales SET fulfillment_status = 'CONFERRED', updated_at = NOW() WHERE id = $1`,
          [sale.id]
        );
        await this.repository.addSeparationEvent(order.id, userId, 'CONFERRED');
      } catch (confErr) {
        console.error('[convertToSale] Falha ao marcar fulfillment CONFERRED:', confErr);
      }

      // Fechar o ciclo: total ou parcial.
      if (remaining.length === 0) {
        // Faturamento integral: CONVERTING → CONVERTED
        await this.repository.markAsConverted(order.id, sale.id, userId);
      } else {
        // Faturamento parcial: substitui itens do pedido pelos remanescentes
        // e marca como PARTIALLY_CONVERTED. Tudo numa transação curta.
        await db.transaction(async (client) => {
          await this.repository.markAsPartiallyConverted(
            order.id,
            remaining,
            sale.id,
            userId,
            client
          );
        });
      }

      // Sempre registra histórico (uma linha por faturamento)
      try {
        await this.repository.recordConversion(order.id, sale.id, billedItems, userId);
      } catch (histErr) {
        console.error('[convertToSale] Falha ao gravar sales_order_conversions:', histErr);
      }

      // ─── Push (fire-and-forget) ───
      const pushBody = remaining.length === 0
        ? `${order.orderNumber} virou Venda ${sale.saleNumber}`
        : `${order.orderNumber} faturado parcialmente (Venda ${sale.saleNumber}). Saldo segue em aberto.`;
      PushNotificationsService.instance()
        .sendToUser(order.sellerId, {
          title: remaining.length === 0 ? 'Pedido faturado' : 'Pedido faturado parcialmente',
          body: pushBody,
          data: {
            type: 'ORDER_CONVERTED',
            orderId: order.id,
            saleId: sale.id,
            partial: remaining.length > 0,
          },
        })
        .catch((err) => console.error('[push] convertToSale:', err));

      return sale;
    } catch (err) {
      // Faturamento falhou após pegar o lock — devolve o pedido ao status
      // anterior para que possa ser retentado.
      try {
        await this.repository.releaseConvertingLock(salesOrderId, lock.previousStatus);
      } catch (releaseErr) {
        console.error(
          '[convertToSale] Falha ao liberar CONVERTING lock após erro:',
          releaseErr
        );
      }
      throw err;
    }
  }

  /**
   * Aprovação manual: PENDING → APPROVED.
   *
   * Permissões: ADMIN, OWNER, MANAGER. NÃO permitido para SALESPERSON / FINANCE.
   * Idempotente: se já estiver APPROVED, retorna o pedido sem erro. Se estiver
   * em outro status, lança BadRequestError.
   */
  async approve(id: string, userId: string, userRole?: string) {
    const APPROVE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];
    if (!userRole || !APPROVE_ROLES.includes(userRole)) {
      throw new ForbiddenError(
        'Apenas OWNER, ADMIN ou MANAGER podem aprovar pedidos'
      );
    }

    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');

    if (existing.status === SalesOrderStatus.APPROVED) {
      // Idempotente
      return existing;
    }
    if (existing.status !== SalesOrderStatus.PENDING && existing.status !== SalesOrderStatus.SEPARATED) {
      throw new BadRequestError(
        `Apenas pedidos pendentes ou separados podem ser autorizados (atual: ${existing.status})`
      );
    }

    await this.repository.approve(id, userId);
    const updated = await this.repository.findById(id);
    if (!updated) throw new NotFoundError('Pedido não encontrado após aprovação');

    // Push fire-and-forget para o vendedor dono do pedido
    PushNotificationsService.instance()
      .sendToUser(existing.sellerId, {
        title: 'Pedido aprovado',
        body: `${existing.orderNumber} aprovado pelo administrador`,
        data: { type: 'ORDER_APPROVED', orderId: id },
      })
      .catch((err) => console.error('[push] approve:', err));

    return updated;
  }

  // ==================== SEPARAÇÃO NO ESTOQUE ====================

  /**
   * Lê o método de identificação do chão (system_settings) e resolve o
   * responsável: usuário logado (LOGGED_USER) ou usuário do código digitado
   * (EMPLOYEE_CODE, computador compartilhado).
   */
  private async resolveResponsible(userId: string, employeeCode?: string): Promise<string> {
    const cfg = await db.query(
      `SELECT floor_identification_method FROM system_settings LIMIT 1`
    );
    const method = cfg.rows[0]?.floor_identification_method || 'LOGGED_USER';
    if (method !== 'EMPLOYEE_CODE') return userId;

    const code = (employeeCode || '').trim();
    if (!code) throw new BadRequestError('Informe o código de funcionário');
    const u = await db.query(
      `SELECT id FROM users WHERE employee_code = $1 AND is_active = true LIMIT 1`,
      [code]
    );
    if (u.rows.length === 0) throw new BadRequestError('Código de funcionário inválido ou inativo');
    return u.rows[0].id;
  }

  /** Fila de separação do estoque (aguardando + em separação). */
  async listSeparationQueue() {
    return this.repository.findAll({
      statuses: [SalesOrderStatus.AWAITING_SEPARATION, SalesOrderStatus.SEPARATING],
      limit: 500,
      page: 1,
    } as any);
  }

  /** Gerente libera o pedido para a fila do estoque. */
  async releaseForSeparation(id: string, userId: string, userRole?: string) {
    if (!isAdminRole(userRole) && userRole !== 'STOCK') {
      throw new ForbiddenError('Sem permissão para liberar separação');
    }
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status === SalesOrderStatus.AWAITING_SEPARATION) return o;
    const ok = await this.repository.releaseForSeparation(id, userId);
    if (!ok) {
      throw new BadRequestError(
        `Só pedidos pendentes/aprovados podem ser liberados para separação (atual: ${o.status})`
      );
    }
    return this.repository.findById(id);
  }

  /** Funcionário do estoque assume a separação (claim atômico). */
  async claimSeparation(id: string, userId: string, employeeCode?: string) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status === SalesOrderStatus.SEPARATING) {
      throw new ConflictError(
        `Este pedido já foi assumido por ${o.separationResponsible?.name || 'outro funcionário'}.`
      );
    }
    if (o.status !== SalesOrderStatus.AWAITING_SEPARATION) {
      throw new BadRequestError(`Pedido não está disponível para separação (atual: ${o.status})`);
    }
    const responsible = await this.resolveResponsible(userId, employeeCode);
    const ok = await this.repository.claimSeparation(id, responsible);
    if (!ok) {
      throw new ConflictError('Este pedido acabou de ser assumido por outro funcionário.');
    }
    return this.repository.findById(id);
  }

  /** Adiar separação: devolve à fila para outro funcionário. */
  async postponeSeparation(id: string, note?: string) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status !== SalesOrderStatus.SEPARATING) {
      throw new BadRequestError(`Só é possível adiar um pedido em separação (atual: ${o.status})`);
    }
    const ok = await this.repository.postponeSeparation(id, note);
    if (!ok) throw new BadRequestError('Não foi possível adiar a separação');
    return this.repository.findById(id);
  }

  /** "Tudo Separado": grava quantidades/justificativas e conclui a separação. */
  async separate(
    id: string,
    items: Array<{ id: string; quantitySeparated: number; separationStatus: string; separationNote?: string | null }>
  ) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status !== SalesOrderStatus.SEPARATING) {
      throw new BadRequestError(`Só pedidos em separação podem ser finalizados (atual: ${o.status})`);
    }
    // Justificativa obrigatória quando falta (MISSING/PARTIAL)
    for (const it of items || []) {
      if ((it.separationStatus === 'MISSING' || it.separationStatus === 'PARTIAL') && !(it.separationNote || '').trim()) {
        throw new BadRequestError('Justifique os itens em falta antes de finalizar a separação');
      }
    }
    const ok = await this.repository.separate(id, items || []);
    if (!ok) throw new BadRequestError('Não foi possível finalizar a separação');
    return this.repository.findById(id);
  }

  /** Histórico de eventos de separação (avaliação de funcionários). */
  async getSeparationEvents(id: string) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    return this.repository.getSeparationEvents(id);
  }

  // ==================== WORKFLOW (Demanda 9 — legado) ====================

  async receive(id: string, userId: string) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status === SalesOrderStatus.RECEIVED) return o;
    if (o.status !== SalesOrderStatus.PENDING)
      throw new BadRequestError(`Só pedidos pendentes podem ser recebidos (atual: ${o.status})`);
    await this.repository.receive(id, userId);
    return this.repository.findById(id);
  }

  async toDeliver(id: string) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status === SalesOrderStatus.TO_DELIVER) return o;
    if (o.status !== SalesOrderStatus.CONVERTED && o.status !== SalesOrderStatus.PARTIALLY_CONVERTED)
      throw new BadRequestError(`Só vendas faturadas vão para entrega (atual: ${o.status})`);
    await this.repository.toDeliver(id);
    return this.repository.findById(id);
  }

  async markDelivered(id: string, userId: string, data: { deliveryType?: string; carrierName?: string }) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status !== SalesOrderStatus.TO_DELIVER)
      throw new BadRequestError(`Só vendas a entregar podem ser marcadas como entregues (atual: ${o.status})`);
    const type = data.deliveryType === 'CARRIER' ? 'CARRIER' : 'CUSTOMER';
    await this.repository.markDelivered(id, userId, type, type === 'CARRIER' ? (data.carrierName || null) : null);
    return this.repository.findById(id);
  }

  async complete(id: string) {
    const o = await this.repository.findById(id);
    if (!o) throw new NotFoundError('Pedido não encontrado');
    if (o.status === SalesOrderStatus.COMPLETED) return o;
    if (o.status !== SalesOrderStatus.DELIVERED)
      throw new BadRequestError(`Só vendas entregues podem ser concluídas (atual: ${o.status})`);
    await this.repository.complete(id);
    return this.repository.findById(id);
  }

  /**
   * Histórico de faturamentos (sales_order_conversions) de um pedido.
   * Retorna lista cronológica das vendas geradas a partir do pedido.
   */
  async getConversions(id: string, userId?: string, userRole?: string) {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundError('Pedido não encontrado');

    if (userRole === 'SALESPERSON' && userId && order.sellerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para visualizar este pedido');
    }

    return this.repository.getConversionsByOrder(id);
  }
}
