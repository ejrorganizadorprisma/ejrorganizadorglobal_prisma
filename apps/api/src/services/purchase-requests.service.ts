import {
  PurchaseRequestsRepository,
  type CreatePurchaseRequestDTO,
  type UpdatePurchaseRequestDTO,
  type ReviewPurchaseRequestDTO,
  type PurchaseRequestStatus,
  type PurchaseRequestPriority,
} from '../repositories/purchase-requests.repository';
import { PurchaseOrdersRepository } from '../repositories/purchase-orders.repository';
import { AppError } from '../utils/errors';

export class PurchaseRequestsService {
  private repository: PurchaseRequestsRepository;
  private purchaseOrdersRepository: PurchaseOrdersRepository;

  constructor() {
    this.repository = new PurchaseRequestsRepository();
    this.purchaseOrdersRepository = new PurchaseOrdersRepository();
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    status?: PurchaseRequestStatus;
    priority?: PurchaseRequestPriority;
    requestedBy?: string;
  }) {
    return this.repository.findMany({
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status,
      priority: params.priority,
      requestedBy: params.requestedBy,
    });
  }

  async findById(id: string) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new AppError('Requisição não encontrada', 404, 'REQUEST_NOT_FOUND');
    }

    // Get items
    const items = await this.repository.getItems(id);
    return { ...request, items };
  }

  async create(dto: CreatePurchaseRequestDTO) {
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdatePurchaseRequestDTO) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new AppError('Requisição não encontrada', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
      throw new AppError(
        'Somente requisições pendentes podem ser editadas',
        400,
        'INVALID_STATUS'
      );
    }

    return this.repository.update(id, dto);
  }

  async review(id: string, dto: ReviewPurchaseRequestDTO) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new AppError('Requisição não encontrada', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
      throw new AppError(
        'Somente requisições pendentes podem ser revisadas',
        400,
        'INVALID_STATUS'
      );
    }

    return this.repository.review(id, dto);
  }

  async convertToPurchaseOrder(id: string, userId: string) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new AppError('Requisição não encontrada', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.status !== 'APPROVED') {
      throw new AppError(
        'Somente requisições aprovadas podem ser convertidas',
        400,
        'INVALID_STATUS'
      );
    }

    if (request.convertedToPurchaseOrderId) {
      throw new AppError(
        'Requisição já foi convertida',
        400,
        'ALREADY_CONVERTED'
      );
    }

    // Get items
    const items = await this.repository.getItems(id);
    if (!items || items.length === 0) {
      throw new AppError(
        'Requisição não possui itens',
        400,
        'NO_ITEMS'
      );
    }

    console.log('📦 Iniciando conversão para ordem(s) de compra...');
    console.log(`   Total de itens: ${items.length}`);

    // Group items by preferred supplier
    const itemsBySupplier = await this.groupItemsBySupplier(items);

    console.log(`   Agrupados em ${itemsBySupplier.size} fornecedor(es)`);

    // Create one purchase order for each supplier
    const purchaseOrders = [];
    let firstOrderId: string | null = null;

    for (const [supplierId, supplierItems] of itemsBySupplier) {
      const supplierName = supplierId ? supplierItems[0].supplierName : 'Sem fornecedor definido';
      console.log(`   Criando OC para: ${supplierName} (${supplierItems.length} itens)`);

      const purchaseOrder = await this.purchaseOrdersRepository.create({
        name: request.title,
        supplierId: supplierId || null,
        purchaseRequestId: id,
        expectedDeliveryDate: undefined,
        paymentTerms: undefined,
        notes: `Criada automaticamente da requisição ${request.requestNumber}\nFornecedor: ${supplierName}\n${request.justification || ''}`,
        internalNotes: `Solicitado por: ${request.requestedByUser?.name || request.requestedBy}`,
        createdBy: userId,
        items: supplierItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          discountPercentage: 0,
          notes: item.notes,
        })),
      });

      purchaseOrders.push(purchaseOrder);
      if (!firstOrderId) {
        firstOrderId = purchaseOrder.id;
      }

      console.log(`   ✅ OC criada: ${purchaseOrder.orderNumber}`);
    }

    // Mark request as converted (use first order ID for reference)
    console.log('🔄 Marcando requisição como convertida...');
    await this.repository.markAsConverted(id, firstOrderId!);
    console.log(`✅ ${purchaseOrders.length} ordem(s) de compra criada(s) com sucesso`);

    // Return response with all created orders
    return {
      id: firstOrderId!,
      orderNumber: purchaseOrders[0].orderNumber,
      totalOrders: purchaseOrders.length,
      orders: purchaseOrders.map(po => ({
        id: po.id,
        orderNumber: po.orderNumber,
        supplierId: po.supplierId,
        supplierName: po.supplier?.name || 'Sem fornecedor',
        itemCount: purchaseOrders.find(p => p.id === po.id) ?
          itemsBySupplier.get(po.supplierId || 'no-supplier')?.length || 0 : 0,
      })),
    };
  }

  private async groupItemsBySupplier(items: any[]): Promise<Map<string | null, any[]>> {
    const { db } = await import('../config/database');
    const grouped = new Map<string | null, any[]>();

    for (const item of items) {
      // Get preferred supplier for this product
      const result = await db.query(`
        SELECT
          ps.supplier_id,
          s.id as supplier_id,
          s.name as supplier_name
        FROM product_suppliers ps
        INNER JOIN suppliers s ON ps.supplier_id = s.id
        WHERE ps.product_id = $1 AND ps.is_preferred = true
        LIMIT 1
      `, [item.productId]);

      const productSuppliers = result.rows[0];
      const supplierId = productSuppliers?.supplier_id || null;
      const supplierName = productSuppliers?.supplier_name || 'Sem fornecedor';

      if (!grouped.has(supplierId)) {
        grouped.set(supplierId, []);
      }

      grouped.get(supplierId)!.push({
        ...item,
        supplierId,
        supplierName,
      });
    }

    return grouped;
  }

  async delete(id: string) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new AppError('Requisição não encontrada', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.status === 'CONVERTED') {
      throw new AppError(
        'Requisições convertidas não podem ser deletadas',
        400,
        'ALREADY_CONVERTED'
      );
    }

    return this.repository.delete(id);
  }

  async getItems(requestId: string) {
    return this.repository.getItems(requestId);
  }
}
