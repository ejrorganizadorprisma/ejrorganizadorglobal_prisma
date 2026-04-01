import { db } from '../config/database';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  name?: string;
  supplierId: string;
  purchaseRequestId?: string;
  purchaseRequest?: {
    id: string;
    requestNumber: string;
    title: string;
  };
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentTerms?: string;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  shippingAddressId?: string;
  notes?: string;
  internalNotes?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  supplierId?: string;
  setAsPreferredSupplier?: boolean;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercentage: number;
  totalPrice: number;
  quantityReceived: number;
  quantityPending: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  supplier?: {
    id: string;
    name: string;
  };
}

export interface CreatePurchaseOrderDTO {
  name?: string;
  supplierId?: string | null;
  purchaseRequestId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  createdBy?: string;
  shippingCost?: number;
  discountAmount?: number;
  subtotal?: number;
  totalAmount?: number;
  items: CreatePurchaseOrderItemDTO[];
}

export interface CreatePurchaseOrderItemDTO {
  productId: string;
  supplierId?: string;
  setAsPreferredSupplier?: boolean;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercentage?: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface UpdatePurchaseOrderDTO {
  name?: string;
  supplierId?: string | null;
  status?: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  paymentTerms?: string;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID';
  notes?: string;
  internalNotes?: string;
  approvedBy?: string;
  shippingCost?: number;
  discountAmount?: number;
  subtotal?: number;
  totalAmount?: number;
  items?: CreatePurchaseOrderItemDTO[];
}

export class PurchaseOrdersRepository {
  // Gera número único para ordem de compra
  private async generateOrderNumber(): Promise<string> {
    const result = await db.query(
      'SELECT order_number FROM purchase_orders ORDER BY created_at DESC LIMIT 1'
    );

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (!result.rows || result.rows.length === 0) {
      return `PO${year}${month}0001`;
    }

    const lastNumber = result.rows[0].order_number;
    const lastSequence = parseInt(lastNumber.slice(-4));
    const newSequence = String(lastSequence + 1).padStart(4, '0');

    return `PO${year}${month}${newSequence}`;
  }

  // Calcula totais da ordem
  private calculateTotals(items: CreatePurchaseOrderItemDTO[]): {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  } {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const discount = itemTotal * ((item.discountPercentage || 0) / 100);
      const itemSubtotal = itemTotal - discount;
      const itemTax = itemSubtotal * ((item.taxRate || 0) / 100);

      subtotal += itemSubtotal;
      taxAmount += itemTax;
    });

    return {
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
    };
  }

  // Calcula total de um item
  private calculateItemTotal(item: CreatePurchaseOrderItemDTO): number {
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
  }) {
    const { page, limit, search, status, supplierId } = params;

    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(order_number ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (supplierId) {
      conditions.push(`supplier_id = $${paramIndex}`);
      queryParams.push(supplierId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM purchase_orders ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await db.query(
      `SELECT * FROM purchase_orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    // Fetch suppliers and purchase requests separately to avoid LEFT JOIN issues with NULL values
    const ordersWithRelations = await Promise.all(
      result.rows.map(async (order) => {
        let supplier = null;
        let purchaseRequest = null;

        if (order.supplier_id) {
          const supplierResult = await db.query(
            'SELECT id, name, document FROM suppliers WHERE id = $1',
            [order.supplier_id]
          );
          supplier = supplierResult.rows[0] || null;
        }

        if (order.purchase_request_id) {
          const requestResult = await db.query(
            'SELECT id, request_number, title FROM purchase_requests WHERE id = $1',
            [order.purchase_request_id]
          );
          purchaseRequest = requestResult.rows[0] || null;
        }

        return { ...order, supplier, purchase_request: purchaseRequest };
      })
    );

    return {
      data: ordersWithRelations.map(this.mapToDTO),
      total,
    };
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    const result = await db.query(
      'SELECT * FROM purchase_orders WHERE id = $1',
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Fetch supplier separately if exists
    let supplier = null;
    if (data.supplier_id) {
      const supplierResult = await db.query(
        'SELECT id, name, document FROM suppliers WHERE id = $1',
        [data.supplier_id]
      );
      supplier = supplierResult.rows[0] || null;
    }

    // Fetch purchase request separately if exists
    let purchaseRequest = null;
    if (data.purchase_request_id) {
      const requestResult = await db.query(
        'SELECT id, request_number, title FROM purchase_requests WHERE id = $1',
        [data.purchase_request_id]
      );
      purchaseRequest = requestResult.rows[0] || null;
    }

    return this.mapToDTO({ ...data, supplier, purchase_request: purchaseRequest });
  }

  async findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | null> {
    const result = await db.query(
      'SELECT * FROM purchase_orders WHERE order_number = $1',
      [orderNumber]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Fetch supplier separately if exists
    let supplier = null;
    if (data.supplier_id) {
      const supplierResult = await db.query(
        'SELECT id, name, document FROM suppliers WHERE id = $1',
        [data.supplier_id]
      );
      supplier = supplierResult.rows[0] || null;
    }

    return this.mapToDTO({ ...data, supplier });
  }

  async create(orderData: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const orderNumber = await this.generateOrderNumber();

    // Generate a unique ID for the purchase order
    const id = `purchase-order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Use valores do frontend se fornecidos, senão calcula
    const subtotal = orderData.subtotal !== undefined ? orderData.subtotal : this.calculateTotals(orderData.items).subtotal;
    const shippingCost = orderData.shippingCost || 0;
    const discountAmount = orderData.discountAmount || 0;
    const totalAmount = orderData.totalAmount !== undefined ? orderData.totalAmount : (subtotal + shippingCost - discountAmount);

    // Cria a ordem de compra
    const orderResult = await db.query(
      `INSERT INTO purchase_orders (
        id, order_number, name, supplier_id, purchase_request_id, order_date,
        expected_delivery_date, subtotal, tax_amount, total_amount, payment_terms,
        notes, internal_notes, created_by, status, payment_status, shipping_cost, discount_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id,
        orderNumber,
        orderData.name,
        orderData.supplierId || null,
        orderData.purchaseRequestId || null,
        orderData.orderDate || new Date().toISOString(),
        orderData.expectedDeliveryDate || null,
        subtotal,
        0, // Tax não está sendo usado no frontend por enquanto
        totalAmount,
        orderData.paymentTerms || null,
        orderData.notes || null,
        orderData.internalNotes || null,
        orderData.createdBy || null,
        'DRAFT',
        'PENDING',
        shippingCost,
        discountAmount
      ]
    );

    const order = orderResult.rows[0];

    // Cria os itens
    for (const item of orderData.items) {
      const itemId = `po-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await db.query(
        `INSERT INTO purchase_order_items (
          id, purchase_order_id, product_id, supplier_id, set_as_preferred_supplier,
          quantity, unit_price, tax_rate, discount_percentage, total_price,
          expected_delivery_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          itemId,
          order.id,
          item.productId,
          item.supplierId || null,
          item.setAsPreferredSupplier || false,
          item.quantity,
          item.unitPrice,
          item.taxRate || 0,
          item.discountPercentage || 0,
          this.calculateItemTotal(item),
          item.expectedDeliveryDate || null,
          item.notes || null
        ]
      );
    }

    // Return the created order without fetching again (to avoid supplier join issues when supplier_id is null)
    return this.mapToDTO({ ...order, supplier: null });
  }

  async update(id: string, orderData: UpdatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (orderData.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      queryParams.push(orderData.name);
      paramIndex++;
    }
    if (orderData.supplierId !== undefined) {
      setClauses.push(`supplier_id = $${paramIndex}`);
      queryParams.push(orderData.supplierId);
      paramIndex++;
    }
    if (orderData.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      queryParams.push(orderData.status);
      paramIndex++;
    }
    if (orderData.expectedDeliveryDate !== undefined) {
      setClauses.push(`expected_delivery_date = $${paramIndex}`);
      queryParams.push(orderData.expectedDeliveryDate);
      paramIndex++;
    }
    if (orderData.actualDeliveryDate !== undefined) {
      setClauses.push(`actual_delivery_date = $${paramIndex}`);
      queryParams.push(orderData.actualDeliveryDate);
      paramIndex++;
    }
    if (orderData.paymentTerms !== undefined) {
      setClauses.push(`payment_terms = $${paramIndex}`);
      queryParams.push(orderData.paymentTerms);
      paramIndex++;
    }
    if (orderData.paymentStatus !== undefined) {
      setClauses.push(`payment_status = $${paramIndex}`);
      queryParams.push(orderData.paymentStatus);
      paramIndex++;
    }
    if (orderData.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex}`);
      queryParams.push(orderData.notes);
      paramIndex++;
    }
    if (orderData.internalNotes !== undefined) {
      setClauses.push(`internal_notes = $${paramIndex}`);
      queryParams.push(orderData.internalNotes);
      paramIndex++;
    }
    if (orderData.shippingCost !== undefined) {
      setClauses.push(`shipping_cost = $${paramIndex}`);
      queryParams.push(orderData.shippingCost);
      paramIndex++;
    }
    if (orderData.discountAmount !== undefined) {
      setClauses.push(`discount_amount = $${paramIndex}`);
      queryParams.push(orderData.discountAmount);
      paramIndex++;
    }
    if (orderData.subtotal !== undefined) {
      setClauses.push(`subtotal = $${paramIndex}`);
      queryParams.push(orderData.subtotal);
      paramIndex++;
    }
    if (orderData.totalAmount !== undefined) {
      setClauses.push(`total_amount = $${paramIndex}`);
      queryParams.push(orderData.totalAmount);
      paramIndex++;
    }

    if (orderData.approvedBy !== undefined) {
      setClauses.push(`approved_by = $${paramIndex}`);
      queryParams.push(orderData.approvedBy);
      paramIndex++;
      setClauses.push(`approved_at = $${paramIndex}`);
      queryParams.push(new Date().toISOString());
      paramIndex++;
    }

    // Atualiza a ordem se houver campos para atualizar
    if (setClauses.length > 0) {
      queryParams.push(id);
      await db.query(
        `UPDATE purchase_orders SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        queryParams
      );
    }

    // Se tem itens, atualiza os itens (deleta os antigos e insere os novos)
    if (orderData.items && orderData.items.length > 0) {
      // Deleta os itens existentes
      await db.query(
        'DELETE FROM purchase_order_items WHERE purchase_order_id = $1',
        [id]
      );

      // Insere os novos itens
      for (const item of orderData.items) {
        const itemId = `po-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, supplier_id, set_as_preferred_supplier,
            quantity, unit_price, tax_rate, discount_percentage, total_price,
            expected_delivery_date, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            itemId,
            id,
            item.productId,
            item.supplierId || null,
            item.setAsPreferredSupplier || false,
            item.quantity,
            item.unitPrice,
            item.taxRate || 0,
            item.discountPercentage || 0,
            this.calculateItemTotal(item),
            item.expectedDeliveryDate || null,
            item.notes || null
          ]
        );
      }
    }

    return this.findById(id) as Promise<PurchaseOrder>;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await db.query(
      'DELETE FROM purchase_orders WHERE id = $1',
      [id]
    );

    return { success: true };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<PurchaseOrder> {
    await db.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2',
      [status, orderId]
    );

    return this.findById(orderId) as Promise<PurchaseOrder>;
  }

  // Métodos para itens
  async getItems(orderId: string): Promise<PurchaseOrderItem[]> {
    const result = await db.query(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC',
      [orderId]
    );

    // Fetch products and suppliers separately to avoid relationship issues
    const itemsWithRelations = await Promise.all(
      result.rows.map(async (item) => {
        const productResult = await db.query(
          'SELECT id, code, name FROM products WHERE id = $1',
          [item.product_id]
        );
        const product = productResult.rows[0] || null;

        let supplier = null;
        if (item.supplier_id) {
          const supplierResult = await db.query(
            'SELECT id, name FROM suppliers WHERE id = $1',
            [item.supplier_id]
          );
          supplier = supplierResult.rows[0] || null;
        }

        return { ...item, product, supplier };
      })
    );

    return itemsWithRelations.map(this.mapItemToDTO);
  }

  async addItem(orderId: string, item: CreatePurchaseOrderItemDTO): Promise<PurchaseOrderItem> {
    const totalPrice = this.calculateItemTotal(item);
    const itemId = `po-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const result = await db.query(
      `INSERT INTO purchase_order_items (
        id, purchase_order_id, product_id, supplier_id, set_as_preferred_supplier,
        quantity, unit_price, tax_rate, discount_percentage, total_price,
        expected_delivery_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        itemId,
        orderId,
        item.productId,
        item.supplierId || null,
        item.setAsPreferredSupplier || false,
        item.quantity,
        item.unitPrice,
        item.taxRate || 0,
        item.discountPercentage || 0,
        totalPrice,
        item.expectedDeliveryDate || null,
        item.notes || null
      ]
    );

    // Recalcula totais da ordem
    await this.recalculateTotals(orderId);

    return this.mapItemToDTO(result.rows[0]);
  }

  async updateItem(itemId: string, itemData: Partial<CreatePurchaseOrderItemDTO>): Promise<PurchaseOrderItem> {
    // Busca o item atual
    const currentItemResult = await db.query(
      'SELECT * FROM purchase_order_items WHERE id = $1',
      [itemId]
    );

    if (!currentItemResult.rows || currentItemResult.rows.length === 0) {
      throw new Error('Item não encontrado');
    }

    const currentItem = currentItemResult.rows[0];

    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (itemData.productId !== undefined) {
      setClauses.push(`product_id = $${paramIndex}`);
      queryParams.push(itemData.productId);
      paramIndex++;
    }
    if (itemData.supplierId !== undefined) {
      setClauses.push(`supplier_id = $${paramIndex}`);
      queryParams.push(itemData.supplierId);
      paramIndex++;
    }
    if (itemData.setAsPreferredSupplier !== undefined) {
      setClauses.push(`set_as_preferred_supplier = $${paramIndex}`);
      queryParams.push(itemData.setAsPreferredSupplier);
      paramIndex++;
    }
    if (itemData.quantity !== undefined) {
      setClauses.push(`quantity = $${paramIndex}`);
      queryParams.push(itemData.quantity);
      paramIndex++;
    }
    if (itemData.unitPrice !== undefined) {
      setClauses.push(`unit_price = $${paramIndex}`);
      queryParams.push(itemData.unitPrice);
      paramIndex++;
    }
    if (itemData.taxRate !== undefined) {
      setClauses.push(`tax_rate = $${paramIndex}`);
      queryParams.push(itemData.taxRate);
      paramIndex++;
    }
    if (itemData.discountPercentage !== undefined) {
      setClauses.push(`discount_percentage = $${paramIndex}`);
      queryParams.push(itemData.discountPercentage);
      paramIndex++;
    }
    if (itemData.expectedDeliveryDate !== undefined) {
      setClauses.push(`expected_delivery_date = $${paramIndex}`);
      queryParams.push(itemData.expectedDeliveryDate);
      paramIndex++;
    }
    if (itemData.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex}`);
      queryParams.push(itemData.notes);
      paramIndex++;
    }

    // Recalcula o total do item se necessário
    const itemForCalc: CreatePurchaseOrderItemDTO = {
      productId: itemData.productId ?? currentItem.product_id,
      quantity: itemData.quantity ?? currentItem.quantity,
      unitPrice: itemData.unitPrice ?? currentItem.unit_price,
      taxRate: itemData.taxRate ?? currentItem.tax_rate,
      discountPercentage: itemData.discountPercentage ?? currentItem.discount_percentage,
    };

    setClauses.push(`total_price = $${paramIndex}`);
    queryParams.push(this.calculateItemTotal(itemForCalc));
    paramIndex++;

    queryParams.push(itemId);

    const result = await db.query(
      `UPDATE purchase_order_items SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      queryParams
    );

    // Recalcula totais da ordem
    await this.recalculateTotals(currentItem.purchase_order_id);

    return this.mapItemToDTO(result.rows[0]);
  }

  async deleteItem(itemId: string): Promise<{ success: boolean }> {
    // Busca o item para pegar o purchase_order_id
    const itemResult = await db.query(
      'SELECT purchase_order_id FROM purchase_order_items WHERE id = $1',
      [itemId]
    );

    if (!itemResult.rows || itemResult.rows.length === 0) {
      throw new Error('Item não encontrado');
    }

    const item = itemResult.rows[0];

    await db.query(
      'DELETE FROM purchase_order_items WHERE id = $1',
      [itemId]
    );

    // Recalcula totais da ordem
    await this.recalculateTotals(item.purchase_order_id);

    return { success: true };
  }

  // Recalcula os totais da ordem baseado nos itens
  private async recalculateTotals(orderId: string): Promise<void> {
    const items = await this.getItems(orderId);

    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      subtotal += item.totalPrice;
      taxAmount += (item.totalPrice * item.taxRate) / 100;
    });

    await db.query(
      'UPDATE purchase_orders SET subtotal = $1, tax_amount = $2, total_amount = $3 WHERE id = $4',
      [subtotal, taxAmount, subtotal + taxAmount, orderId]
    );
  }

  // Mappers
  private mapToDTO(data: any): PurchaseOrder {
    return {
      id: data.id,
      orderNumber: data.order_number,
      name: data.name,
      supplierId: data.supplier_id,
      purchaseRequestId: data.purchase_request_id,
      status: data.status,
      orderDate: data.order_date,
      expectedDeliveryDate: data.expected_delivery_date,
      actualDeliveryDate: data.actual_delivery_date,
      subtotal: data.subtotal,
      taxAmount: data.tax_amount,
      shippingCost: data.shipping_cost,
      discountAmount: data.discount_amount,
      totalAmount: data.total_amount,
      paymentTerms: data.payment_terms,
      paymentStatus: data.payment_status,
      shippingAddressId: data.shipping_address_id,
      notes: data.notes,
      internalNotes: data.internal_notes,
      createdBy: data.created_by,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Map supplier object with document → code mapping
      supplier: data.supplier ? {
        id: data.supplier.id,
        name: data.supplier.name,
        code: data.supplier.document, // Map document to code for application layer
      } : undefined,
      // Map purchase request object
      purchaseRequest: data.purchase_request ? {
        id: data.purchase_request.id,
        requestNumber: data.purchase_request.request_number,
        title: data.purchase_request.title,
      } : undefined,
    } as any;
  }

  private mapItemToDTO(data: any): PurchaseOrderItem {
    return {
      id: data.id,
      purchaseOrderId: data.purchase_order_id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      setAsPreferredSupplier: data.set_as_preferred_supplier,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      taxRate: data.tax_rate,
      discountPercentage: data.discount_percentage,
      totalPrice: data.total_price,
      quantityReceived: data.quantity_received,
      quantityPending: data.quantity_pending,
      expectedDeliveryDate: data.expected_delivery_date,
      notes: data.notes,
      createdAt: data.created_at,
      // Include product data if available
      product: data.product ? {
        id: data.product.id,
        code: data.product.code,
        name: data.product.name,
      } : undefined,
      // Include supplier data if available
      supplier: data.supplier ? {
        id: data.supplier.id,
        name: data.supplier.name,
      } : undefined,
    } as any;
  }
}
