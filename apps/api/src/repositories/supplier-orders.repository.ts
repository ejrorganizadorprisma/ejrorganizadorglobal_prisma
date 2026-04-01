import { db } from '../config/database';

// Interfaces
export interface SupplierOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  purchaseOrderId: string;
  groupCode: string;
  status: 'PENDING' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  sentAt?: string;
  confirmedAt?: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Relacionamentos
  supplier?: {
    id: string;
    name: string;
    document?: string;
  };
  purchaseOrder?: {
    id: string;
    orderNumber: string;
    name?: string;
  };
  items?: SupplierOrderItem[];
}

export interface SupplierOrderItem {
  id: string;
  supplierOrderId: string;
  purchaseOrderItemId?: string;
  productId: string;
  quantity: number;
  quantityReceived: number;
  quantityPending: number;
  unitPrice: number;
  discountPercentage: number;
  totalPrice: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  // Relacionamentos
  product?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateSupplierOrderDTO {
  supplierId: string;
  purchaseOrderId: string;
  groupCode: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  createdBy?: string;
  items: CreateSupplierOrderItemDTO[];
}

export interface CreateSupplierOrderItemDTO {
  purchaseOrderItemId?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface UpdateSupplierOrderDTO {
  status?: 'PENDING' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  paymentTerms?: string;
  shippingCost?: number;
  discountAmount?: number;
  notes?: string;
  internalNotes?: string;
}

export class SupplierOrdersRepository {
  // Gera número único para pedido
  private async generateOrderNumber(): Promise<string> {
    const query = `
      SELECT order_number
      FROM supplier_orders
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query);

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (result.rows.length === 0) {
      return `PED${year}${month}0001`;
    }

    const lastNumber = result.rows[0].order_number;
    const lastSequence = parseInt(lastNumber.slice(-4));
    const newSequence = String(lastSequence + 1).padStart(4, '0');

    return `PED${year}${month}${newSequence}`;
  }

  // Gera código de grupo baseado na ordem de compra
  generateGroupCode(purchaseOrderNumber: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `GRP-${purchaseOrderNumber}-${timestamp}`;
  }

  // Calcula total de um item
  private calculateItemTotal(item: CreateSupplierOrderItemDTO): number {
    const itemTotal = item.quantity * item.unitPrice;
    const discount = itemTotal * ((item.discountPercentage || 0) / 100);
    return itemTotal - discount;
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    supplierId?: string;
    purchaseOrderId?: string;
    groupCode?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, limit, search, status, supplierId, purchaseOrderId, groupCode, startDate, endDate } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(so.order_number ILIKE $${paramIndex} OR so.group_code ILIKE $${paramIndex} OR so.notes ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`so.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (supplierId) {
      conditions.push(`so.supplier_id = $${paramIndex}`);
      values.push(supplierId);
      paramIndex++;
    }

    if (purchaseOrderId) {
      conditions.push(`so.purchase_order_id = $${paramIndex}`);
      values.push(purchaseOrderId);
      paramIndex++;
    }

    if (groupCode) {
      conditions.push(`so.group_code = $${paramIndex}`);
      values.push(groupCode);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`so.order_date >= $${paramIndex}`);
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`so.order_date <= $${paramIndex}`);
      values.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const query = `
      SELECT
        so.*,
        s.id as supplier_id, s.name as supplier_name, s.document as supplier_document,
        po.id as po_id, po.order_number as po_order_number
      FROM supplier_orders so
      LEFT JOIN suppliers s ON s.id = so.supplier_id
      LEFT JOIN purchase_orders po ON po.id = so.purchase_order_id
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, values);

    // Count total
    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM supplier_orders so
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, values.slice(0, -2));
    const total = countResult.rows[0]?.count || 0;

    // Buscar primeiro item de cada pedido
    const ordersWithFirstItem = await Promise.all(
      result.rows.map(async (order) => {
        const itemQuery = `
          SELECT
            soi.*,
            p.id as product_id, p.code as product_code, p.name as product_name, p.factory_code as product_factory_code
          FROM supplier_order_items soi
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE soi.supplier_order_id = $1
          ORDER BY soi.created_at ASC
          LIMIT 1
        `;
        const itemResult = await db.query(itemQuery, [order.id]);

        const items = itemResult.rows.map(item => this.mapItemToDTO(item));

        return {
          ...order,
          supplier: order.supplier_name ? {
            id: order.supplier_id,
            name: order.supplier_name,
            document: order.supplier_document,
          } : undefined,
          purchase_order: order.po_order_number ? {
            id: order.po_id,
            orderNumber: order.po_order_number,
          } : undefined,
          items,
        };
      })
    );

    return {
      data: ordersWithFirstItem.map(this.mapToDTO),
      total,
    };
  }

  async findById(id: string): Promise<SupplierOrder | null> {
    const query = `
      SELECT
        so.*,
        s.id as supplier_id, s.name as supplier_name, s.document as supplier_document,
        po.id as po_id, po.order_number as po_order_number
      FROM supplier_orders so
      LEFT JOIN suppliers s ON s.id = so.supplier_id
      LEFT JOIN purchase_orders po ON po.id = so.purchase_order_id
      WHERE so.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return null;

    const order = result.rows[0];

    // Buscar itens
    const items = await this.getItems(id);

    return this.mapToDTO({
      ...order,
      supplier: order.supplier_name ? {
        id: order.supplier_id,
        name: order.supplier_name,
        document: order.supplier_document,
      } : null,
      purchase_order: order.po_order_number ? {
        id: order.po_id,
        orderNumber: order.po_order_number,
        name: order.po_name,
      } : null,
      items,
    });
  }

  async findByGroupCode(groupCode: string): Promise<SupplierOrder[]> {
    const query = `
      SELECT
        so.*,
        s.id as supplier_id, s.name as supplier_name, s.document as supplier_document
      FROM supplier_orders so
      LEFT JOIN suppliers s ON s.id = so.supplier_id
      WHERE so.group_code = $1
      ORDER BY so.created_at ASC
    `;

    const result = await db.query(query, [groupCode]);

    return result.rows.map(order => this.mapToDTO({
      ...order,
      supplier: order.supplier_name ? {
        id: order.supplier_id,
        name: order.supplier_name,
        document: order.supplier_document,
      } : null,
    }));
  }

  async findByPurchaseOrderId(purchaseOrderId: string): Promise<SupplierOrder[]> {
    const query = `
      SELECT
        so.*,
        s.id as supplier_id, s.name as supplier_name, s.document as supplier_document
      FROM supplier_orders so
      LEFT JOIN suppliers s ON s.id = so.supplier_id
      WHERE so.purchase_order_id = $1
      ORDER BY so.created_at ASC
    `;

    const result = await db.query(query, [purchaseOrderId]);

    return result.rows.map(order => this.mapToDTO({
      ...order,
      supplier: order.supplier_name ? {
        id: order.supplier_id,
        name: order.supplier_name,
        document: order.supplier_document,
      } : null,
    }));
  }

  async create(orderData: CreateSupplierOrderDTO): Promise<SupplierOrder> {
    const orderNumber = await this.generateOrderNumber();
    const id = `supplier-order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Calcular totais
    let subtotal = 0;
    orderData.items.forEach(item => {
      subtotal += this.calculateItemTotal(item);
    });
    const totalAmount = subtotal;

    // Criar pedido
    const orderQuery = `
      INSERT INTO supplier_orders (
        id, order_number, supplier_id, purchase_order_id, group_code,
        expected_delivery_date, payment_terms, notes, internal_notes,
        created_by, subtotal, total_amount, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const orderResult = await db.query(orderQuery, [
      id,
      orderNumber,
      orderData.supplierId,
      orderData.purchaseOrderId,
      orderData.groupCode,
      orderData.expectedDeliveryDate,
      orderData.paymentTerms,
      orderData.notes,
      orderData.internalNotes,
      orderData.createdBy,
      subtotal,
      totalAmount,
      'PENDING',
    ]);

    // Criar itens
    for (const item of orderData.items) {
      const itemId = `so-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const itemQuery = `
        INSERT INTO supplier_order_items (
          id, supplier_order_id, purchase_order_item_id, product_id,
          quantity, unit_price, discount_percentage, total_price,
          expected_delivery_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await db.query(itemQuery, [
        itemId,
        id,
        item.purchaseOrderItemId,
        item.productId,
        item.quantity,
        item.unitPrice,
        item.discountPercentage || 0,
        this.calculateItemTotal(item),
        item.expectedDeliveryDate,
        item.notes,
      ]);
    }

    return this.findById(id) as Promise<SupplierOrder>;
  }

  async update(id: string, orderData: UpdateSupplierOrderDTO): Promise<SupplierOrder> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (orderData.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(orderData.status);
      paramIndex++;

      if (orderData.status === 'SENT') {
        fields.push(`sent_at = $${paramIndex}`);
        values.push(new Date().toISOString());
        paramIndex++;
      }
      if (orderData.status === 'CONFIRMED') {
        fields.push(`confirmed_at = $${paramIndex}`);
        values.push(new Date().toISOString());
        paramIndex++;
      }
    }
    if (orderData.expectedDeliveryDate !== undefined) {
      fields.push(`expected_delivery_date = $${paramIndex}`);
      values.push(orderData.expectedDeliveryDate);
      paramIndex++;
    }
    if (orderData.actualDeliveryDate !== undefined) {
      fields.push(`actual_delivery_date = $${paramIndex}`);
      values.push(orderData.actualDeliveryDate);
      paramIndex++;
    }
    if (orderData.paymentTerms !== undefined) {
      fields.push(`payment_terms = $${paramIndex}`);
      values.push(orderData.paymentTerms);
      paramIndex++;
    }
    if (orderData.shippingCost !== undefined) {
      fields.push(`shipping_cost = $${paramIndex}`);
      values.push(orderData.shippingCost);
      paramIndex++;
    }
    if (orderData.discountAmount !== undefined) {
      fields.push(`discount_amount = $${paramIndex}`);
      values.push(orderData.discountAmount);
      paramIndex++;
    }
    if (orderData.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(orderData.notes);
      paramIndex++;
    }
    if (orderData.internalNotes !== undefined) {
      fields.push(`internal_notes = $${paramIndex}`);
      values.push(orderData.internalNotes);
      paramIndex++;
    }

    // Recalcular total se custos mudaram
    if (orderData.shippingCost !== undefined || orderData.discountAmount !== undefined) {
      const current = await this.findById(id);
      if (current) {
        const shipping = orderData.shippingCost ?? current.shippingCost;
        const discount = orderData.discountAmount ?? current.discountAmount;
        fields.push(`total_amount = $${paramIndex}`);
        values.push(current.subtotal + shipping - discount);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id) as Promise<SupplierOrder>;
    }

    values.push(id);

    const query = `
      UPDATE supplier_orders
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.query(query, values);

    return this.findById(id) as Promise<SupplierOrder>;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const query = `
      DELETE FROM supplier_orders
      WHERE id = $1
    `;

    await db.query(query, [id]);

    return { success: true };
  }

  // Métodos para itens
  async getItems(orderId: string): Promise<SupplierOrderItem[]> {
    const query = `
      SELECT
        soi.*,
        p.id as product_id, p.code as product_code, p.name as product_name, p.factory_code as product_factory_code
      FROM supplier_order_items soi
      LEFT JOIN products p ON p.id = soi.product_id
      WHERE soi.supplier_order_id = $1
      ORDER BY soi.created_at ASC
    `;

    const result = await db.query(query, [orderId]);

    return result.rows.map(this.mapItemToDTO);
  }

  async updateItemReceived(itemId: string, quantityReceived: number): Promise<SupplierOrderItem> {
    const query = `
      UPDATE supplier_order_items
      SET quantity_received = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [quantityReceived, itemId]);

    return this.mapItemToDTO(result.rows[0]);
  }

  // Mappers
  private mapToDTO(data: any): SupplierOrder {
    return {
      id: data.id,
      orderNumber: data.order_number,
      supplierId: data.supplier_id,
      purchaseOrderId: data.purchase_order_id,
      groupCode: data.group_code,
      status: data.status,
      orderDate: data.order_date,
      expectedDeliveryDate: data.expected_delivery_date,
      actualDeliveryDate: data.actual_delivery_date,
      sentAt: data.sent_at,
      confirmedAt: data.confirmed_at,
      subtotal: data.subtotal,
      shippingCost: data.shipping_cost,
      discountAmount: data.discount_amount,
      totalAmount: data.total_amount,
      paymentTerms: data.payment_terms,
      notes: data.notes,
      internalNotes: data.internal_notes,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      supplier: data.supplier,
      purchaseOrder: data.purchase_order,
      items: data.items?.map((item: any) => {
        // Se já está mapeado (vem de getItems), usar diretamente
        if (item.productId !== undefined) {
          return item;
        }
        // Se é dado bruto do banco, mapear
        return {
          id: item.id,
          supplierOrderId: item.supplier_order_id,
          purchaseOrderItemId: item.purchase_order_item_id,
          productId: item.product_id,
          quantity: item.quantity,
          quantityReceived: item.quantity_received || 0,
          quantityPending: item.quantity - (item.quantity_received || 0),
          unitPrice: item.unit_price,
          discountPercentage: item.discount_percentage || 0,
          totalPrice: item.total_price,
          expectedDeliveryDate: item.expected_delivery_date,
          notes: item.notes,
          createdAt: item.created_at,
          product: item.product ? {
            id: item.product.id,
            code: item.product.code,
            name: item.product.name,
            factoryCode: item.product.factoryCode || undefined,
          } : undefined,
        };
      }),
    };
  }

  private mapItemToDTO(data: any): SupplierOrderItem {
    return {
      id: data.id,
      supplierOrderId: data.supplier_order_id,
      purchaseOrderItemId: data.purchase_order_item_id,
      productId: data.product_id,
      quantity: data.quantity,
      quantityReceived: data.quantity_received || 0,
      quantityPending: data.quantity_pending || data.quantity,
      unitPrice: data.unit_price,
      discountPercentage: data.discount_percentage || 0,
      totalPrice: data.total_price,
      expectedDeliveryDate: data.expected_delivery_date,
      notes: data.notes,
      createdAt: data.created_at,
      product: data.product_name ? {
        id: data.product_id,
        code: data.product_code,
        name: data.product_name,
        factoryCode: data.product_factory_code || undefined,
      } : undefined,
    };
  }
}
