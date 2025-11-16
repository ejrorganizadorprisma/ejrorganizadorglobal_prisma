import { supabase } from '../config/supabase';

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId?: string;
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
  purchaseOrderItemId?: string;
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
  purchaseOrderId?: string;
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
  purchaseOrderItemId?: string;
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
    const { data, error } = await supabase
      .from('goods_receipts')
      .select('receipt_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao gerar número do recebimento: ${error.message}`);
    }

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (!data || data.length === 0) {
      return `GR${year}${month}0001`;
    }

    const lastNumber = data[0].receipt_number;
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
    purchaseOrderId?: string;
  }) {
    const { page, limit, search, status, supplierId, purchaseOrderId } = params;

    let query = supabase
      .from('goods_receipts')
      .select(`
        *,
        supplier:suppliers!inner(id, name, code),
        purchase_order:purchase_orders(id, order_number)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`receipt_number.ilike.%${search}%,invoice_number.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (purchaseOrderId) {
      query = query.eq('purchase_order_id', purchaseOrderId);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Erro ao buscar recebimentos: ${error.message}`);

    return {
      data: (data || []).map(this.mapToDTO),
      total: count || 0,
    };
  }

  async findById(id: string): Promise<GoodsReceipt | null> {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select(`
        *,
        supplier:suppliers!inner(id, name, code),
        purchase_order:purchase_orders(id, order_number)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar recebimento: ${error.message}`);
    }

    return this.mapToDTO(data);
  }

  async findByReceiptNumber(receiptNumber: string): Promise<GoodsReceipt | null> {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select(`
        *,
        supplier:suppliers!inner(id, name, code),
        purchase_order:purchase_orders(id, order_number)
      `)
      .eq('receipt_number', receiptNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar recebimento: ${error.message}`);
    }

    return this.mapToDTO(data);
  }

  async create(receiptData: CreateGoodsReceiptDTO): Promise<GoodsReceipt> {
    const receiptNumber = await this.generateReceiptNumber();

    // Cria o recebimento
    const { data: receipt, error: receiptError } = await supabase
      .from('goods_receipts')
      .insert({
        receipt_number: receiptNumber,
        purchase_order_id: receiptData.purchaseOrderId,
        supplier_id: receiptData.supplierId,
        receipt_date: receiptData.receiptDate || new Date().toISOString(),
        invoice_number: receiptData.invoiceNumber,
        invoice_date: receiptData.invoiceDate,
        invoice_amount: receiptData.invoiceAmount,
        status: 'PENDING',
        quality_check_status: 'PENDING',
        notes: receiptData.notes,
        created_by: receiptData.createdBy,
      })
      .select()
      .single();

    if (receiptError) throw new Error(`Erro ao criar recebimento: ${receiptError.message}`);

    // Cria os itens
    const itemsToInsert = receiptData.items.map(item => ({
      goods_receipt_id: receipt.id,
      purchase_order_item_id: item.purchaseOrderItemId,
      product_id: item.productId,
      quantity_ordered: item.quantityOrdered,
      quantity_received: item.quantityReceived,
      quantity_accepted: 0,
      quantity_rejected: 0,
      unit_price: item.unitPrice,
      quality_status: 'PENDING',
      lot_number: item.lotNumber,
      expiry_date: item.expiryDate,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('goods_receipt_items')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(`Erro ao criar itens do recebimento: ${itemsError.message}`);

    return this.findById(receipt.id) as Promise<GoodsReceipt>;
  }

  async update(id: string, receiptData: UpdateGoodsReceiptDTO): Promise<GoodsReceipt> {
    const updateData: any = {};

    if (receiptData.status !== undefined) updateData.status = receiptData.status;
    if (receiptData.qualityCheckStatus !== undefined) updateData.quality_check_status = receiptData.qualityCheckStatus;
    if (receiptData.notes !== undefined) updateData.notes = receiptData.notes;

    if (receiptData.inspectedBy !== undefined) {
      updateData.inspected_by = receiptData.inspectedBy;
      updateData.inspected_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('goods_receipts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar recebimento: ${error.message}`);

    return this.findById(id) as Promise<GoodsReceipt>;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('goods_receipts')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar recebimento: ${error.message}`);

    return { success: true };
  }

  // Métodos para itens
  async getItems(receiptId: string): Promise<GoodsReceiptItem[]> {
    const { data, error } = await supabase
      .from('goods_receipt_items')
      .select(`
        *,
        product:products!inner(id, code, name),
        purchase_order_item:purchase_order_items(id, quantity, unit_price)
      `)
      .eq('goods_receipt_id', receiptId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Erro ao buscar itens do recebimento: ${error.message}`);

    return (data || []).map(this.mapItemToDTO);
  }

  async addItem(receiptId: string, item: CreateGoodsReceiptItemDTO): Promise<GoodsReceiptItem> {
    const { data, error } = await supabase
      .from('goods_receipt_items')
      .insert({
        goods_receipt_id: receiptId,
        purchase_order_item_id: item.purchaseOrderItemId,
        product_id: item.productId,
        quantity_ordered: item.quantityOrdered,
        quantity_received: item.quantityReceived,
        quantity_accepted: 0,
        quantity_rejected: 0,
        unit_price: item.unitPrice,
        quality_status: 'PENDING',
        lot_number: item.lotNumber,
        expiry_date: item.expiryDate,
        notes: item.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar item: ${error.message}`);

    return this.mapItemToDTO(data);
  }

  async updateItem(itemId: string, itemData: Partial<CreateGoodsReceiptItemDTO>): Promise<GoodsReceiptItem> {
    const updateData: any = {};

    if (itemData.productId !== undefined) updateData.product_id = itemData.productId;
    if (itemData.quantityOrdered !== undefined) updateData.quantity_ordered = itemData.quantityOrdered;
    if (itemData.quantityReceived !== undefined) updateData.quantity_received = itemData.quantityReceived;
    if (itemData.unitPrice !== undefined) updateData.unit_price = itemData.unitPrice;
    if (itemData.lotNumber !== undefined) updateData.lot_number = itemData.lotNumber;
    if (itemData.expiryDate !== undefined) updateData.expiry_date = itemData.expiryDate;
    if (itemData.notes !== undefined) updateData.notes = itemData.notes;

    const { data, error } = await supabase
      .from('goods_receipt_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar item: ${error.message}`);

    return this.mapItemToDTO(data);
  }

  async deleteItem(itemId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('goods_receipt_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Erro ao deletar item: ${error.message}`);

    return { success: true };
  }

  // Aprovar item de recebimento (atualiza quantidades aceitas/rejeitadas)
  async approveItem(itemId: string, approvalData: ApproveReceiptItemDTO): Promise<GoodsReceiptItem> {
    const { data, error } = await supabase
      .from('goods_receipt_items')
      .update({
        quantity_accepted: approvalData.quantityAccepted,
        quantity_rejected: approvalData.quantityRejected,
        quality_status: approvalData.qualityStatus,
        rejection_reason: approvalData.rejectionReason,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao aprovar item: ${error.message}`);

    // Atualizar status de qualidade do recebimento
    const receiptId = data.goods_receipt_id;
    await this.updateReceiptQualityStatus(receiptId);

    return this.mapItemToDTO(data);
  }

  // Aprovar recebimento completo (atualiza estoque e status)
  async approveReceipt(receiptId: string, approvedBy: string): Promise<GoodsReceipt> {
    // Busca todos os itens do recebimento
    const items = await this.getItems(receiptId);

    // Verifica se todos os itens foram inspecionados
    const allInspected = items.every(item =>
      item.qualityStatus && item.qualityStatus !== 'PENDING'
    );

    if (!allInspected) {
      throw new Error('Todos os itens devem ser inspecionados antes de aprovar o recebimento');
    }

    // Atualiza o status do recebimento
    const { error } = await supabase
      .from('goods_receipts')
      .update({
        status: 'APPROVED',
        inspected_by: approvedBy,
        inspected_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (error) throw new Error(`Erro ao aprovar recebimento: ${error.message}`);

    // Atualizar status da ordem de compra se existir
    const receipt = await this.findById(receiptId);
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

    await supabase
      .from('goods_receipts')
      .update({ quality_check_status: qualityStatus })
      .eq('id', receiptId);
  }

  // Atualiza o status da ordem de compra baseado nas quantidades recebidas
  private async updatePurchaseOrderStatus(purchaseOrderId: string): Promise<void> {
    const { data: items, error } = await supabase
      .from('purchase_order_items')
      .select('quantity, quantity_received')
      .eq('purchase_order_id', purchaseOrderId);

    if (error) return;

    let allReceived = true;
    let someReceived = false;

    items?.forEach(item => {
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

    await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', purchaseOrderId);
  }

  // Mappers
  private mapToDTO(data: any): GoodsReceipt {
    return {
      id: data.id,
      receiptNumber: data.receipt_number,
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
    };
  }

  private mapItemToDTO(data: any): GoodsReceiptItem {
    return {
      id: data.id,
      goodsReceiptId: data.goods_receipt_id,
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
    };
  }
}
