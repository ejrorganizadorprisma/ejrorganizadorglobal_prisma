import { SalesRepository } from '../repositories/sales.repository';
import { QuotesRepository } from '../repositories/quotes.repository';
import { CommissionsRepository } from '../repositories/commissions.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { db } from '../config/database';
import {
  SaleStatus,
  CommissionSourceType,
  CommissionCalculationMode,
  type CreateSaleDTO,
  type UpdateSaleDTO,
  type SaleFilters,
  type CreateSalePaymentDTO,
  type UpdateSalePaymentDTO,
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
   * Criar nova venda.
   *
   * A partir do refactor Pedido→Venda, vendedores (SALESPERSON) NÃO criam
   * vendas diretamente — eles criam Pedidos (POST /sales-orders). Apenas
   * admin/faturamento pode criar venda, normalmente através de
   * `sales-orders.service.convertToSale`.
   */
  async create(data: CreateSaleDTO, userId: string, userRole?: string) {
    if (userRole === 'SALESPERSON') {
      throw new BadRequestError(
        'Atualize o app. Vendedores agora registram Pedidos, não vendas. ' +
        'Atualize para a versão mais recente para continuar vendendo.'
      );
    }

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

    // ─── Validação de comissão por produto (ANTES de criar a venda) ───
    // Se o vendedor tem commissionByProduct=true, TODOS os itens PRODUCT
    // devem ter products.commission_rate definido. Caso contrário BLOQUEIA
    // o faturamento para o admin definir a taxa primeiro.
    const commissionOwnerId = data.sellerId || userId;
    const commissionConfig = await this.commissionsRepository.getConfig(commissionOwnerId);
    if (commissionConfig && commissionConfig.active && commissionConfig.commissionByProduct) {
      for (const item of data.items) {
        if (item.itemType === 'PRODUCT' && item.productId) {
          const r = await db.query(
            'SELECT commission_rate, name FROM products WHERE id = $1',
            [item.productId]
          );
          if (!r.rows[0] || r.rows[0].commission_rate == null) {
            const productName = r.rows[0]?.name || item.productId;
            throw new BadRequestError(
              `Produto "${productName}" não possui taxa de comissão definida. ` +
              'Defina a taxa no cadastro do produto antes de faturar.'
            );
          }
        }
      }
    }

    const sale = await this.repository.create(data, userId, false);

    // ─── Post-creation hooks ───
    // commissionOwnerId e commissionConfig já calculados acima.
    try {
      // GPS event (quando o admin fatura informando coordenadas; raro)
      if (data.latitude != null && data.longitude != null) {
        await db.query(
          'UPDATE sales SET latitude = $1, longitude = $2 WHERE id = $3',
          [data.latitude, data.longitude, sale.id]
        );

        const gpsId = `gps-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO gps_events (id, user_id, event_type, event_id, latitude, longitude)
           VALUES ($1, $2, 'SALE', $3, $4, $5)`,
          [gpsId, userId, sale.id, data.latitude, data.longitude]
        );
      }

      // ─── Commission: 3 modos ──────────────────────────────
      // SALE_FIXED:      % fixo do vendedor sobre total da venda
      // SALE_BY_PRODUCT: soma de (total_item × product.commission_rate / 100)
      // COLLECTION:      gerado em collections.repository.approve(), não aqui
      // commissionConfig já foi buscada acima (pré-validação), reutilizada aqui.
      await this.createSaleCommission(commissionOwnerId, sale.id, data.items, sale.total, commissionConfig);
    } catch (hookError) {
      console.error('Erro nos hooks pós-criação de venda (GPS/Comissão):', hookError);
    }

    return sale;
  }

  /**
   * Cria lançamento(s) de comissão sobre a venda, respeitando o modo configurado:
   *
   * - commissionByProduct = false → SALE_FIXED (1 entry, % fixo sobre total)
   * - commissionByProduct = true  → SALE_BY_PRODUCT (1 entry, valor = Σ item×taxa)
   *
   * IMPORTANTE: quando byProduct, bloqueia se algum item PRODUCT não possuir
   * products.commission_rate definido.
   */
  private async createSaleCommission(
    sellerId: string,
    saleId: string,
    items: CreateSaleDTO['items'],
    saleTotal: number,
    config?: { active: boolean; commissionByProduct: boolean; commissionOnSales: number } | null
  ) {
    if (!config || !config.active) return;

    if (config.commissionByProduct) {
      // ── SALE_BY_PRODUCT ──
      // A validação de commission_rate já ocorreu em create() antes de criar a venda.
      // Calcular comissão item a item
      let totalCommission = 0;
      let weightedBase = 0;
      for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
        if (item.itemType === 'PRODUCT' && item.productId) {
          const r = await db.query(
            'SELECT commission_rate FROM products WHERE id = $1',
            [item.productId]
          );
          const rate = parseFloat(r.rows[0].commission_rate);
          totalCommission += Math.round(itemTotal * rate / 100);
          weightedBase += itemTotal;
        } else if (item.itemType === 'SERVICE') {
          // Serviços usam a taxa fixa do vendedor como fallback
          if (config.commissionOnSales > 0) {
            totalCommission += Math.round(itemTotal * config.commissionOnSales / 100);
            weightedBase += itemTotal;
          }
        }
      }

      if (totalCommission > 0) {
        // Taxa efetiva ponderada para exibição
        const effectiveRate = weightedBase > 0
          ? Math.round((totalCommission / weightedBase) * 10000) / 100
          : 0;

        // Inserimos manualmente pois createEntry calcula baseAmount × rate
        const entryId = `coment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO commission_entries
             (id, seller_id, source_type, source_id, base_amount, commission_rate, commission_amount, calculation_mode, status)
           VALUES ($1, $2, 'SALE', $3, $4, $5, $6, $7, 'PENDING')`,
          [entryId, sellerId, saleId, saleTotal, effectiveRate, totalCommission, CommissionCalculationMode.SALE_BY_PRODUCT]
        );
      }
    } else if (config.commissionOnSales > 0) {
      // ── SALE_FIXED ──
      await this.commissionsRepository.createEntry(
        sellerId,
        CommissionSourceType.SALE,
        saleId,
        saleTotal,
        config.commissionOnSales,
        CommissionCalculationMode.SALE_FIXED
      );
    }
    // COLLECTION mode: handled entirely in collections.repository.approve()
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
   * @deprecated Orçamento agora vira Pedido, não Venda direta.
   * Use POST /sales-orders/convert-from-quote para criar um Pedido a partir
   * do orçamento, e em seguida POST /sales-orders/:id/convert-to-sale para
   * efetivar a venda.
   */
  async convertFromQuote(
    _quoteId: string,
    _conversionData: unknown,
    _userId: string,
    _userRole?: string
  ): Promise<never> {
    throw new BadRequestError(
      'Esta rota foi removida. Orçamentos agora são convertidos em Pedido ' +
      '(POST /sales-orders/convert-from-quote) e, em seguida, o Pedido é ' +
      'faturado como Venda (POST /sales-orders/:id/convert-to-sale).'
    );
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
