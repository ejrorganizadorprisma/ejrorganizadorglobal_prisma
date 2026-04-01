import { db } from '../config/database';

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
  product?: {
    code: string;
    name: string;
  };
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

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (status) {
      conditions.push(`po.status = $${paramCounter++}`);
      values.push(status);
    }

    if (priority) {
      conditions.push(`po.priority = $${paramCounter++}`);
      values.push(priority);
    }

    if (productId) {
      conditions.push(`po.product_id = $${paramCounter++}`);
      values.push(productId);
    }

    if (assignedTo) {
      conditions.push(`po.assigned_to = $${paramCounter++}`);
      values.push(assignedTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM production_orders po ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data with product join
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const dataQuery = `
      SELECT
        po.*,
        p.code as product_code,
        p.name as product_name
      FROM production_orders po
      LEFT JOIN products p ON po.product_id = p.id
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    const result = await db.query(dataQuery, values);

    return {
      data: result.rows.map((order) => this.mapToProductionOrder(order)),
      total,
    };
  }

  async findById(id: string): Promise<ProductionOrder | null> {
    const query = `
      SELECT
        po.*,
        p.code as product_code,
        p.name as product_name
      FROM production_orders po
      LEFT JOIN products p ON po.product_id = p.id
      WHERE po.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToProductionOrder(result.rows[0]);
  }

  async create(dto: CreateProductionOrderDTO): Promise<ProductionOrder> {
    // Gerar número da ordem sequencial
    const orderNumber = await this.generateOrderNumber();

    // Generate a unique ID for the production order
    const id = `prod-order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const insertQuery = `
      INSERT INTO production_orders (
        id, order_number, product_id, bom_version_id, quantity_planned,
        priority, planned_start_date, planned_end_date, due_date,
        related_quote_id, related_service_order_id, created_by,
        assigned_to, notes, internal_notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      id,
      orderNumber,
      dto.productId,
      dto.bomVersionId || null,
      dto.quantityPlanned,
      dto.priority || 'NORMAL',
      dto.plannedStartDate || null,
      dto.plannedEndDate || null,
      dto.dueDate || null,
      dto.relatedQuoteId || null,
      dto.relatedServiceOrderId || null,
      dto.createdBy || null,
      dto.assignedTo || null,
      dto.notes || null,
      dto.internalNotes || null,
      'DRAFT',
    ];

    const result = await db.query(insertQuery, values);

    // Fetch with product details
    const created = await this.findById(result.rows[0].id);
    if (!created) {
      throw new Error('Erro ao buscar ordem criada');
    }

    return created;
  }

  async update(id: string, dto: UpdateProductionOrderDTO): Promise<ProductionOrder> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (dto.quantityPlanned !== undefined) {
      updates.push(`quantity_planned = $${paramCounter++}`);
      values.push(dto.quantityPlanned);
    }

    if (dto.status !== undefined) {
      updates.push(`status = $${paramCounter++}`);
      values.push(dto.status);

      // Atualizar datas automaticamente baseado no status
      if (dto.status === 'IN_PROGRESS' && !dto.actualStartDate) {
        updates.push(`actual_start_date = $${paramCounter++}`);
        values.push(new Date().toISOString());
      }
      if ((dto.status === 'COMPLETED' || dto.status === 'CLOSED') && !dto.actualEndDate) {
        updates.push(`actual_end_date = $${paramCounter++}`);
        values.push(new Date().toISOString());
      }
    }

    if (dto.priority !== undefined) {
      updates.push(`priority = $${paramCounter++}`);
      values.push(dto.priority);
    }

    if (dto.plannedStartDate !== undefined) {
      updates.push(`planned_start_date = $${paramCounter++}`);
      values.push(dto.plannedStartDate);
    }

    if (dto.plannedEndDate !== undefined) {
      updates.push(`planned_end_date = $${paramCounter++}`);
      values.push(dto.plannedEndDate);
    }

    if (dto.actualStartDate !== undefined) {
      updates.push(`actual_start_date = $${paramCounter++}`);
      values.push(dto.actualStartDate);
    }

    if (dto.actualEndDate !== undefined) {
      updates.push(`actual_end_date = $${paramCounter++}`);
      values.push(dto.actualEndDate);
    }

    if (dto.dueDate !== undefined) {
      updates.push(`due_date = $${paramCounter++}`);
      values.push(dto.dueDate);
    }

    if (dto.assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramCounter++}`);
      values.push(dto.assignedTo);
    }

    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramCounter++}`);
      values.push(dto.notes);
    }

    if (dto.internalNotes !== undefined) {
      updates.push(`internal_notes = $${paramCounter++}`);
      values.push(dto.internalNotes);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Ordem de produção não encontrada');
      }
      return existing;
    }

    values.push(id);
    const updateQuery = `
      UPDATE production_orders
      SET ${updates.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    await db.query(updateQuery, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Erro ao buscar ordem atualizada');
    }

    return updated;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const query = `DELETE FROM production_orders WHERE id = $1`;
    await db.query(query, [id]);
    return { success: true };
  }

  // Material Consumption
  async getMaterialConsumption(orderId: string): Promise<MaterialConsumption[]> {
    const query = `
      SELECT
        pmc.*,
        p.code as product_code,
        p.name as product_name
      FROM production_material_consumption pmc
      LEFT JOIN products p ON pmc.product_id = p.id
      WHERE pmc.production_order_id = $1
      ORDER BY pmc.created_at ASC
    `;

    const result = await db.query(query, [orderId]);
    return result.rows.map(this.mapToMaterialConsumption);
  }

  async createMaterialConsumption(dto: CreateMaterialConsumptionDTO): Promise<MaterialConsumption> {
    const insertQuery = `
      INSERT INTO production_material_consumption (
        production_order_id, product_id, bom_item_id, quantity_planned, unit_cost
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      dto.productionOrderId,
      dto.productId,
      dto.bomItemId || null,
      dto.quantityPlanned,
      dto.unitCost || null,
    ];

    const result = await db.query(insertQuery, values);

    // Fetch with product details
    const selectQuery = `
      SELECT
        pmc.*,
        p.code as product_code,
        p.name as product_name
      FROM production_material_consumption pmc
      LEFT JOIN products p ON pmc.product_id = p.id
      WHERE pmc.id = $1
    `;

    const detailResult = await db.query(selectQuery, [result.rows[0].id]);
    return this.mapToMaterialConsumption(detailResult.rows[0]);
  }

  async updateMaterialConsumption(
    id: string,
    dto: UpdateMaterialConsumptionDTO
  ): Promise<MaterialConsumption> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (dto.quantityConsumed !== undefined) {
      updates.push(`quantity_consumed = $${paramCounter++}`);
      values.push(dto.quantityConsumed);
      updates.push(`consumed_at = $${paramCounter++}`);
      values.push(new Date().toISOString());
    }

    if (dto.quantityScrapped !== undefined) {
      updates.push(`quantity_scrapped = $${paramCounter++}`);
      values.push(dto.quantityScrapped);
    }

    if (dto.consumedBy !== undefined) {
      updates.push(`consumed_by = $${paramCounter++}`);
      values.push(dto.consumedBy);
    }

    if (dto.lotNumber !== undefined) {
      updates.push(`lot_number = $${paramCounter++}`);
      values.push(dto.lotNumber);
    }

    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramCounter++}`);
      values.push(dto.notes);
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    values.push(id);
    const updateQuery = `
      UPDATE production_material_consumption
      SET ${updates.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    await db.query(updateQuery, values);

    // Fetch with product details
    const selectQuery = `
      SELECT
        pmc.*,
        p.code as product_code,
        p.name as product_name
      FROM production_material_consumption pmc
      LEFT JOIN products p ON pmc.product_id = p.id
      WHERE pmc.id = $1
    `;

    const result = await db.query(selectQuery, [id]);
    return this.mapToMaterialConsumption(result.rows[0]);
  }

  // Operations
  async getOperations(orderId: string): Promise<ProductionOperation[]> {
    const query = `
      SELECT * FROM production_operations
      WHERE production_order_id = $1
      ORDER BY operation_number ASC
    `;

    const result = await db.query(query, [orderId]);
    return result.rows.map(this.mapToOperation);
  }

  // Reportings
  async getReportings(orderId: string): Promise<ProductionReporting[]> {
    const query = `
      SELECT * FROM production_reportings
      WHERE production_order_id = $1
      ORDER BY reporting_date DESC
    `;

    const result = await db.query(query, [orderId]);
    return result.rows.map(this.mapToReporting);
  }

  async createReporting(dto: CreateProductionReportingDTO): Promise<ProductionReporting> {
    const query = `
      INSERT INTO production_reportings (
        production_order_id, quantity_produced, quantity_scrapped,
        scrap_reason, reported_by, shift, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      dto.productionOrderId,
      dto.quantityProduced,
      dto.quantityScrapped || 0,
      dto.scrapReason || null,
      dto.reportedBy || null,
      dto.shift || null,
      dto.notes || null,
    ];

    const result = await db.query(query, values);
    return this.mapToReporting(result.rows[0]);
  }

  // Helper methods
  private async generateOrderNumber(): Promise<string> {
    const query = `
      SELECT order_number FROM production_orders
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query);

    if (result.rows.length === 0) {
      return 'OP-000001';
    }

    const lastNumber = result.rows[0].order_number;
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
      product: data.product_code ? {
        code: data.product_code,
        name: data.product_name,
      } : undefined,
      bomVersionId: data.bom_version_id,
      quantityPlanned: data.quantity_planned,
      quantityProduced: data.quantity_produced || 0,
      quantityScrapped: data.quantity_scrapped || 0,
      quantityPending: data.quantity_pending || 0,
      status: data.status,
      priority: data.priority,
      plannedStartDate: data.planned_start_date,
      plannedEndDate: data.planned_end_date,
      actualStartDate: data.actual_start_date,
      actualEndDate: data.actual_end_date,
      dueDate: data.due_date,
      materialCost: data.material_cost || 0,
      laborCost: data.labor_cost || 0,
      overheadCost: data.overhead_cost || 0,
      totalCost: data.total_cost || 0,
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
