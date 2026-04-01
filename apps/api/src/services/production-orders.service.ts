import { ProductionOrdersRepository } from '../repositories/production-orders.repository';
import { StockReservationsRepository } from '../repositories/stock-reservations.repository';
import { db } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/errors';
import type {
  CreateProductionOrderDTO,
  UpdateProductionOrderDTO,
  ProductionOrderStatus,
  ProductionOrderPriority,
  CreateProductionReportingDTO,
} from '../repositories/production-orders.repository';

export class ProductionOrdersService {
  private repository: ProductionOrdersRepository;
  private reservationsRepository: StockReservationsRepository;

  constructor() {
    this.repository = new ProductionOrdersRepository();
    this.reservationsRepository = new StockReservationsRepository();
  }

  async findMany(params: {
    page: number;
    limit: number;
    status?: ProductionOrderStatus;
    priority?: ProductionOrderPriority;
    productId?: string;
    assignedTo?: string;
  }) {
    const { page, limit } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestError('Parâmetros de paginação inválidos');
    }

    return this.repository.findMany(params);
  }

  async findById(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    return order;
  }

  async create(data: CreateProductionOrderDTO) {
    // Validar quantidade
    if (data.quantityPlanned <= 0) {
      throw new BadRequestError('Quantidade planejada deve ser maior que zero');
    }

    // Verificar se produto existe
    const productQuery = `SELECT * FROM products WHERE id = $1`;
    const productResult = await db.query(productQuery, [data.productId]);

    if (productResult.rows.length === 0) {
      throw new NotFoundError('Produto não encontrado');
    }

    // Criar ordem
    const order = await this.repository.create(data);

    // Se tem BOM version, calcular materiais necessários
    if (data.bomVersionId) {
      await this.calculateAndCreateMaterialRequirements(order.id, data.productId, data.bomVersionId, data.quantityPlanned);
    }

    return order;
  }

  async update(id: string, data: UpdateProductionOrderDTO) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    // Validações de status
    if (data.status) {
      this.validateStatusTransition(existing.status, data.status);
    }

    // Validar quantidade
    if (data.quantityPlanned !== undefined && data.quantityPlanned <= 0) {
      throw new BadRequestError('Quantidade planejada deve ser maior que zero');
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    // Só permitir exclusão de ordens em DRAFT ou CANCELLED
    if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestError('Apenas ordens em DRAFT ou CANCELLED podem ser excluídas');
    }

    return this.repository.delete(id);
  }

  async getMaterialConsumption(orderId: string) {
    await this.findById(orderId); // Verifica se existe
    return this.repository.getMaterialConsumption(orderId);
  }

  async getOperations(orderId: string) {
    await this.findById(orderId); // Verifica se existe
    return this.repository.getOperations(orderId);
  }

  async getReportings(orderId: string) {
    await this.findById(orderId); // Verifica se existe
    return this.repository.getReportings(orderId);
  }

  /**
   * Libera a ordem de produção (status RELEASED)
   * - Verifica disponibilidade de materiais
   * - Cria reservas de estoque para componentes (feito via trigger no banco)
   */
  async release(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    // Validar status
    if (!['DRAFT', 'PLANNED'].includes(order.status)) {
      throw new BadRequestError('Apenas ordens em DRAFT ou PLANNED podem ser liberadas');
    }

    // Verificar disponibilidade de materiais
    const materials = await this.repository.getMaterialConsumption(id);

    for (const material of materials) {
      const productQuery = `SELECT current_stock, code, name FROM products WHERE id = $1`;
      const productResult = await db.query(productQuery, [material.productId]);

      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        const available = product.current_stock;
        const reserved = await this.reservationsRepository.getTotalReserved(material.productId);
        const availableStock = available - reserved;

        if (availableStock < material.quantityPlanned) {
          throw new BadRequestError(
            `Estoque insuficiente para ${product.code} - ${product.name}. Disponível: ${availableStock}, Necessário: ${material.quantityPlanned}`
          );
        }
      }
    }

    // Atualizar status para RELEASED
    // O trigger do banco irá criar as reservas automaticamente
    return this.repository.update(id, {
      status: 'RELEASED',
      actualStartDate: new Date().toISOString(),
    });
  }

  /**
   * Apontar produção
   * - Registra quantidade produzida e sucata
   * - Atualiza quantidades na ordem (via trigger)
   * - Atualiza status automaticamente se necessário
   */
  async report(id: string, data: CreateProductionReportingDTO) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    // Validar status
    if (!['RELEASED', 'IN_PROGRESS', 'PAUSED'].includes(order.status)) {
      throw new BadRequestError('Ordem não está em produção');
    }

    // Validar quantidades
    if (data.quantityProduced < 0 || (data.quantityScrapped && data.quantityScrapped < 0)) {
      throw new BadRequestError('Quantidades não podem ser negativas');
    }

    const totalReported = data.quantityProduced + (data.quantityScrapped || 0);
    const newTotal = order.quantityProduced + order.quantityScrapped + totalReported;

    if (newTotal > order.quantityPlanned) {
      throw new BadRequestError(
        `Total apontado (${newTotal}) excede quantidade planejada (${order.quantityPlanned})`
      );
    }

    // Criar apontamento
    const reporting = await this.repository.createReporting({
      ...data,
      productionOrderId: id,
    });

    // Atualizar status para IN_PROGRESS se estava RELEASED
    if (order.status === 'RELEASED') {
      await this.repository.update(id, { status: 'IN_PROGRESS' });
    }

    return reporting;
  }

  /**
   * Completar ordem de produção
   * - Valida se quantidade produzida é suficiente
   * - Consome materiais planejados
   * - Adiciona produtos finais ao estoque (via trigger)
   * - Libera reservas não utilizadas
   */
  async complete(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    // Validar status
    if (!['IN_PROGRESS', 'PAUSED'].includes(order.status)) {
      throw new BadRequestError('Apenas ordens em IN_PROGRESS ou PAUSED podem ser completadas');
    }

    // Validar se produziu algo
    if (order.quantityProduced === 0) {
      throw new BadRequestError('Nenhuma quantidade foi produzida');
    }

    // Consumir materiais planejados
    await this.consumeMaterials(id, order.quantityProduced);

    // Cancelar reservas restantes
    await this.cancelRemainingReservations(id);

    // Atualizar status para COMPLETED
    // O trigger do banco irá adicionar os produtos finais ao estoque automaticamente
    return this.repository.update(id, {
      status: 'COMPLETED',
      actualEndDate: new Date().toISOString(),
    });
  }

  /**
   * Pausar ordem de produção
   */
  async pause(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Apenas ordens em IN_PROGRESS podem ser pausadas');
    }

    return this.repository.update(id, { status: 'PAUSED' });
  }

  /**
   * Retomar ordem pausada
   */
  async resume(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    if (order.status !== 'PAUSED') {
      throw new BadRequestError('Apenas ordens em PAUSED podem ser retomadas');
    }

    return this.repository.update(id, { status: 'IN_PROGRESS' });
  }

  /**
   * Cancelar ordem de produção
   */
  async cancel(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de produção não encontrada');
    }

    // Não permitir cancelar se já completada
    if (['COMPLETED', 'CLOSED'].includes(order.status)) {
      throw new BadRequestError('Ordens completadas não podem ser canceladas');
    }

    // Cancelar reservas
    await this.cancelRemainingReservations(id);

    return this.repository.update(id, { status: 'CANCELLED' });
  }

  // Private helper methods

  private async calculateAndCreateMaterialRequirements(
    orderId: string,
    productId: string,
    bomVersionId: string,
    quantity: number
  ) {
    // Buscar itens do BOM
    const bomQuery = `
      SELECT
        bi.*,
        p.cost_price as product_cost_price
      FROM bom_items bi
      LEFT JOIN products p ON bi.component_id = p.id
      WHERE bi.product_id = $1 AND bi.bom_version_id = $2
    `;
    const bomResult = await db.query(bomQuery, [productId, bomVersionId]);

    if (bomResult.rows.length === 0) {
      throw new BadRequestError('BOM não possui itens cadastrados');
    }

    // Criar consumo de materiais para cada item do BOM
    for (const item of bomResult.rows) {
      const quantityNeeded = item.quantity * quantity;
      const scrapPercentage = item.scrap_percentage || 0;
      const quantityWithScrap = quantityNeeded * (1 + scrapPercentage / 100);

      await this.repository.createMaterialConsumption({
        productionOrderId: orderId,
        productId: item.component_id,
        bomItemId: item.id,
        quantityPlanned: Math.ceil(quantityWithScrap),
        unitCost: item.product_cost_price,
      });
    }
  }

  private async consumeMaterials(orderId: string, quantityProduced: number) {
    const materials = await this.repository.getMaterialConsumption(orderId);

    for (const material of materials) {
      // Calcular quantidade proporcional baseado no que foi produzido
      const consumptionRatio = quantityProduced / (await this.getOrderQuantityPlanned(orderId));
      const quantityToConsume = Math.ceil(material.quantityPlanned * consumptionRatio);

      // Atualizar consumo
      await this.repository.updateMaterialConsumption(material.id, {
        quantityConsumed: quantityToConsume,
      });
    }
  }

  private async getOrderQuantityPlanned(orderId: string): Promise<number> {
    const order = await this.repository.findById(orderId);
    return order?.quantityPlanned || 1;
  }

  private async cancelRemainingReservations(orderId: string) {
    // Buscar reservas ativas para esta ordem
    const reservationsQuery = `
      SELECT id FROM stock_reservations
      WHERE reserved_for_type = 'PRODUCTION_ORDER'
        AND reserved_for_id = $1
        AND status = 'ACTIVE'
    `;
    const reservationsResult = await db.query(reservationsQuery, [orderId]);

    if (reservationsResult.rows.length > 0) {
      for (const reservation of reservationsResult.rows) {
        await this.reservationsRepository.update(reservation.id, {
          status: 'CANCELLED',
        });
      }
    }
  }

  private validateStatusTransition(currentStatus: ProductionOrderStatus, newStatus: ProductionOrderStatus) {
    const validTransitions: Record<ProductionOrderStatus, ProductionOrderStatus[]> = {
      DRAFT: ['PLANNED', 'CANCELLED'],
      PLANNED: ['RELEASED', 'CANCELLED'],
      RELEASED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
      PAUSED: ['IN_PROGRESS', 'CANCELLED'],
      COMPLETED: ['CLOSED'],
      CANCELLED: [],
      CLOSED: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Transição de status inválida: ${currentStatus} -> ${newStatus}`
      );
    }
  }
}
