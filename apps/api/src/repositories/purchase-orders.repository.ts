import { supabase } from '../config/supabase';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
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
}

export interface CreatePurchaseOrderDTO {
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  createdBy?: string;
  items: CreatePurchaseOrderItemDTO[];
}

export interface CreatePurchaseOrderItemDTO {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercentage?: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface UpdatePurchaseOrderDTO {
  supplierId?: string;
  status?: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  paymentTerms?: string;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID';
  notes?: string;
  internalNotes?: string;
  approvedBy?: string;
}

export class PurchaseOrdersRepository {
  // Gera número único para ordem de compra
  private async generateOrderNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao gerar número da ordem: ${error.message}`);
    }

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (!data || data.length === 0) {
      return `PO${year}${month}0001`;
    }

    const lastNumber = data[0].order_number;
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

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers!inner(id, name, code)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Erro ao buscar ordens de compra: ${error.message}`);

    return {
      data: (data || []).map(this.mapToDTO),
      total: count || 0,
    };
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers!inner(id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar ordem de compra: ${error.message}`);
    }

    return this.mapToDTO(data);
  }

  async findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | null> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers!inner(id, name, code)
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar ordem de compra: ${error.message}`);
    }

    return this.mapToDTO(data);
  }

  async create(orderData: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const orderNumber = await this.generateOrderNumber();
    const totals = this.calculateTotals(orderData.items);

    // Cria a ordem de compra
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: orderNumber,
        supplier_id: orderData.supplierId,
        order_date: orderData.orderDate || new Date().toISOString(),
        expected_delivery_date: orderData.expectedDeliveryDate,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        payment_terms: orderData.paymentTerms,
        notes: orderData.notes,
        internal_notes: orderData.internalNotes,
        created_by: orderData.createdBy,
        status: 'DRAFT',
        payment_status: 'PENDING',
        shipping_cost: 0,
        discount_amount: 0,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Erro ao criar ordem de compra: ${orderError.message}`);

    // Cria os itens
    const itemsToInsert = orderData.items.map(item => ({
      purchase_order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate || 0,
      discount_percentage: item.discountPercentage || 0,
      total_price: this.calculateItemTotal(item),
      expected_delivery_date: item.expectedDeliveryDate,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(`Erro ao criar itens da ordem: ${itemsError.message}`);

    return this.findById(order.id) as Promise<PurchaseOrder>;
  }

  async update(id: string, orderData: UpdatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const updateData: any = {};

    if (orderData.supplierId !== undefined) updateData.supplier_id = orderData.supplierId;
    if (orderData.status !== undefined) updateData.status = orderData.status;
    if (orderData.expectedDeliveryDate !== undefined) updateData.expected_delivery_date = orderData.expectedDeliveryDate;
    if (orderData.actualDeliveryDate !== undefined) updateData.actual_delivery_date = orderData.actualDeliveryDate;
    if (orderData.paymentTerms !== undefined) updateData.payment_terms = orderData.paymentTerms;
    if (orderData.paymentStatus !== undefined) updateData.payment_status = orderData.paymentStatus;
    if (orderData.notes !== undefined) updateData.notes = orderData.notes;
    if (orderData.internalNotes !== undefined) updateData.internal_notes = orderData.internalNotes;

    if (orderData.approvedBy !== undefined) {
      updateData.approved_by = orderData.approvedBy;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar ordem de compra: ${error.message}`);

    return this.findById(id) as Promise<PurchaseOrder>;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar ordem de compra: ${error.message}`);

    return { success: true };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar status da ordem: ${error.message}`);

    return this.findById(orderId) as Promise<PurchaseOrder>;
  }

  // Métodos para itens
  async getItems(orderId: string): Promise<PurchaseOrderItem[]> {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select(`
        *,
        product:products!inner(id, code, name)
      `)
      .eq('purchase_order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Erro ao buscar itens da ordem: ${error.message}`);

    return (data || []).map(this.mapItemToDTO);
  }

  async addItem(orderId: string, item: CreatePurchaseOrderItemDTO): Promise<PurchaseOrderItem> {
    const totalPrice = this.calculateItemTotal(item);

    const { data, error } = await supabase
      .from('purchase_order_items')
      .insert({
        purchase_order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0,
        discount_percentage: item.discountPercentage || 0,
        total_price: totalPrice,
        expected_delivery_date: item.expectedDeliveryDate,
        notes: item.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar item: ${error.message}`);

    // Recalcula totais da ordem
    await this.recalculateTotals(orderId);

    return this.mapItemToDTO(data);
  }

  async updateItem(itemId: string, itemData: Partial<CreatePurchaseOrderItemDTO>): Promise<PurchaseOrderItem> {
    // Busca o item atual
    const { data: currentItem, error: fetchError } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError) throw new Error(`Erro ao buscar item: ${fetchError.message}`);

    const updateData: any = {};

    if (itemData.productId !== undefined) updateData.product_id = itemData.productId;
    if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity;
    if (itemData.unitPrice !== undefined) updateData.unit_price = itemData.unitPrice;
    if (itemData.taxRate !== undefined) updateData.tax_rate = itemData.taxRate;
    if (itemData.discountPercentage !== undefined) updateData.discount_percentage = itemData.discountPercentage;
    if (itemData.expectedDeliveryDate !== undefined) updateData.expected_delivery_date = itemData.expectedDeliveryDate;
    if (itemData.notes !== undefined) updateData.notes = itemData.notes;

    // Recalcula o total do item se necessário
    const itemForCalc: CreatePurchaseOrderItemDTO = {
      productId: itemData.productId ?? currentItem.product_id,
      quantity: itemData.quantity ?? currentItem.quantity,
      unitPrice: itemData.unitPrice ?? currentItem.unit_price,
      taxRate: itemData.taxRate ?? currentItem.tax_rate,
      discountPercentage: itemData.discountPercentage ?? currentItem.discount_percentage,
    };

    updateData.total_price = this.calculateItemTotal(itemForCalc);

    const { data, error } = await supabase
      .from('purchase_order_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar item: ${error.message}`);

    // Recalcula totais da ordem
    await this.recalculateTotals(currentItem.purchase_order_id);

    return this.mapItemToDTO(data);
  }

  async deleteItem(itemId: string): Promise<{ success: boolean }> {
    // Busca o item para pegar o purchase_order_id
    const { data: item, error: fetchError } = await supabase
      .from('purchase_order_items')
      .select('purchase_order_id')
      .eq('id', itemId)
      .single();

    if (fetchError) throw new Error(`Erro ao buscar item: ${fetchError.message}`);

    const { error } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Erro ao deletar item: ${error.message}`);

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

    await supabase
      .from('purchase_orders')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total_amount: subtotal + taxAmount,
      })
      .eq('id', orderId);
  }

  // Mappers
  private mapToDTO(data: any): PurchaseOrder {
    return {
      id: data.id,
      orderNumber: data.order_number,
      supplierId: data.supplier_id,
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
    };
  }

  private mapItemToDTO(data: any): PurchaseOrderItem {
    return {
      id: data.id,
      purchaseOrderId: data.purchase_order_id,
      productId: data.product_id,
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
    };
  }
}
