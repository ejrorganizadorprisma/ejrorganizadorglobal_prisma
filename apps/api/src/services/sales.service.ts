import { SalesRepository } from '../repositories/sales.repository';
import { QuotesRepository } from '../repositories/quotes.repository';
import { CommissionsRepository } from '../repositories/commissions.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { db } from '../config/database';
import {
  SaleStatus,
  CommissionSourceType,
  type CreateSaleDTO,
  type UpdateSaleDTO,
  type SaleFilters,
  type CreateSalePaymentDTO,
  type UpdateSalePaymentDTO,
  type PaymentMethod,
} from '@ejr/shared-types';
import { CustomersRepository } from '../repositories/customers.repository';

export class SalesService {
  private repository = new SalesRepository();
  private quotesRepository = new QuotesRepository();
  private customersRepository = new CustomersRepository();
  private commissionsRepository = new CommissionsRepository();

  /**
   * Listar vendas com filtros
   */
  async list(filters: SaleFilters) {
    return this.repository.findAll(filters);
  }

  /**
   * Buscar venda por ID
   */
  async getById(id: string) {
    const sale = await this.repository.findById(id);
    if (!sale) {
      throw new NotFoundError('Venda não encontrada');
    }
    return sale;
  }

  /**
   * Criar nova venda
   */
  async create(data: CreateSaleDTO, userId: string) {
    // Validações
    if (!data.customerId) {
      throw new BadRequestError('Cliente é obrigatório');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestError('A venda deve ter pelo menos um item');
    }

    // Validar items
    for (const item of data.items) {
      if (item.itemType === 'PRODUCT' && !item.productId) {
        throw new BadRequestError(
          'ProductId é obrigatório para items do tipo PRODUCT'
        );
      }

      if (item.itemType === 'SERVICE' && !item.serviceName) {
        throw new BadRequestError(
          'ServiceName é obrigatório para items do tipo SERVICE'
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestError('Quantidade deve ser maior que zero');
      }

      if (item.unitPrice < 0) {
        throw new BadRequestError('Preço unitário não pode ser negativo');
      }
    }

    // Validar data de vencimento
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      const saleDate = new Date(data.saleDate);

      if (dueDate < saleDate) {
        throw new BadRequestError(
          'Data de vencimento não pode ser anterior à data da venda'
        );
      }
    }

    // Validar número de parcelas
    if (data.installments && data.installments < 1) {
      throw new BadRequestError('Número de parcelas deve ser no mínimo 1');
    }

    // Validar método de pagamento autorizado para o cliente
    const customer = await this.customersRepository.findById(data.customerId);
    if (customer && customer.allowedPaymentMethods) {
      if (!customer.allowedPaymentMethods.includes(data.paymentMethod)) {
        throw new BadRequestError(
          `Método de pagamento "${data.paymentMethod}" não autorizado para este cliente`
        );
      }
    }

    // Validar estoque antes de vender
    for (const item of data.items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        const result = await db.query('SELECT current_stock, name FROM products WHERE id = $1', [item.productId]);
        if (result.rows.length === 0) {
          throw new BadRequestError(`Produto não encontrado: ${item.productId}`);
        }
        if (result.rows[0].current_stock < item.quantity) {
          throw new BadRequestError(`Estoque insuficiente para "${result.rows[0].name}": disponível ${result.rows[0].current_stock}, solicitado ${item.quantity}`);
        }
      }
    }

    const sale = await this.repository.create(data, userId);

    // ─── Post-creation hooks (GPS + Commissions) ───
    // These run after the sale is committed; failures are logged but do not rollback the sale.
    try {
      // GPS event
      if (data.latitude != null && data.longitude != null) {
        // Store coordinates on the sale record
        await db.query(
          'UPDATE sales SET latitude = $1, longitude = $2 WHERE id = $3',
          [data.latitude, data.longitude, sale.id]
        );

        // Insert gps_event
        const gpsId = `gps-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO gps_events (id, user_id, event_type, event_id, latitude, longitude)
           VALUES ($1, $2, 'SALE', $3, $4, $5)`,
          [gpsId, userId, sale.id, data.latitude, data.longitude]
        );
      }

      // Commission entry
      const config = await this.commissionsRepository.getConfig(userId);
      if (config && config.active && config.commissionOnSales > 0) {
        await this.commissionsRepository.createEntry(
          userId,
          CommissionSourceType.SALE,
          sale.id,
          sale.total,
          config.commissionOnSales
        );
      }
    } catch (hookError) {
      console.error('Erro nos hooks pós-criação de venda (GPS/Comissão):', hookError);
    }

    return sale;
  }

  /**
   * Atualizar venda
   */
  async update(id: string, data: UpdateSaleDTO, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Venda não encontrada');
    }

    // Não permite editar venda cancelada
    if (existing.status === SaleStatus.CANCELLED) {
      throw new BadRequestError('Não é possível editar uma venda cancelada');
    }

    // Validar data de vencimento
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      const saleDate = new Date(existing.saleDate);

      if (dueDate < saleDate) {
        throw new BadRequestError(
          'Data de vencimento não pode ser anterior à data da venda'
        );
      }
    }

    // Restaurar estoque ao cancelar venda
    if (data.status === SaleStatus.CANCELLED) {
      await this.repository.restoreStock(id, userId);
    }

    return this.repository.update(id, data);
  }

  /**
   * Deletar venda
   */
  async delete(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Venda não encontrada');
    }

    // Não permite deletar venda paga ou parcialmente paga
    if (existing.status === 'PAID' || existing.status === 'PARTIAL') {
      throw new BadRequestError(
        'Não é possível deletar uma venda que já possui pagamentos'
      );
    }

    // Restaurar estoque antes de deletar
    await this.repository.restoreStock(id, userId);

    await this.repository.delete(id);
    return { success: true };
  }

  /**
   * Converter orçamento em venda
   */
  async convertFromQuote(
    quoteId: string,
    conversionData: {
      paymentMethod: PaymentMethod;
      installments?: number;
      saleDate?: string;
      dueDate?: string;
      notes?: string;
      internalNotes?: string;
    },
    userId: string
  ) {
    // Buscar orçamento com itens
    const quote = await this.quotesRepository.findById(quoteId);
    if (!quote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    // Validar status
    if (quote.status === 'CONVERTED') {
      throw new BadRequestError('Este orçamento já foi convertido em venda');
    }

    if (quote.status !== 'APPROVED') {
      throw new BadRequestError('Apenas orçamentos aprovados podem ser convertidos em venda');
    }

    // Validar que tem itens
    if (!quote.items || quote.items.length === 0) {
      throw new BadRequestError('Orçamento sem itens não pode ser convertido');
    }

    // Montar DTO de criação de venda a partir do orçamento
    const saleData: CreateSaleDTO = {
      customerId: quote.customerId,
      quoteId: quote.id,
      saleDate: conversionData.saleDate || new Date().toISOString().split('T')[0],
      dueDate: conversionData.dueDate || undefined,
      paymentMethod: conversionData.paymentMethod,
      installments: conversionData.installments || 1,
      discount: quote.discount || 0,
      notes: conversionData.notes || quote.notes || undefined,
      internalNotes: conversionData.internalNotes || undefined,
      items: quote.items.map((item) => ({
        itemType: item.itemType as 'PRODUCT' | 'SERVICE',
        productId: item.productId || undefined,
        serviceName: item.serviceName || undefined,
        serviceDescription: item.serviceDescription || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
      })),
    };

    // Usar o fluxo normal de criação (valida estoque, cria parcelas, etc.)
    return this.create(saleData, userId);
  }

  /**
   * Obter estatísticas de vendas
   */
  async getStats(filters?: SaleFilters) {
    return this.repository.getStats(filters);
  }

  /**
   * Adicionar pagamento
   */
  async addPayment(saleId: string, data: CreateSalePaymentDTO) {
    const sale = await this.repository.findById(saleId);
    if (!sale) {
      throw new NotFoundError('Venda não encontrada');
    }

    if (sale.status === 'CANCELLED') {
      throw new BadRequestError('Não é possível adicionar pagamento a uma venda cancelada');
    }

    // Validações
    if (data.amount <= 0) {
      throw new BadRequestError('Valor do pagamento deve ser maior que zero');
    }

    if (data.installmentNumber < 1) {
      throw new BadRequestError('Número da parcela deve ser no mínimo 1');
    }

    return this.repository.addPayment(saleId, data);
  }

  /**
   * Atualizar pagamento
   */
  async updatePayment(paymentId: string, data: UpdateSalePaymentDTO) {
    // Validar data de pagamento
    if (data.paidDate) {
      const paidDate = new Date(data.paidDate);
      const today = new Date();

      if (paidDate > today) {
        throw new BadRequestError(
          'Data de pagamento não pode ser futura'
        );
      }
    }

    return this.repository.updatePayment(paymentId, data);
  }
}
