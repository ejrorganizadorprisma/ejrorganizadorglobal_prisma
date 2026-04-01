import {
  SupplierOrdersRepository,
  type CreateSupplierOrderDTO,
  type UpdateSupplierOrderDTO,
} from '../repositories/supplier-orders.repository';
import { PurchaseOrdersRepository } from '../repositories/purchase-orders.repository';
import { ProductSuppliersRepository } from '../repositories/product-suppliers.repository';
import { SuppliersRepository } from '../repositories/suppliers.repository';
import { AppError } from '../utils/errors';
import { db } from '../config/database';

export class SupplierOrdersService {
  private repository: SupplierOrdersRepository;
  private purchaseOrdersRepository: PurchaseOrdersRepository;
  private productSuppliersRepository: ProductSuppliersRepository;
  private suppliersRepository: SuppliersRepository;

  constructor() {
    this.repository = new SupplierOrdersRepository();
    this.purchaseOrdersRepository = new PurchaseOrdersRepository();
    this.productSuppliersRepository = new ProductSuppliersRepository();
    this.suppliersRepository = new SuppliersRepository();
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    supplierId?: string;
    purchaseOrderId?: string;
    groupCode?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.repository.findMany({
      page: params.page || 1,
      limit: params.limit || 20,
      search: params.search,
      status: params.status,
      supplierId: params.supplierId,
      purchaseOrderId: params.purchaseOrderId,
      groupCode: params.groupCode,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  }

  async findById(id: string) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new AppError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND');
    }
    return order;
  }

  async findByGroupCode(groupCode: string) {
    return this.repository.findByGroupCode(groupCode);
  }

  async findByPurchaseOrderId(purchaseOrderId: string) {
    return this.repository.findByPurchaseOrderId(purchaseOrderId);
  }

  /**
   * Gera pedidos por fornecedor a partir de uma ordem de compra
   * Agrupa os itens por fornecedor e cria um pedido para cada
   */
  async generateFromPurchaseOrder(purchaseOrderId: string, userId: string) {
    // 1. Buscar ordem de compra
    const purchaseOrder = await this.purchaseOrdersRepository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new AppError('Ordem de compra não encontrada', 404, 'PURCHASE_ORDER_NOT_FOUND');
    }

    // 2. Buscar itens da ordem de compra
    const items = await this.purchaseOrdersRepository.getItems(purchaseOrderId);
    if (!items || items.length === 0) {
      throw new AppError('Ordem de compra não possui itens', 400, 'NO_ITEMS');
    }

    // 3. Verificar se todos os itens têm fornecedor definido
    const itemsWithoutSupplier: string[] = [];
    for (const item of items) {
      // Buscar supplier_id do item (adicionado na migration)
      const itemQuery = `SELECT supplier_id FROM purchase_order_items WHERE id = $1`;
      const itemResult = await db.query(itemQuery, [item.id]);
      const itemData = itemResult.rows[0];

      if (!itemData?.supplier_id) {
        // Tentar buscar fornecedor preferencial do produto
        const productSuppliers = await this.productSuppliersRepository.findByProductId(item.productId);
        const preferredSupplier = productSuppliers.find(ps => ps.isPreferred);

        if (!preferredSupplier) {
          itemsWithoutSupplier.push((item as any).product?.name || item.productId);
        }
      }
    }

    if (itemsWithoutSupplier.length > 0) {
      throw new AppError(
        `Os seguintes produtos não têm fornecedor definido: ${itemsWithoutSupplier.join(', ')}`,
        400,
        'ITEMS_WITHOUT_SUPPLIER'
      );
    }

    // 4. Agrupar itens por fornecedor
    const itemsBySupplier = new Map<string, any[]>();

    for (const item of items) {
      // Buscar supplier_id do item
      const itemQuery = `SELECT supplier_id, set_as_preferred_supplier FROM purchase_order_items WHERE id = $1`;
      const itemResult = await db.query(itemQuery, [item.id]);
      const itemData = itemResult.rows[0];

      let supplierId = itemData?.supplier_id;

      // Se não tem supplier_id, usar fornecedor preferencial
      if (!supplierId) {
        const productSuppliers = await this.productSuppliersRepository.findByProductId(item.productId);
        const preferredSupplier = productSuppliers.find(ps => ps.isPreferred);
        supplierId = preferredSupplier?.supplierId;

        // Atualizar o item com o supplier_id
        if (supplierId) {
          const updateQuery = `UPDATE purchase_order_items SET supplier_id = $1 WHERE id = $2`;
          await db.query(updateQuery, [supplierId, item.id]);
        }
      }

      // Se marcou para definir como fornecedor padrão
      if (itemData?.set_as_preferred_supplier && supplierId) {
        await this.setPreferredSupplier(item.productId, supplierId);
      }

      if (!supplierId) continue;

      if (!itemsBySupplier.has(supplierId)) {
        itemsBySupplier.set(supplierId, []);
      }

      itemsBySupplier.get(supplierId)!.push({
        ...item,
        supplierId,
      });
    }

    // 5. Gerar código de grupo
    const groupCode = this.repository.generateGroupCode(purchaseOrder.orderNumber);

    // 6. Criar um pedido para cada fornecedor
    const createdOrders = [];

    for (const [supplierId, supplierItems] of itemsBySupplier) {
      const supplier = await this.suppliersRepository.findById(supplierId);

      const orderData: CreateSupplierOrderDTO = {
        supplierId,
        purchaseOrderId,
        groupCode,
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
        paymentTerms: purchaseOrder.paymentTerms,
        notes: `Gerado automaticamente da OC ${purchaseOrder.orderNumber}`,
        internalNotes: purchaseOrder.internalNotes,
        createdBy: userId,
        items: supplierItems.map(item => ({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage || 0,
          expectedDeliveryDate: item.expectedDeliveryDate,
          notes: item.notes,
        })),
      };

      const order = await this.repository.create(orderData);
      createdOrders.push({
        ...order,
        supplierName: supplier?.name || 'Fornecedor',
        itemCount: supplierItems.length,
      });

      console.log(`✅ Pedido ${order.orderNumber} criado para ${supplier?.name || supplierId}`);
    }

    // 7. Atualizar status da OC para indicar que pedidos foram gerados
    await this.purchaseOrdersRepository.update(purchaseOrderId, {
      internalNotes: `${purchaseOrder.internalNotes || ''}\n\n[${new Date().toLocaleDateString('pt-BR')}] Pedidos gerados: ${createdOrders.map(o => o.orderNumber).join(', ')}`.trim(),
    });

    return {
      groupCode,
      totalOrders: createdOrders.length,
      orders: createdOrders,
    };
  }

  /**
   * Define um fornecedor como preferencial para um produto
   */
  private async setPreferredSupplier(productId: string, supplierId: string) {
    // Remover flag de preferencial de outros fornecedores
    const updateQuery = `
      UPDATE product_suppliers
      SET is_preferred = false
      WHERE product_id = $1 AND supplier_id != $2
    `;
    await db.query(updateQuery, [productId, supplierId]);

    // Verificar se já existe relação produto-fornecedor
    const checkQuery = `
      SELECT id FROM product_suppliers
      WHERE product_id = $1 AND supplier_id = $2
    `;
    const checkResult = await db.query(checkQuery, [productId, supplierId]);

    if (checkResult.rows.length > 0) {
      // Atualizar como preferencial
      const updatePreferredQuery = `
        UPDATE product_suppliers
        SET is_preferred = true
        WHERE id = $1
      `;
      await db.query(updatePreferredQuery, [checkResult.rows[0].id]);
    } else {
      // Criar nova relação como preferencial
      const insertQuery = `
        INSERT INTO product_suppliers (product_id, supplier_id, is_preferred)
        VALUES ($1, $2, true)
      `;
      await db.query(insertQuery, [productId, supplierId]);
    }

    console.log(`✅ Fornecedor ${supplierId} definido como preferencial para produto ${productId}`);
  }

  async update(id: string, dto: UpdateSupplierOrderDTO) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new AppError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND');
    }

    // Validar transições de status
    if (dto.status) {
      this.validateStatusTransition(order.status, dto.status);
    }

    return this.repository.update(id, dto);
  }

  async send(id: string) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new AppError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'PENDING') {
      throw new AppError('Somente pedidos pendentes podem ser enviados', 400, 'INVALID_STATUS');
    }

    return this.repository.update(id, { status: 'SENT' });
  }

  async confirm(id: string) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new AppError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'SENT') {
      throw new AppError('Somente pedidos enviados podem ser confirmados', 400, 'INVALID_STATUS');
    }

    return this.repository.update(id, { status: 'CONFIRMED' });
  }

  async cancel(id: string) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new AppError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new AppError('Este pedido não pode ser cancelado', 400, 'INVALID_STATUS');
    }

    return this.repository.update(id, { status: 'CANCELLED' });
  }

  async delete(id: string) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new AppError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'PENDING') {
      throw new AppError('Somente pedidos pendentes podem ser deletados', 400, 'INVALID_STATUS');
    }

    return this.repository.delete(id);
  }

  async getItems(orderId: string) {
    return this.repository.getItems(orderId);
  }

  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['SENT', 'CANCELLED'],
      SENT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
      PARTIAL: ['RECEIVED'],
      RECEIVED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        `Transição de status inválida: ${currentStatus} -> ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }
}
