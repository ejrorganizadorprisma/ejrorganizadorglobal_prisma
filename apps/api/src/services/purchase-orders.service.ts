import {
  PurchaseOrdersRepository,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  CreatePurchaseOrderItemDTO
} from '../repositories/purchase-orders.repository';

export class PurchaseOrdersService {
  private repository: PurchaseOrdersRepository;

  constructor() {
    this.repository = new PurchaseOrdersRepository();
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    supplierId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    return this.repository.findMany({
      page,
      limit,
      search: params.search,
      status: params.status,
      supplierId: params.supplierId,
    });
  }

  async findById(id: string) {
    const order = await this.repository.findById(id);

    if (!order) {
      throw new Error('Ordem de compra não encontrada');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.repository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new Error('Ordem de compra não encontrada');
    }

    return order;
  }

  async create(orderData: CreatePurchaseOrderDTO) {
    // Validações
    this.validateCreateOrder(orderData);

    // Valida itens
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('A ordem deve ter pelo menos um item');
    }

    orderData.items.forEach((item, index) => {
      this.validateOrderItem(item, index);
    });

    return this.repository.create(orderData);
  }

  async update(id: string, orderData: UpdatePurchaseOrderDTO) {
    // Verifica se a ordem existe
    await this.findById(id);

    // Validações
    this.validateUpdateOrder(orderData);

    return this.repository.update(id, orderData);
  }

  async delete(id: string) {
    // Verifica se a ordem existe
    const order = await this.findById(id);

    // Não permite deletar ordens que já foram enviadas ou recebidas
    if (order.status !== 'DRAFT' && order.status !== 'CANCELLED') {
      throw new Error('Apenas ordens em rascunho ou canceladas podem ser deletadas');
    }

    return this.repository.delete(id);
  }

  async updateStatus(id: string, status: string) {
    // Verifica se a ordem existe
    const order = await this.findById(id);

    // Valida transições de status
    this.validateStatusTransition(order.status, status);

    return this.repository.updateOrderStatus(id, status);
  }

  async sendOrder(id: string) {
    return this.updateStatus(id, 'SENT');
  }

  async confirmOrder(id: string) {
    return this.updateStatus(id, 'CONFIRMED');
  }

  async cancelOrder(id: string) {
    return this.updateStatus(id, 'CANCELLED');
  }

  async approveOrder(id: string, approvedBy: string) {
    // Verifica se a ordem existe
    await this.findById(id);

    return this.repository.update(id, {
      status: 'SENT',
      approvedBy,
    });
  }

  // Gerenciamento de itens
  async getItems(orderId: string) {
    // Verifica se a ordem existe
    await this.findById(orderId);

    return this.repository.getItems(orderId);
  }

  async addItem(orderId: string, item: CreatePurchaseOrderItemDTO) {
    // Verifica se a ordem existe
    const order = await this.findById(orderId);

    // Só permite adicionar itens em ordens em rascunho
    if (order.status !== 'DRAFT') {
      throw new Error('Apenas ordens em rascunho podem ter itens adicionados');
    }

    // Valida o item
    this.validateOrderItem(item);

    return this.repository.addItem(orderId, item);
  }

  async updateItem(itemId: string, itemData: Partial<CreatePurchaseOrderItemDTO>) {
    // Busca o item para verificar a ordem
    const items = await this.repository.getItems('');

    // Valida os dados do item se fornecidos
    if (itemData.quantity !== undefined && itemData.quantity <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    if (itemData.unitPrice !== undefined && itemData.unitPrice < 0) {
      throw new Error('Preço unitário não pode ser negativo');
    }

    if (itemData.taxRate !== undefined && (itemData.taxRate < 0 || itemData.taxRate > 100)) {
      throw new Error('Taxa de imposto deve estar entre 0 e 100');
    }

    if (itemData.discountPercentage !== undefined && (itemData.discountPercentage < 0 || itemData.discountPercentage > 100)) {
      throw new Error('Desconto deve estar entre 0 e 100');
    }

    return this.repository.updateItem(itemId, itemData);
  }

  async deleteItem(itemId: string) {
    return this.repository.deleteItem(itemId);
  }

  // Relatórios e estatísticas
  async getOrdersBySupplier(supplierId: string) {
    return this.repository.findMany({
      page: 1,
      limit: 1000,
      supplierId,
    });
  }

  async getPendingOrders() {
    return this.repository.findMany({
      page: 1,
      limit: 1000,
      status: 'SENT',
    });
  }

  async getOrdersWithPendingDelivery() {
    const result = await this.repository.findMany({
      page: 1,
      limit: 1000,
    });

    // Filtra ordens com entregas pendentes
    const pendingDeliveries = result.data.filter(order => {
      if (!order.expectedDeliveryDate || order.status === 'RECEIVED' || order.status === 'CANCELLED') {
        return false;
      }

      const expectedDate = new Date(order.expectedDeliveryDate);
      const today = new Date();

      return expectedDate <= today;
    });

    return pendingDeliveries;
  }

  // Validações privadas
  private validateCreateOrder(orderData: CreatePurchaseOrderDTO) {
    if (!orderData.supplierId) {
      throw new Error('ID do fornecedor é obrigatório');
    }

    // Validação de data de entrega removida - permitir qualquer data futura ou presente
  }

  private validateUpdateOrder(orderData: UpdatePurchaseOrderDTO) {
    if (orderData.status) {
      const validStatuses = ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];
      if (!validStatuses.includes(orderData.status)) {
        throw new Error(`Status inválido. Valores aceitos: ${validStatuses.join(', ')}`);
      }
    }

    if (orderData.paymentStatus) {
      const validPaymentStatuses = ['PENDING', 'PARTIAL', 'PAID'];
      if (!validPaymentStatuses.includes(orderData.paymentStatus)) {
        throw new Error(`Status de pagamento inválido. Valores aceitos: ${validPaymentStatuses.join(', ')}`);
      }
    }

    if (orderData.expectedDeliveryDate && orderData.actualDeliveryDate) {
      const expectedDate = new Date(orderData.expectedDeliveryDate);
      const actualDate = new Date(orderData.actualDeliveryDate);

      // Apenas aviso, não erro
      if (actualDate < expectedDate) {
        console.warn('Data de entrega real é anterior à data esperada');
      }
    }
  }

  private validateOrderItem(item: CreatePurchaseOrderItemDTO, index?: number) {
    const prefix = index !== undefined ? `Item ${index + 1}: ` : '';

    if (!item.productId) {
      throw new Error(`${prefix}ID do produto é obrigatório`);
    }

    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`${prefix}Quantidade deve ser maior que zero`);
    }

    if (item.unitPrice === undefined || item.unitPrice < 0) {
      throw new Error(`${prefix}Preço unitário não pode ser negativo`);
    }

    if (item.taxRate !== undefined && (item.taxRate < 0 || item.taxRate > 100)) {
      throw new Error(`${prefix}Taxa de imposto deve estar entre 0 e 100`);
    }

    if (item.discountPercentage !== undefined && (item.discountPercentage < 0 || item.discountPercentage > 100)) {
      throw new Error(`${prefix}Desconto deve estar entre 0 e 100`);
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
      PARTIAL: ['RECEIVED', 'CANCELLED'],
      RECEIVED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Transição de status inválida: ${currentStatus} -> ${newStatus}`);
    }
  }
}
