import {
  GoodsReceiptsRepository,
  CreateGoodsReceiptDTO,
  UpdateGoodsReceiptDTO,
  CreateGoodsReceiptItemDTO,
  ApproveReceiptItemDTO
} from '../repositories/goods-receipts.repository';
import { PurchaseOrdersRepository } from '../repositories/purchase-orders.repository';

export class GoodsReceiptsService {
  private repository: GoodsReceiptsRepository;
  private purchaseOrdersRepository: PurchaseOrdersRepository;

  constructor() {
    this.repository = new GoodsReceiptsRepository();
    this.purchaseOrdersRepository = new PurchaseOrdersRepository();
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    supplierId?: string;
    purchaseOrderId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    return this.repository.findMany({
      page,
      limit,
      search: params.search,
      status: params.status,
      supplierId: params.supplierId,
      purchaseOrderId: params.purchaseOrderId,
    });
  }

  async findById(id: string) {
    const receipt = await this.repository.findById(id);

    if (!receipt) {
      throw new Error('Recebimento não encontrado');
    }

    return receipt;
  }

  async findByReceiptNumber(receiptNumber: string) {
    const receipt = await this.repository.findByReceiptNumber(receiptNumber);

    if (!receipt) {
      throw new Error('Recebimento não encontrado');
    }

    return receipt;
  }

  async create(receiptData: CreateGoodsReceiptDTO) {
    // Validações
    await this.validateCreateReceipt(receiptData);

    // Valida itens
    if (!receiptData.items || receiptData.items.length === 0) {
      throw new Error('O recebimento deve ter pelo menos um item');
    }

    receiptData.items.forEach((item, index) => {
      this.validateReceiptItem(item, index);
    });

    // Se tem ordem de compra, valida contra ela
    if (receiptData.purchaseOrderId) {
      await this.validateAgainstPurchaseOrder(receiptData);
    }

    return this.repository.create(receiptData);
  }

  async update(id: string, receiptData: UpdateGoodsReceiptDTO) {
    // Verifica se o recebimento existe
    const receipt = await this.findById(id);

    // Não permite atualizar recebimentos aprovados
    if (receipt.status === 'APPROVED' && receiptData.status !== 'RETURNED') {
      throw new Error('Recebimentos aprovados não podem ser modificados');
    }

    // Validações
    this.validateUpdateReceipt(receiptData);

    return this.repository.update(id, receiptData);
  }

  async delete(id: string) {
    // Verifica se o recebimento existe
    const receipt = await this.findById(id);

    // Não permite deletar recebimentos aprovados
    if (receipt.status === 'APPROVED') {
      throw new Error('Recebimentos aprovados não podem ser deletados');
    }

    return this.repository.delete(id);
  }

  async updateStatus(id: string, status: string) {
    // Verifica se o recebimento existe
    const receipt = await this.findById(id);

    // Valida transições de status
    this.validateStatusTransition(receipt.status, status);

    return this.repository.update(id, { status: status as any });
  }

  // Gerenciamento de itens
  async getItems(receiptId: string) {
    // Verifica se o recebimento existe
    await this.findById(receiptId);

    return this.repository.getItems(receiptId);
  }

  async addItem(receiptId: string, item: CreateGoodsReceiptItemDTO) {
    // Verifica se o recebimento existe
    const receipt = await this.findById(receiptId);

    // Só permite adicionar itens em recebimentos pendentes
    if (receipt.status !== 'PENDING') {
      throw new Error('Apenas recebimentos pendentes podem ter itens adicionados');
    }

    // Valida o item
    this.validateReceiptItem(item);

    return this.repository.addItem(receiptId, item);
  }

  async updateItem(itemId: string, itemData: Partial<CreateGoodsReceiptItemDTO>) {
    // Valida os dados do item se fornecidos
    if (itemData.quantityReceived !== undefined && itemData.quantityReceived < 0) {
      throw new Error('Quantidade recebida não pode ser negativa');
    }

    if (itemData.unitPrice !== undefined && itemData.unitPrice < 0) {
      throw new Error('Preço unitário não pode ser negativo');
    }

    return this.repository.updateItem(itemId, itemData);
  }

  async deleteItem(itemId: string) {
    return this.repository.deleteItem(itemId);
  }

  // Controle de qualidade
  async inspectItem(itemId: string, approvalData: ApproveReceiptItemDTO) {
    // Validações
    this.validateItemApproval(approvalData);

    return this.repository.approveItem(itemId, approvalData);
  }

  async approveReceipt(receiptId: string, approvedBy: string) {
    // Verifica se o recebimento existe
    const receipt = await this.findById(receiptId);

    // Verifica se já está aprovado
    if (receipt.status === 'APPROVED') {
      throw new Error('Recebimento já foi aprovado');
    }

    // Aprova o recebimento (atualiza estoque automaticamente via trigger)
    return this.repository.approveReceipt(receiptId, approvedBy);
  }

  async rejectReceipt(receiptId: string, inspectedBy: string, reason: string) {
    // Verifica se o recebimento existe
    await this.findById(receiptId);

    return this.repository.update(receiptId, {
      status: 'REJECTED',
      inspectedBy,
      notes: reason,
    });
  }

  // Relatórios e estatísticas
  async getReceiptsBySupplier(supplierId: string) {
    return this.repository.findMany({
      page: 1,
      limit: 1000,
      supplierId,
    });
  }

  async getPendingInspections() {
    return this.repository.findMany({
      page: 1,
      limit: 1000,
      status: 'PENDING',
    });
  }

  async getReceiptsByPurchaseOrder(purchaseOrderId: string) {
    return this.repository.findMany({
      page: 1,
      limit: 1000,
      purchaseOrderId,
    });
  }

  // Validações privadas
  private async validateCreateReceipt(receiptData: CreateGoodsReceiptDTO) {
    if (!receiptData.supplierId) {
      throw new Error('ID do fornecedor é obrigatório');
    }

    if (receiptData.receiptDate) {
      const receiptDate = new Date(receiptData.receiptDate);
      const today = new Date();

      // Permite data futura com até 1 dia de tolerância
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 1);

      if (receiptDate > maxDate) {
        throw new Error('Data de recebimento não pode ser muito futura');
      }
    }

    if (receiptData.invoiceDate && receiptData.receiptDate) {
      const invoiceDate = new Date(receiptData.invoiceDate);
      const receiptDate = new Date(receiptData.receiptDate);

      // Nota fiscal não pode ser muito posterior ao recebimento
      const maxInvoiceDate = new Date(receiptDate);
      maxInvoiceDate.setDate(maxInvoiceDate.getDate() + 7);

      if (invoiceDate > maxInvoiceDate) {
        throw new Error('Data da nota fiscal não pode ser muito posterior ao recebimento');
      }
    }
  }

  private validateUpdateReceipt(receiptData: UpdateGoodsReceiptDTO) {
    if (receiptData.status) {
      const validStatuses = ['PENDING', 'INSPECTED', 'APPROVED', 'REJECTED', 'RETURNED'];
      if (!validStatuses.includes(receiptData.status)) {
        throw new Error(`Status inválido. Valores aceitos: ${validStatuses.join(', ')}`);
      }
    }

    if (receiptData.qualityCheckStatus) {
      const validQualityStatuses = ['PENDING', 'PASSED', 'FAILED', 'PARTIAL'];
      if (!validQualityStatuses.includes(receiptData.qualityCheckStatus)) {
        throw new Error(`Status de qualidade inválido. Valores aceitos: ${validQualityStatuses.join(', ')}`);
      }
    }
  }

  private validateReceiptItem(item: CreateGoodsReceiptItemDTO, index?: number) {
    const prefix = index !== undefined ? `Item ${index + 1}: ` : '';

    if (!item.productId) {
      throw new Error(`${prefix}ID do produto é obrigatório`);
    }

    if (item.quantityReceived === undefined || item.quantityReceived < 0) {
      throw new Error(`${prefix}Quantidade recebida não pode ser negativa`);
    }

    if (item.unitPrice !== undefined && item.unitPrice < 0) {
      throw new Error(`${prefix}Preço unitário não pode ser negativo`);
    }

    if (item.expiryDate) {
      const expiryDate = new Date(item.expiryDate);
      const today = new Date();

      if (expiryDate < today) {
        console.warn(`${prefix}Data de validade já passou`);
      }
    }
  }

  private validateItemApproval(approvalData: ApproveReceiptItemDTO) {
    if (approvalData.quantityAccepted < 0) {
      throw new Error('Quantidade aceita não pode ser negativa');
    }

    if (approvalData.quantityRejected < 0) {
      throw new Error('Quantidade rejeitada não pode ser negativa');
    }

    if (approvalData.quantityAccepted === 0 && approvalData.quantityRejected === 0) {
      throw new Error('Deve haver pelo menos uma quantidade aceita ou rejeitada');
    }

    if (!approvalData.qualityStatus) {
      throw new Error('Status de qualidade é obrigatório');
    }

    if (approvalData.qualityStatus === 'REJECTED' && !approvalData.rejectionReason) {
      throw new Error('Motivo da rejeição é obrigatório para itens rejeitados');
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['INSPECTED', 'APPROVED', 'REJECTED'],
      INSPECTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['RETURNED'],
      REJECTED: ['PENDING'],
      RETURNED: ['PENDING'],
    };

    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Transição de status inválida: ${currentStatus} -> ${newStatus}`);
    }
  }

  private async validateAgainstPurchaseOrder(receiptData: CreateGoodsReceiptDTO) {
    if (!receiptData.purchaseOrderId) return;

    // Busca a ordem de compra
    const purchaseOrder = await this.purchaseOrdersRepository.findById(receiptData.purchaseOrderId);

    if (!purchaseOrder) {
      throw new Error('Ordem de compra não encontrada');
    }

    // Verifica se a ordem está em um status válido para recebimento
    const validStatuses = ['SENT', 'CONFIRMED', 'PARTIAL'];
    if (!validStatuses.includes(purchaseOrder.status)) {
      throw new Error(`Ordem de compra no status ${purchaseOrder.status} não pode receber mercadorias`);
    }

    // Verifica se o fornecedor é o mesmo
    if (purchaseOrder.supplierId !== receiptData.supplierId) {
      throw new Error('Fornecedor do recebimento não corresponde ao fornecedor da ordem de compra');
    }

    // Busca os itens da ordem
    const orderItems = await this.purchaseOrdersRepository.getItems(receiptData.purchaseOrderId);

    // Valida cada item do recebimento contra a ordem
    for (const receiptItem of receiptData.items) {
      if (!receiptItem.purchaseOrderItemId) continue;

      const orderItem = orderItems.find(oi => oi.id === receiptItem.purchaseOrderItemId);

      if (!orderItem) {
        throw new Error(`Item da ordem de compra não encontrado: ${receiptItem.purchaseOrderItemId}`);
      }

      // Verifica se o produto corresponde
      if (orderItem.productId !== receiptItem.productId) {
        throw new Error(`Produto do item não corresponde ao da ordem de compra`);
      }

      // Verifica se não está recebendo mais do que o pedido
      const totalReceived = orderItem.quantityReceived + receiptItem.quantityReceived;
      if (totalReceived > orderItem.quantity) {
        throw new Error(
          `Quantidade recebida (${totalReceived}) excede a quantidade pedida (${orderItem.quantity}) para o produto`
        );
      }

      // Aviso se o preço for muito diferente
      if (receiptItem.unitPrice && orderItem.unitPrice) {
        const priceDiff = Math.abs(receiptItem.unitPrice - orderItem.unitPrice);
        const diffPercentage = (priceDiff / orderItem.unitPrice) * 100;

        if (diffPercentage > 10) {
          console.warn(
            `Preço do item no recebimento difere em ${diffPercentage.toFixed(2)}% do preço na ordem de compra`
          );
        }
      }
    }
  }
}
