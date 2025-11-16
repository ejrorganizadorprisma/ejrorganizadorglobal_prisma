import { supabase } from '../config/supabase';
import type { ServiceOrder, ServiceOrderWithRelations, ServiceOrderStatus, CreateServiceOrderDTO, UpdateServiceOrderDTO } from '@ejr/shared-types';

export class ServiceOrdersRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: ServiceOrderStatus;
    customerId?: string;
    technicianId?: string;
    isWarranty?: boolean;
  }) {
    const { page, limit, search, status, customerId, technicianId, isWarranty } = params;

    let query = supabase
      .from('service_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Filtro de busca
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,issue_description.ilike.%${search}%,diagnosis.ilike.%${search}%`);
    }

    // Filtro de status
    if (status) {
      query = query.eq('status', status);
    }

    // Filtro de cliente
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Filtro de técnico
    if (technicianId) {
      query = query.eq('technician_id', technicianId);
    }

    // Filtro de garantia
    if (isWarranty !== undefined) {
      query = query.eq('is_warranty', isWarranty);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar ordens de serviço: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(order => this.mapToServiceOrder(order));
  }

  async count(params: {
    search?: string;
    status?: ServiceOrderStatus;
    customerId?: string;
    technicianId?: string;
    isWarranty?: boolean;
  }) {
    const { search, status, customerId, technicianId, isWarranty } = params;

    let query = supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });

    // Filtro de busca
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,issue_description.ilike.%${search}%,diagnosis.ilike.%${search}%`);
    }

    // Filtro de status
    if (status) {
      query = query.eq('status', status);
    }

    // Filtro de cliente
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Filtro de técnico
    if (technicianId) {
      query = query.eq('technician_id', technicianId);
    }

    // Filtro de garantia
    if (isWarranty !== undefined) {
      query = query.eq('is_warranty', isWarranty);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Supabase count error:', error);
      return 0;
    }

    return count || 0;
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        customer:customers!service_orders_customer_id_fkey(
          id,
          name,
          document,
          email,
          phone
        ),
        product:products!service_orders_product_id_fkey(
          id,
          code,
          name,
          category
        ),
        technician:users!service_orders_technician_id_fkey(
          id,
          name,
          email
        ),
        partsUsed:service_parts(
          id,
          service_order_id,
          product_id,
          quantity,
          unit_cost,
          total_cost,
          created_at,
          product:products!service_parts_product_id_fkey(
            id,
            code,
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar ordem de serviço: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      orderNumber: data.order_number,
      customerId: data.customer_id,
      productId: data.product_id,
      technicianId: data.technician_id,
      status: data.status,
      isWarranty: data.is_warranty,
      issueDescription: data.issue_description,
      diagnosis: data.diagnosis,
      servicePerformed: data.service_performed,
      customerNotes: data.customer_notes,
      internalNotes: data.internal_notes,
      laborCost: data.labor_cost,
      partsCost: data.parts_cost,
      totalCost: data.total_cost,
      entryDate: data.entry_date,
      estimatedDelivery: data.estimated_delivery,
      completionDate: data.completion_date,
      photos: data.photos,
      documents: data.documents,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      customer: {
        id: data.customer.id,
        name: data.customer.name,
        document: data.customer.document,
        email: data.customer.email,
        phone: data.customer.phone,
      },
      product: {
        id: data.product.id,
        code: data.product.code,
        name: data.product.name,
        category: data.product.category,
      },
      technician: data.technician ? {
        id: data.technician.id,
        name: data.technician.name,
        email: data.technician.email,
      } : undefined,
      partsUsed: (data.partsUsed || []).map((part: any) => ({
        id: part.id,
        serviceOrderId: part.service_order_id,
        productId: part.product_id,
        quantity: part.quantity,
        unitCost: part.unit_cost,
        totalCost: part.total_cost,
        createdAt: part.created_at,
        product: {
          id: part.product.id,
          code: part.product.code,
          name: part.product.name,
        },
      })),
    } as ServiceOrderWithRelations;
  }

  async create(orderData: CreateServiceOrderDTO) {
    // Gerar número da OS usando RPC
    const { data: orderNumber, error: rpcError } = await supabase
      .rpc('generate_service_order_number');

    if (rpcError) {
      throw new Error(`Erro ao gerar número da OS: ${rpcError.message}`);
    }

    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        order_number: orderNumber,
        customer_id: orderData.customerId,
        product_id: orderData.productId,
        technician_id: orderData.technicianId,
        status: 'OPEN',
        is_warranty: orderData.isWarranty,
        issue_description: orderData.issueDescription,
        customer_notes: orderData.customerNotes,
        estimated_delivery: orderData.estimatedDelivery,
        entry_date: new Date().toISOString(),
        labor_cost: 0,
        parts_cost: 0,
        total_cost: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar ordem de serviço: ${error.message}`);
    }

    return this.mapToServiceOrder(data);
  }

  async update(id: string, orderData: UpdateServiceOrderDTO) {
    const updateData: any = {};

    if (orderData.technicianId !== undefined) updateData.technician_id = orderData.technicianId;
    if (orderData.status !== undefined) updateData.status = orderData.status;
    if (orderData.diagnosis !== undefined) updateData.diagnosis = orderData.diagnosis;
    if (orderData.servicePerformed !== undefined) updateData.service_performed = orderData.servicePerformed;
    if (orderData.internalNotes !== undefined) updateData.internal_notes = orderData.internalNotes;
    if (orderData.laborCost !== undefined) updateData.labor_cost = orderData.laborCost;
    if (orderData.estimatedDelivery !== undefined) updateData.estimated_delivery = orderData.estimatedDelivery;
    if (orderData.completionDate !== undefined) updateData.completion_date = orderData.completionDate;
    if (orderData.photos !== undefined) updateData.photos = orderData.photos;
    if (orderData.documents !== undefined) updateData.documents = orderData.documents;

    const { data, error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar ordem de serviço: ${error.message}`);
    }

    return this.mapToServiceOrder(data);
  }

  async delete(id: string) {
    const { error } = await supabase
      .from('service_orders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar ordem de serviço: ${error.message}`);
    }

    return { success: true };
  }

  async getByStatus(status: ServiceOrderStatus) {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar ordens de serviço por status: ${error.message}`);
    }

    return (data || []).map(order => this.mapToServiceOrder(order));
  }

  async getByCustomer(customerId: string) {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar ordens de serviço do cliente: ${error.message}`);
    }

    return (data || []).map(order => this.mapToServiceOrder(order));
  }

  async completeServiceOrder(id: string, servicePerformed: string, laborCost: number) {
    const { data, error } = await supabase
      .rpc('complete_service_order', {
        p_service_order_id: id,
        p_service_performed: servicePerformed,
        p_labor_cost: laborCost
      });

    if (error) {
      throw new Error(`Erro ao completar ordem de serviço: ${error.message}`);
    }

    return { success: true, data };
  }

  private mapToServiceOrder(data: any): ServiceOrder {
    return {
      id: data.id,
      orderNumber: data.order_number,
      customerId: data.customer_id,
      productId: data.product_id,
      technicianId: data.technician_id,
      status: data.status,
      isWarranty: data.is_warranty,
      issueDescription: data.issue_description,
      diagnosis: data.diagnosis,
      servicePerformed: data.service_performed,
      customerNotes: data.customer_notes,
      internalNotes: data.internal_notes,
      laborCost: data.labor_cost,
      partsCost: data.parts_cost,
      totalCost: data.total_cost,
      entryDate: data.entry_date,
      estimatedDelivery: data.estimated_delivery,
      completionDate: data.completion_date,
      photos: data.photos,
      documents: data.documents,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
