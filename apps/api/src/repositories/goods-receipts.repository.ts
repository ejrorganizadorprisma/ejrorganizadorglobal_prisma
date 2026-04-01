import { db } from '../config/database';

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierOrderId?: string;
  purchaseOrderId?: string; // Mantido para compatibilidade
  supplierId: string;
  receiptDate: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  status: 'PENDING' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  qualityCheckStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'PARTIAL';
  inspectedBy?: string;
  inspectedAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  supplierOrderItemId?: string;
  purchaseOrderItemId?: string; // Mantido para compatibilidade
  productId: string;
  quantityOrdered?: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  unitPrice?: number;
  qualityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUARANTINE';
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateGoodsReceiptDTO {
  supplierOrderId?: string;
  purchaseOrderId?: string; // Mantido para compatibilidade
  supplierId: string;
  receiptDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  notes?: string;
  createdBy?: string;
  items: CreateGoodsReceiptItemDTO[];
}

export interface CreateGoodsReceiptItemDTO {
  supplierOrderItemId?: string;
  purchaseOrderItemId?: string; // Mantido para compatibilidade
  productId: string;
  quantityOrdered?: number;
  quantityReceived: number;
  unitPrice?: number;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateGoodsReceiptDTO {
  status?: 'PENDING' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  qualityCheckStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'PARTIAL';
  inspectedBy?: string;
  notes?: string;
}

export interface ApproveReceiptItemDTO {
  quantityAccepted: number;
  quantityRejected: number;
  qualityStatus: 'APPROVED' | 'REJECTED' | 'QUARANTINE';
  rejectionReason?: string;
}

export class GoodsReceiptsRepository {
  // Gera número único para recebimento
  private async generateReceiptNumber(): Promise<string> {
    const result = await db.query(
      'SELECT receipt_number FROM goods_receipts ORDER BY created_at DESC LIMIT 1'
    );

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (!result.rows || result.rows.length === 0) {
      return `GR${year}${month}0001`;
    }

    const lastNumber = result.rows[0].receipt_number;
    const lastSequence = parseInt(lastNumber.slice(-4));
    const newSequence = String(lastSequence + 1).padStart(4, '0');

    return `GR${year}${month}${newSequence}`;
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    supplierId?: string;
    supplierOrderId?: string;
    purchaseOrderId?: string;
  }) {
    const { page, limit, search, status, supplierId, supplierOrderId, purchaseOrderId } = params;

    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(receipt_number ILIKE $${paramIndex} OR invoice_number ILIKE $${paramIndex})`);
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

    if (supplierOrderId) {
      conditions.push(`supplier_order_id = $${paramIndex}`);
      queryParams.push(supplierOrderId);
      paramIndex++;
    }

    if (purchaseOrderId) {
      conditions.push(`purchase_order_id = $${paramIndex}`);
      queryParams.push(purchaseOrderId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM goods_receipts ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await db.query(
      `SELECT * FROM goods_receipts ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    // Buscar suppliers, supplier_orders e purchase_orders separadamente
    const receiptsWithRelations = await Promise.all(
      result.rows.map(async (receipt) => {
        // Buscar supplier se existir
        let supplier = null;
        if (receipt.supplier_id) {
          const supplierResult = await db.query(
            'SELECT id, name, document FROM suppliers WHERE id = $1',
            [receipt.supplier_id]
          );
          supplier = supplierResult.rows[0] || null;
        }

        // Buscar supplier order se existir
        let supplier_order = null;
        if (receipt.supplier_order_id) {
          const soResult = await db.query(
            'SELECT id, order_number FROM supplier_orders WHERE id = $1',
            [receipt.supplier_order_id]
          );
          supplier_order = soResult.rows[0] || null;
        }

        // Buscar purchase order se existir (compatibilidade)
        let purchase_order = null;
        if (receipt.purchase_order_id) {
          const poResult = await db.query(
            'SELECT id, order_number FROM purchase_orders WHERE id = $1',
            [receipt.purchase_order_id]
          );
          purchase_order = poResult.rows[0] || null;
        }

        return { ...receipt, supplier, supplier_order, purchase_order };
      })
    );

    return {
      data: receiptsWithRelations.map(this.mapToDTO),
      total,
    };
  }

  async findById(id: string): Promise<GoodsReceipt | null> {
    const result = await db.query(
      'SELECT * FROM goods_receipts WHERE id = $1',
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Buscar supplier separadamente se existir
    let supplier = null;
    if (data.supplier_id) {
      const supplierResult = await db.query(
        'SELECT id, name, document FROM suppliers WHERE id = $1',
        [data.supplier_id]
      );
      supplier = supplierResult.rows[0] || null;
    }

    // Buscar supplier order separadamente se existir
    let supplier_order = null;
    if (data.supplier_order_id) {
      const soResult = await db.query(
        'SELECT id, order_number FROM supplier_orders WHERE id = $1',
        [data.supplier_order_id]
      );
      supplier_order = soResult.rows[0] || null;
    }

    // Buscar purchase order separadamente se existir (compatibilidade)
    let purchase_order = null;
    if (data.purchase_order_id) {
      const poResult = await db.query(
        'SELECT id, order_number FROM purchase_orders WHERE id = $1',
        [data.purchase_order_id]
      );
      purchase_order = poResult.rows[0] || null;
    }

    return this.mapToDTO({ ...data, supplier, supplier_order, purchase_order });
  }

  async findByReceiptNumber(receiptNumber: string): Promise<GoodsReceipt | null> {
    const result = await db.query(
      'SELECT * FROM goods_receipts WHERE receipt_number = $1',
      [receiptNumber]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Buscar supplier separadamente se existir
    let supplier = null;
    if (data.supplier_id) {
      const supplierResult = await db.query(
        'SELECT id, name, document FROM suppliers WHERE id = $1',
        [data.supplier_id]
      );
      supplier = supplierResult.rows[0] || null;
    }

    // Buscar supplier order separadamente se existir
    let supplier_order = null;
    if (data.supplier_order_id) {
      const soResult = await db.query(
        'SELECT id, order_number FROM supplier_orders WHERE id = $1',
        [data.supplier_order_id]
      );
      supplier_order = soResult.rows[0] || null;
    }

    // Buscar purchase order separadamente se existir (compatibilidade)
    let purchase_order = null;
    if (data.purchase_order_id) {
      const poResult = await db.query(
        'SELECT id, order_number FROM purchase_orders WHERE id = $1',
        [data.purchase_order_id]
      );
      purchase_order = poResult.rows[0] || null;
    }

    return this.mapToDTO({ ...data, supplier, supplier_order, purchase_order });
  }

  async create(receiptData: CreateGoodsReceiptDTO): Promise<GoodsReceipt> {
    const receiptNumber = await this.generateReceiptNumber();

    // Cria o recebimento
    const receiptResult = await db.query(
      `INSERT INTO goods_receipts (
        receipt_number, supplier_order_id, purchase_order_id, supplier_id,
        receipt_date, invoice_number, invoice_date, invoice_amount,
        status, quality_check_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        receiptNumber,
        receiptData.supplierOrderId || null,
        receiptData.purchaseOrderId || null,
        receiptData.supplierId,
        receiptData.receiptDate || new Date().toISOString(),
        receiptData.invoiceNumber || null,
        receiptData.invoiceDate || null,
        receiptData.invoiceAmount || null,
        'PENDING',
        'PENDING',
        receiptData.notes || null,
        receiptData.createdBy || null
      ]
    );

    const receipt = receiptResult.rows[0];

    // Cria os itens
    for (const item of receiptData.items) {
      await db.query(
        `INSERT INTO goods_receipt_items (
          goods_receipt_id, supplier_order_item_id, purchase_order_item_id,
          product_id, quantity_ordered, quantity_received, quantity_accepted,
          quantity_rejected, unit_price, quality_status, lot_number, expiry_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          receipt.id,
          item.supplierOrderItemId || null,
          item.purchaseOrderItemId || null,
          item.productId,
          item.quantityOrdered || null,
          item.quantityReceived,
          0,
          0,
          item.unitPrice || null,
          'PENDING',
          item.lotNumber || null,
          item.expiryDate || null,
          item.notes || null
        ]
      );
    }

    // Atualizar status do pedido do fornecedor para PARTIAL (aguardando aprovacao do recebimento)
    if (receiptData.supplierOrderId) {
      await db.query(
        `UPDATE supplier_orders SET status = 'PARTIAL'
         WHERE id = $1 AND status IN ('SENT', 'CONFIRMED')`,
        [receiptData.supplierOrderId]
      );
    }

    return this.findById(receipt.id) as Promise<GoodsReceipt>;
  }

  async update(id: string, receiptData: UpdateGoodsReceiptDTO): Promise<GoodsReceipt> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (receiptData.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      queryParams.push(receiptData.status);
      paramIndex++;
    }
    if (receiptData.qualityCheckStatus !== undefined) {
      setClauses.push(`quality_check_status = $${paramIndex}`);
      queryParams.push(receiptData.qualityCheckStatus);
      paramIndex++;
    }
    if (receiptData.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex}`);
      queryParams.push(receiptData.notes);
      paramIndex++;
    }

    if (receiptData.inspectedBy !== undefined) {
      setClauses.push(`inspected_by = $${paramIndex}`);
      queryParams.push(receiptData.inspectedBy);
      paramIndex++;
      setClauses.push(`inspected_at = $${paramIndex}`);
      queryParams.push(new Date().toISOString());
      paramIndex++;
    }

    if (setClauses.length > 0) {
      queryParams.push(id);
      await db.query(
        `UPDATE goods_receipts SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        queryParams
      );
    }

    return this.findById(id) as Promise<GoodsReceipt>;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await db.query(
      'DELETE FROM goods_receipts WHERE id = $1',
      [id]
    );

    return { success: true };
  }

  // Métodos para itens
  async getItems(receiptId: string): Promise<GoodsReceiptItem[]> {
    const result = await db.query(
      'SELECT * FROM goods_receipt_items WHERE goods_receipt_id = $1 ORDER BY created_at ASC',
      [receiptId]
    );

    // Buscar produtos separadamente
    const itemsWithProducts = await Promise.all(
      result.rows.map(async (item) => {
        let product = null;
        if (item.product_id) {
          const productResult = await db.query(
            'SELECT id, code, name FROM products WHERE id = $1',
            [item.product_id]
          );
          product = productResult.rows[0] || null;
        }
        return { ...item, product };
      })
    );

    return itemsWithProducts.map(this.mapItemToDTO);
  }

  async addItem(receiptId: string, item: CreateGoodsReceiptItemDTO): Promise<GoodsReceiptItem> {
    const result = await db.query(
      `INSERT INTO goods_receipt_items (
        goods_receipt_id, purchase_order_item_id, product_id, quantity_ordered,
        quantity_received, quantity_accepted, quantity_rejected, unit_price,
        quality_status, lot_number, expiry_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        receiptId,
        item.purchaseOrderItemId || null,
        item.productId,
        item.quantityOrdered || null,
        item.quantityReceived,
        0,
        0,
        item.unitPrice || null,
        'PENDING',
        item.lotNumber || null,
        item.expiryDate || null,
        item.notes || null
      ]
    );

    return this.mapItemToDTO(result.rows[0]);
  }

  async updateItem(itemId: string, itemData: Partial<CreateGoodsReceiptItemDTO>): Promise<GoodsReceiptItem> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (itemData.productId !== undefined) {
      setClauses.push(`product_id = $${paramIndex}`);
      queryParams.push(itemData.productId);
      paramIndex++;
    }
    if (itemData.quantityOrdered !== undefined) {
      setClauses.push(`quantity_ordered = $${paramIndex}`);
      queryParams.push(itemData.quantityOrdered);
      paramIndex++;
    }
    if (itemData.quantityReceived !== undefined) {
      setClauses.push(`quantity_received = $${paramIndex}`);
      queryParams.push(itemData.quantityReceived);
      paramIndex++;
    }
    if (itemData.unitPrice !== undefined) {
      setClauses.push(`unit_price = $${paramIndex}`);
      queryParams.push(itemData.unitPrice);
      paramIndex++;
    }
    if (itemData.lotNumber !== undefined) {
      setClauses.push(`lot_number = $${paramIndex}`);
      queryParams.push(itemData.lotNumber);
      paramIndex++;
    }
    if (itemData.expiryDate !== undefined) {
      setClauses.push(`expiry_date = $${paramIndex}`);
      queryParams.push(itemData.expiryDate);
      paramIndex++;
    }
    if (itemData.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex}`);
      queryParams.push(itemData.notes);
      paramIndex++;
    }

    if (setClauses.length > 0) {
      queryParams.push(itemId);
      const result = await db.query(
        `UPDATE goods_receipt_items SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        queryParams
      );
      return this.mapItemToDTO(result.rows[0]);
    }

    // If no updates, fetch and return current item
    const result = await db.query('SELECT * FROM goods_receipt_items WHERE id = $1', [itemId]);
    return this.mapItemToDTO(result.rows[0]);
  }

  async deleteItem(itemId: string): Promise<{ success: boolean }> {
    await db.query(
      'DELETE FROM goods_receipt_items WHERE id = $1',
      [itemId]
    );

    return { success: true };
  }

  // Aprovar item de recebimento (atualiza quantidades aceitas/rejeitadas)
  async approveItem(itemId: string, approvalData: ApproveReceiptItemDTO): Promise<GoodsReceiptItem> {
    const result = await db.query(
      `UPDATE goods_receipt_items
       SET quantity_accepted = $1, quantity_rejected = $2, quality_status = $3, rejection_reason = $4
       WHERE id = $5
       RETURNING *`,
      [
        approvalData.quantityAccepted,
        approvalData.quantityRejected,
        approvalData.qualityStatus,
        approvalData.rejectionReason || null,
        itemId
      ]
    );

    const data = result.rows[0];

    // Atualizar status de qualidade do recebimento
    const receiptId = data.goods_receipt_id;
    await this.updateReceiptQualityStatus(receiptId);

    return this.mapItemToDTO(data);
  }

  // Aprovar recebimento completo (atualiza estoque e status)
  async approveReceipt(receiptId: string, approvedBy: string): Promise<GoodsReceipt> {
    // Busca os itens para copiar quantity_received para quantity_accepted
    const items = await this.getItems(receiptId);

    // Atualiza cada item individualmente
    for (const item of items) {
      await db.query(
        `UPDATE goods_receipt_items
         SET quantity_accepted = $1, quantity_rejected = 0, quality_status = 'APPROVED'
         WHERE id = $2`,
        [item.quantityReceived, item.id]
      );

      // Registrar movimentação de estoque via função centralizada
      if (item.quantityReceived > 0) {
        await db.query(
          `SELECT update_product_stock($1, $2, $3, $4, $5, $6, $7)`,
          [item.productId, item.quantityReceived, null, 'PURCHASE',
           'Recebimento aprovado - GR ' + receiptId, receiptId, 'GOODS_RECEIPT']
        );
      }

      // Atualizar quantity_received no supplier_order_item se existir
      if (item.supplierOrderItemId) {
        // Buscar o item do pedido do fornecedor para somar a quantidade
        const soItemResult = await db.query(
          'SELECT quantity_received FROM supplier_order_items WHERE id = $1',
          [item.supplierOrderItemId]
        );

        const currentReceived = soItemResult.rows[0]?.quantity_received || 0;
        const newReceived = currentReceived + item.quantityReceived;

        await db.query(
          'UPDATE supplier_order_items SET quantity_received = $1 WHERE id = $2',
          [newReceived, item.supplierOrderItemId]
        );
      }

      // Atualizar quantity_received no purchase_order_item se existir (compatibilidade)
      if (item.purchaseOrderItemId) {
        const poItemResult = await db.query(
          'SELECT quantity_received FROM purchase_order_items WHERE id = $1',
          [item.purchaseOrderItemId]
        );

        const currentReceived = poItemResult.rows[0]?.quantity_received || 0;
        const newReceived = currentReceived + item.quantityReceived;

        await db.query(
          'UPDATE purchase_order_items SET quantity_received = $1 WHERE id = $2',
          [newReceived, item.purchaseOrderItemId]
        );
      }
    }

    // Atualiza o status do recebimento
    await db.query(
      `UPDATE goods_receipts
       SET status = 'APPROVED', inspected_by = $1, inspected_at = $2
       WHERE id = $3`,
      [approvedBy, new Date().toISOString(), receiptId]
    );

    // Buscar o recebimento para obter IDs relacionados
    const receipt = await this.findById(receiptId);

    // Atualizar status do pedido do fornecedor se existir
    if (receipt?.supplierOrderId) {
      await this.updateSupplierOrderStatus(receipt.supplierOrderId);
    }

    // Atualizar status da ordem de compra se existir (compatibilidade)
    if (receipt?.purchaseOrderId) {
      await this.updatePurchaseOrderStatus(receipt.purchaseOrderId);
    }

    return this.findById(receiptId) as Promise<GoodsReceipt>;
  }

  // Atualiza o status de qualidade do recebimento baseado nos itens
  private async updateReceiptQualityStatus(receiptId: string): Promise<void> {
    const items = await this.getItems(receiptId);

    let allApproved = true;
    let allRejected = true;
    let hasPending = false;

    items.forEach(item => {
      if (!item.qualityStatus || item.qualityStatus === 'PENDING') {
        hasPending = true;
      }
      if (item.qualityStatus !== 'APPROVED') {
        allApproved = false;
      }
      if (item.qualityStatus !== 'REJECTED') {
        allRejected = false;
      }
    });

    let qualityStatus: string;
    if (hasPending) {
      qualityStatus = 'PENDING';
    } else if (allApproved) {
      qualityStatus = 'PASSED';
    } else if (allRejected) {
      qualityStatus = 'FAILED';
    } else {
      qualityStatus = 'PARTIAL';
    }

    await db.query(
      'UPDATE goods_receipts SET quality_check_status = $1 WHERE id = $2',
      [qualityStatus, receiptId]
    );
  }

  // Atualiza o status do pedido do fornecedor baseado nas quantidades recebidas
  private async updateSupplierOrderStatus(supplierOrderId: string): Promise<void> {
    const result = await db.query(
      'SELECT quantity, quantity_received FROM supplier_order_items WHERE supplier_order_id = $1',
      [supplierOrderId]
    );

    const items = result.rows;
    if (!items || items.length === 0) return;

    let allReceived = true;
    let someReceived = false;

    items.forEach(item => {
      if ((item.quantity_received || 0) < item.quantity) {
        allReceived = false;
      }
      if ((item.quantity_received || 0) > 0) {
        someReceived = true;
      }
    });

    let status: string;
    if (allReceived) {
      status = 'RECEIVED';
    } else if (someReceived) {
      status = 'PARTIAL';
    } else {
      status = 'CONFIRMED';
    }

    if (allReceived) {
      await db.query(
        'UPDATE supplier_orders SET status = $1, actual_delivery_date = $2 WHERE id = $3',
        [status, new Date().toISOString(), supplierOrderId]
      );
    } else {
      await db.query(
        'UPDATE supplier_orders SET status = $1 WHERE id = $2',
        [status, supplierOrderId]
      );
    }
  }

  // Atualiza o status da ordem de compra baseado nas quantidades recebidas (compatibilidade)
  private async updatePurchaseOrderStatus(purchaseOrderId: string): Promise<void> {
    const result = await db.query(
      'SELECT quantity, quantity_received FROM purchase_order_items WHERE purchase_order_id = $1',
      [purchaseOrderId]
    );

    const items = result.rows;
    if (!items || items.length === 0) return;

    let allReceived = true;
    let someReceived = false;

    items.forEach(item => {
      if (item.quantity_received < item.quantity) {
        allReceived = false;
      }
      if (item.quantity_received > 0) {
        someReceived = true;
      }
    });

    let status: string;
    if (allReceived) {
      status = 'RECEIVED';
    } else if (someReceived) {
      status = 'PARTIAL';
    } else {
      status = 'CONFIRMED';
    }

    await db.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2',
      [status, purchaseOrderId]
    );

    // Cascade: if PO is fully received, also mark linked budget as RECEIVED
    if (status === 'RECEIVED') {
      await db.query(
        `UPDATE purchase_budgets SET status = 'RECEIVED'
         WHERE id = (SELECT purchase_budget_id FROM purchase_orders WHERE id = $1)
         AND status = 'PURCHASED'`,
        [purchaseOrderId]
      );
    }
  }

  // Mappers
  private mapToDTO(data: any): GoodsReceipt {
    return {
      id: data.id,
      receiptNumber: data.receipt_number,
      supplierOrderId: data.supplier_order_id,
      purchaseOrderId: data.purchase_order_id,
      supplierId: data.supplier_id,
      receiptDate: data.receipt_date,
      invoiceNumber: data.invoice_number,
      invoiceDate: data.invoice_date,
      invoiceAmount: data.invoice_amount,
      status: data.status,
      qualityCheckStatus: data.quality_check_status,
      inspectedBy: data.inspected_by,
      inspectedAt: data.inspected_at,
      notes: data.notes,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Map supplier object with document → code mapping
      supplier: data.supplier ? {
        id: data.supplier.id,
        name: data.supplier.name,
        code: data.supplier.document, // Map document to code for application layer
      } : undefined,
      // Map supplier_order object
      supplierOrder: data.supplier_order ? {
        id: data.supplier_order.id,
        orderNumber: data.supplier_order.order_number,
      } : undefined,
      // Map purchase_order object (compatibilidade)
      purchaseOrder: data.purchase_order ? {
        id: data.purchase_order.id,
        orderNumber: data.purchase_order.order_number,
      } : undefined,
    } as any;
  }

  private mapItemToDTO(data: any): GoodsReceiptItem {
    return {
      id: data.id,
      goodsReceiptId: data.goods_receipt_id,
      supplierOrderItemId: data.supplier_order_item_id,
      purchaseOrderItemId: data.purchase_order_item_id,
      productId: data.product_id,
      quantityOrdered: data.quantity_ordered,
      quantityReceived: data.quantity_received,
      quantityAccepted: data.quantity_accepted,
      quantityRejected: data.quantity_rejected,
      unitPrice: data.unit_price,
      qualityStatus: data.quality_status,
      rejectionReason: data.rejection_reason,
      lotNumber: data.lot_number,
      expiryDate: data.expiry_date,
      notes: data.notes,
      createdAt: data.created_at,
      // Incluir produto se existir
      product: data.product ? {
        id: data.product.id,
        code: data.product.code,
        name: data.product.name,
      } : undefined,
    } as any;
  }
}
