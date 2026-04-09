import { SalesOrdersRepository } from '../repositories/sales-orders.repository';
import { QuotesRepository } from '../repositories/quotes.repository';
import { SalesService } from './sales.service';
import { CustomersRepository } from '../repositories/customers.repository';
import { db } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
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

  async getById(id: string) {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundError('Pedido não encontrado');
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

    return this.repository.create(data, userId, sellerIdOverride);
  }

  /**
   * Atualizar pedido
   */
  async update(id: string, data: UpdateSalesOrderDTO) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');
    if (existing.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestError('Pedido já convertido em venda não pode ser editado');
    }
    if (existing.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestError('Pedido cancelado não pode ser editado');
    }
    return this.repository.update(id, data);
  }

  /**
   * Cancelar pedido
   */
  async cancel(id: string, cancelledBy: string, reason?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');
    if (existing.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestError('Pedido já convertido em venda não pode ser cancelado');
    }
    if (existing.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestError('Pedido já está cancelado');
    }
    return this.repository.cancel(id, cancelledBy, reason);
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Pedido não encontrado');
    if (existing.saleId) {
      throw new BadRequestError('Pedido já convertido em venda não pode ser deletado');
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
    const order = await this.repository.findById(salesOrderId);
    if (!order) throw new NotFoundError('Pedido não encontrado');

    if (order.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestError('Pedido já foi convertido em venda');
    }
    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestError('Pedido cancelado não pode ser convertido');
    }

    if (!dto.paymentMethod) {
      throw new BadRequestError('paymentMethod é obrigatório');
    }

    // Itens: se usuário enviou uma lista editada, usa ela; senão usa os do pedido
    const items =
      dto.items && dto.items.length > 0
        ? dto.items
        : (order.items || []).map((i) => ({
            itemType: i.itemType,
            productId: i.productId,
            serviceName: i.serviceName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
          }));

    if (items.length === 0) {
      throw new BadRequestError('Venda precisa ter ao menos um item');
    }

    const saleData: CreateSaleDTO = {
      customerId: order.customerId,
      salesOrderId: order.id,
      sellerId: order.sellerId, // quem ganha comissão = autor do pedido
      saleDate: dto.saleDate || new Date().toISOString(),
      dueDate: dto.dueDate,
      items,
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

    // Marcar pedido como convertido (fora da transação da venda — dados já commitados)
    await this.repository.markAsConverted(order.id, sale.id, userId);

    return sale;
  }
}
