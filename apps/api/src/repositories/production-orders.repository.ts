import { supabase } from '../config/supabase';

export type ProductionOrderStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type ProductionOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  bomVersionId?: string;
  quantityPlanned: number;
  quantityProduced: number;
  quantityScrapped: number;
  quantityPending: number;
  status: ProductionOrderStatus;
  priority: ProductionOrderPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  dueDate?: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  relatedQuoteId?: string;
  relatedServiceOrderId?: string;
  createdBy?: string;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialConsumption {
  id: string;
  productionOrderId: string;
  productId: string;
  bomItemId?: string;
  quantityPlanned: number;
  quantityConsumed: number;
  quantityScrapped: number;
  unitCost?: number;
  consumedBy?: string;
  consumedAt?: string;
  lotNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface ProductionOperation {
  id: string;
  productionOrderId: string;
  operationNumber: number;
  name: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  startedAt?: string;
  completedAt?: string;
  assignedTo?: string;
  workstation?: string;
  requiredSkills?: string;
  qualityCheckRequired: boolean;
  qualityStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
  qualityNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionReporting {
  id: string;
  productionOrderId: string;
  reportingDate: string;
  quantityProduced: number;
  quantityScrapped: number;
  scrapReason?: string;
  reportedBy?: string;
  shift?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateProductionOrderDTO {
  productId: string;
  bomVersionId?: string;
  quantityPlanned: number;
  priority?: ProductionOrderPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  dueDate?: string;
  relatedQuoteId?: string;
  relatedServiceOrderId?: string;
  createdBy?: string;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
}

export interface UpdateProductionOrderDTO {
  quantityPlanned?: number;
  status?: ProductionOrderStatus;
  priority?: ProductionOrderPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  dueDate?: string;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
}

export interface CreateMaterialConsumptionDTO {
  productionOrderId: string;
  productId: string;
  bomItemId?: string;
  quantityPlanned: number;
  unitCost?: number;
}

export interface UpdateMaterialConsumptionDTO {
  quantityConsumed?: number;
  quantityScrapped?: number;
  consumedBy?: string;
  lotNumber?: string;
  notes?: string;
}

export interface CreateProductionReportingDTO {
  productionOrderId: string;
  quantityProduced: number;
  quantityScrapped?: number;
  scrapReason?: string;
  reportedBy?: string;
  shift?: string;
  notes?: string;
}

export class ProductionOrdersRepository {
  async findMany(params: {
    page: number;
    limit: number;
    status?: ProductionOrderStatus;
    priority?: ProductionOrderPriority;
    productId?: string;
    assignedTo?: string;
  }) {
    const { page, limit, status, priority, productId, assignedTo } = params;

    let query = supabase
      .from('production_orders')
      .select('*, products(code, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar ordens de produção: ${error.message}`);
    }

    return {
      data: (data || []).map(this.mapToProductionOrder),
      total: count || 0,
    };
  }

  async findById(id: string): Promise<ProductionOrder | null> {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, products(code, name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar ordem de produção: ${error.message}`);
    }

    return this.mapToProductionOrder(data);
  }

  async create(dto: CreateProductionOrderDTO): Promise<ProductionOrder> {
    // Gerar número da ordem sequencial
    const orderNumber = await this.generateOrderNumber();

    const { data, error } = await supabase
      .from('production_orders')
      .insert({
        order_number: orderNumber,
        product_id: dto.productId,
        bom_version_id: dto.bomVersionId,
        quantity_planned: dto.quantityPlanned,
        priority: dto.priority || 'NORMAL',
        planned_start_date: dto.plannedStartDate,
        planned_end_date: dto.plannedEndDate,
        due_date: dto.dueDate,
        related_quote_id: dto.relatedQuoteId,
        related_service_order_id: dto.relatedServiceOrderId,
        created_by: dto.createdBy,
        assigned_to: dto.assignedTo,
        notes: dto.notes,
        internal_notes: dto.internalNotes,
        status: 'DRAFT',
      })
      .select('*, products(code, name)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar ordem de produção: ${error.message}`);
    }

    return this.mapToProductionOrder(data);
  }

  async update(id: string, dto: UpdateProductionOrderDTO): Promise<ProductionOrder> {
    const updateData: any = {};

    if (dto.quantityPlanned !== undefined) updateData.quantity_planned = dto.quantityPlanned;
    if (dto.status !== undefined) {
      updateData.status = dto.status;

      // Atualizar datas automaticamente baseado no status
      if (dto.status === 'IN_PROGRESS' && !dto.actualStartDate) {
        updateData.actual_start_date = new Date().toISOString();
      }
      if ((dto.status === 'COMPLETED' || dto.status === 'CLOSED') && !dto.actualEndDate) {
        updateData.actual_end_date = new Date().toISOString();
      }
    }
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.plannedStartDate !== undefined) updateData.planned_start_date = dto.plannedStartDate;
    if (dto.plannedEndDate !== undefined) updateData.planned_end_date = dto.plannedEndDate;
    if (dto.actualStartDate !== undefined) updateData.actual_start_date = dto.actualStartDate;
    if (dto.actualEndDate !== undefined) updateData.actual_end_date = dto.actualEndDate;
    if (dto.dueDate !== undefined) updateData.due_date = dto.dueDate;
    if (dto.assignedTo !== undefined) updateData.assigned_to = dto.assignedTo;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.internalNotes !== undefined) updateData.internal_notes = dto.internalNotes;

    const { data, error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', id)
      .select('*, products(code, name)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar ordem de produção: ${error.message}`);
    }

    return this.mapToProductionOrder(data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar ordem de produção: ${error.message}`);
    }

    return { success: true };
  }

  // Material Consumption
  async getMaterialConsumption(orderId: string): Promise<MaterialConsumption[]> {
    const { data, error } = await supabase
      .from('production_material_consumption')
      .select('*, products(code, name)')
      .eq('production_order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar consumo de materiais: ${error.message}`);
    }

    return (data || []).map(this.mapToMaterialConsumption);
  }

  async createMaterialConsumption(dto: CreateMaterialConsumptionDTO): Promise<MaterialConsumption> {
    const { data, error } = await supabase
      .from('production_material_consumption')
      .insert({
        production_order_id: dto.productionOrderId,
        product_id: dto.productId,
        bom_item_id: dto.bomItemId,
        quantity_planned: dto.quantityPlanned,
        unit_cost: dto.unitCost,
      })
      .select('*, products(code, name)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar consumo de material: ${error.message}`);
    }

    return this.mapToMaterialConsumption(data);
  }

  async updateMaterialConsumption(
    id: string,
    dto: UpdateMaterialConsumptionDTO
  ): Promise<MaterialConsumption> {
    const updateData: any = {};

    if (dto.quantityConsumed !== undefined) {
      updateData.quantity_consumed = dto.quantityConsumed;
      updateData.consumed_at = new Date().toISOString();
    }
    if (dto.quantityScrapped !== undefined) updateData.quantity_scrapped = dto.quantityScrapped;
    if (dto.consumedBy !== undefined) updateData.consumed_by = dto.consumedBy;
    if (dto.lotNumber !== undefined) updateData.lot_number = dto.lotNumber;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const { data, error } = await supabase
      .from('production_material_consumption')
      .update(updateData)
      .eq('id', id)
      .select('*, products(code, name)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar consumo de material: ${error.message}`);
    }

    return this.mapToMaterialConsumption(data);
  }

  // Operations
  async getOperations(orderId: string): Promise<ProductionOperation[]> {
    const { data, error } = await supabase
      .from('production_operations')
      .select('*')
      .eq('production_order_id', orderId)
      .order('operation_number', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar operações: ${error.message}`);
    }

    return (data || []).map(this.mapToOperation);
  }

  // Reportings
  async getReportings(orderId: string): Promise<ProductionReporting[]> {
    const { data, error } = await supabase
      .from('production_reportings')
      .select('*')
      .eq('production_order_id', orderId)
      .order('reporting_date', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar apontamentos: ${error.message}`);
    }

    return (data || []).map(this.mapToReporting);
  }

  async createReporting(dto: CreateProductionReportingDTO): Promise<ProductionReporting> {
    const { data, error } = await supabase
      .from('production_reportings')
      .insert({
        production_order_id: dto.productionOrderId,
        quantity_produced: dto.quantityProduced,
        quantity_scrapped: dto.quantityScrapped || 0,
        scrap_reason: dto.scrapReason,
        reported_by: dto.reportedBy,
        shift: dto.shift,
        notes: dto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar apontamento: ${error.message}`);
    }

    return this.mapToReporting(data);
  }

  // Helper methods
  private async generateOrderNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('production_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Erro ao gerar número da ordem: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return 'OP-000001';
    }

    const lastNumber = data[0].order_number;
    const match = lastNumber.match(/OP-(\d+)/);

    if (!match) {
      return 'OP-000001';
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `OP-${String(nextNumber).padStart(6, '0')}`;
  }

  private mapToProductionOrder(data: any): ProductionOrder {
    return {
      id: data.id,
      orderNumber: data.order_number,
      productId: data.product_id,
      bomVersionId: data.bom_version_id,
      quantityPlanned: data.quantity_planned,
      quantityProduced: data.quantity_produced,
      quantityScrapped: data.quantity_scrapped,
      quantityPending: data.quantity_pending,
      status: data.status,
      priority: data.priority,
      plannedStartDate: data.planned_start_date,
      plannedEndDate: data.planned_end_date,
      actualStartDate: data.actual_start_date,
      actualEndDate: data.actual_end_date,
      dueDate: data.due_date,
      materialCost: data.material_cost,
      laborCost: data.labor_cost,
      overheadCost: data.overhead_cost,
      totalCost: data.total_cost,
      relatedQuoteId: data.related_quote_id,
      relatedServiceOrderId: data.related_service_order_id,
      createdBy: data.created_by,
      assignedTo: data.assigned_to,
      notes: data.notes,
      internalNotes: data.internal_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToMaterialConsumption(data: any): MaterialConsumption {
    return {
      id: data.id,
      productionOrderId: data.production_order_id,
      productId: data.product_id,
      bomItemId: data.bom_item_id,
      quantityPlanned: data.quantity_planned,
      quantityConsumed: data.quantity_consumed,
      quantityScrapped: data.quantity_scrapped,
      unitCost: data.unit_cost,
      consumedBy: data.consumed_by,
      consumedAt: data.consumed_at,
      lotNumber: data.lot_number,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  private mapToOperation(data: any): ProductionOperation {
    return {
      id: data.id,
      productionOrderId: data.production_order_id,
      operationNumber: data.operation_number,
      name: data.name,
      description: data.description,
      status: data.status,
      estimatedDurationMinutes: data.estimated_duration_minutes,
      actualDurationMinutes: data.actual_duration_minutes,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      assignedTo: data.assigned_to,
      workstation: data.workstation,
      requiredSkills: data.required_skills,
      qualityCheckRequired: data.quality_check_required,
      qualityStatus: data.quality_status,
      qualityNotes: data.quality_notes,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToReporting(data: any): ProductionReporting {
    return {
      id: data.id,
      productionOrderId: data.production_order_id,
      reportingDate: data.reporting_date,
      quantityProduced: data.quantity_produced,
      quantityScrapped: data.quantity_scrapped,
      scrapReason: data.scrap_reason,
      reportedBy: data.reported_by,
      shift: data.shift,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }
}
