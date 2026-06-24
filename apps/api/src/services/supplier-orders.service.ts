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
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';

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

  // Status em que os itens do pedido ainda podem ser ajustados (antes do recebimento total)
  private static readonly EDITABLE_STATUSES = ['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'];

  private assertOrderEditable(status: string) {
    if (!SupplierOrdersService.EDITABLE_STATUSES.includes(status)) {
      throw new AppError(
        'Este pedido não pode mais ser editado (já recebido ou cancelado).',
        400,
        'ORDER_NOT_EDITABLE'
      );
    }
  }

  async updateItem(
    itemId: string,
    data: { quantity?: number; unitPrice?: number; discountPercentage?: number; notes?: string }
  ) {
    const ctx = await this.repository.getItemWithOrder(itemId);
    if (!ctx) {
      throw new AppError('Item não encontrado', 404, 'ITEM_NOT_FOUND');
    }
    this.assertOrderEditable(ctx.orderStatus);

    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }
    if (data.unitPrice !== undefined && data.unitPrice < 0) {
      throw new AppError('Preço unitário não pode ser negativo', 400, 'INVALID_PRICE');
    }
    if (data.discountPercentage !== undefined && (data.discountPercentage < 0 || data.discountPercentage > 100)) {
      throw new AppError('Desconto deve estar entre 0 e 100', 400, 'INVALID_DISCOUNT');
    }
    // Trava: não reduzir a quantidade abaixo do que já foi recebido
    if (data.quantity !== undefined && data.quantity < ctx.quantityReceived) {
      throw new AppError(
        `Não é possível reduzir a quantidade para menos do que já foi recebido (${ctx.quantityReceived}).`,
        400,
        'BELOW_RECEIVED'
      );
    }

    const updated = await this.repository.updateItem(itemId, data);

    // Propaga para o item da Ordem de Compra de origem (mantém OC e recebimento em sincronia)
    if (ctx.purchaseOrderItemId && (data.quantity !== undefined || data.unitPrice !== undefined)) {
      const poData: { quantity?: number; unitPrice?: number } = {};
      if (data.quantity !== undefined) poData.quantity = data.quantity;
      if (data.unitPrice !== undefined) poData.unitPrice = data.unitPrice;
      try {
        await this.purchaseOrdersRepository.updateItem(ctx.purchaseOrderItemId, poData);
      } catch (err: any) {
        console.error('Falha ao propagar edição do item para a OC:', err?.message || err);
      }
    }

    return updated;
  }

  async deleteItem(itemId: string) {
    const ctx = await this.repository.getItemWithOrder(itemId);
    if (!ctx) {
      throw new AppError('Item não encontrado', 404, 'ITEM_NOT_FOUND');
    }
    this.assertOrderEditable(ctx.orderStatus);

    // Trava: não remover item que já teve recebimento
    if (ctx.quantityReceived > 0) {
      throw new AppError(
        'Não é possível remover um item que já teve recebimento. Ajuste a quantidade se necessário.',
        400,
        'ALREADY_RECEIVED'
      );
    }

    await this.repository.deleteItem(itemId);

    // Remove também o item correspondente na Ordem de Compra de origem
    if (ctx.purchaseOrderItemId) {
      try {
        await this.purchaseOrdersRepository.deleteItem(ctx.purchaseOrderItemId);
      } catch (err: any) {
        console.error('Falha ao propagar remoção do item para a OC:', err?.message || err);
      }
    }

    return { success: true };
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

  // Anexa o arquivo da Nota Fiscal (PDF ou imagem) ao pedido.
  async uploadInvoiceFile(orderId: string, file: Express.Multer.File) {
    const order = await this.repository.findById(orderId);
    if (!order) throw new AppError('Pedido não encontrado', 404, 'NOT_FOUND');

    const buf = file.buffer;
    const isPdf = buf.length > 4 && buf.toString('ascii', 0, 4) === '%PDF';
    const isJpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    let ext = '';
    let contentType = '';
    if (isPdf) { ext = 'pdf'; contentType = 'application/pdf'; }
    else if (isJpg) { ext = 'jpg'; contentType = 'image/jpeg'; }
    else if (isPng) { ext = 'png'; contentType = 'image/png'; }
    else throw new AppError('Arquivo inválido. Envie PDF, JPG ou PNG.', 400, 'INVALID_FILE_TYPE');

    const filename = `nf-${orderId}-${Date.now()}.${ext}`;
    let url: string;

    if (supabase && env.SUPABASE_URL) {
      const { error } = await supabase.storage
        .from('product-images')
        .upload(filename, buf, { contentType, upsert: true });
      if (error) throw new AppError(`Erro ao enviar arquivo: ${error.message}`, 500, 'STORAGE_UPLOAD_ERROR');
      url = `${env.SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;
    } else {
      const dir = path.join(process.cwd(), 'uploads', 'nf');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), buf);
      url = `/uploads/nf/${filename}`;
    }

    await this.repository.updateInvoiceFile(orderId, url, file.originalname || filename);
    return this.repository.findById(orderId);
  }
}
