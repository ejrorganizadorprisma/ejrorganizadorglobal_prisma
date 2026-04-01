import { db } from '../config/database';
import type {
  FabricationMachine,
  FabricationMachineType,
  DigitalFabricationBatch,
  FabricationJobStatus,
  DigitalFabricationItem,
  FabricationMaterialConsumption,
  DigitalFabricationHistory,
  CreateFabricationMachineDTO,
  UpdateFabricationMachineDTO,
  CreateDigitalFabricationBatchDTO,
  UpdateDigitalFabricationBatchDTO,
  CreateDigitalFabricationItemDTO,
  UpdateDigitalFabricationItemDTO,
  RegisterMaterialConsumptionDTO,
  CompleteFabricationItemDTO,
  FabricationBatchSummary,
  FabricationDashboardStats,
  MaterialUnit,
} from '@ejr/shared-types';

export class DigitalFabricationRepository {
  // ============================================
  // FABRICATION MACHINES
  // ============================================

  async findAllMachines(params: {
    type?: FabricationMachineType;
    isActive?: boolean;
  } = {}): Promise<FabricationMachine[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(params.type);
      paramIndex++;
    }

    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(params.isActive);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT *
      FROM fabrication_machines
      ${whereClause}
      ORDER BY name ASC
    `;

    const result = await db.query(query, values);

    return result.rows.map(this.mapToMachine);
  }

  async findMachineById(id: string): Promise<FabricationMachine | null> {
    const query = `
      SELECT *
      FROM fabrication_machines
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return null;

    return this.mapToMachine(result.rows[0]);
  }

  async createMachine(dto: CreateFabricationMachineDTO): Promise<FabricationMachine> {
    const query = `
      INSERT INTO fabrication_machines (
        name, type, model, brand, build_volume_x, build_volume_y,
        build_volume_z, is_active, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      dto.name,
      dto.type,
      dto.model,
      dto.brand,
      dto.buildVolumeX,
      dto.buildVolumeY,
      dto.buildVolumeZ,
      dto.isActive ?? true,
      dto.notes,
    ]);

    return this.mapToMachine(result.rows[0]);
  }

  async updateMachine(id: string, dto: UpdateFabricationMachineDTO): Promise<FabricationMachine> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(dto.name);
      paramIndex++;
    }
    if (dto.type !== undefined) {
      fields.push(`type = $${paramIndex}`);
      values.push(dto.type);
      paramIndex++;
    }
    if (dto.model !== undefined) {
      fields.push(`model = $${paramIndex}`);
      values.push(dto.model);
      paramIndex++;
    }
    if (dto.brand !== undefined) {
      fields.push(`brand = $${paramIndex}`);
      values.push(dto.brand);
      paramIndex++;
    }
    if (dto.buildVolumeX !== undefined) {
      fields.push(`build_volume_x = $${paramIndex}`);
      values.push(dto.buildVolumeX);
      paramIndex++;
    }
    if (dto.buildVolumeY !== undefined) {
      fields.push(`build_volume_y = $${paramIndex}`);
      values.push(dto.buildVolumeY);
      paramIndex++;
    }
    if (dto.buildVolumeZ !== undefined) {
      fields.push(`build_volume_z = $${paramIndex}`);
      values.push(dto.buildVolumeZ);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      values.push(dto.isActive);
      paramIndex++;
    }
    if (dto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(dto.notes);
      paramIndex++;
    }

    values.push(id);

    const query = `
      UPDATE fabrication_machines
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    return this.mapToMachine(result.rows[0]);
  }

  async deleteMachine(id: string): Promise<void> {
    const query = `
      DELETE FROM fabrication_machines
      WHERE id = $1
    `;

    await db.query(query, [id]);
  }

  // ============================================
  // DIGITAL FABRICATION BATCHES
  // ============================================

  async findManyBatches(params: {
    page: number;
    limit: number;
    machineType?: FabricationMachineType;
    status?: FabricationJobStatus;
    machineId?: string;
    operatorId?: string;
  }): Promise<{ data: DigitalFabricationBatch[]; total: number }> {
    const { page, limit, machineType, status, machineId, operatorId } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (machineType) {
      conditions.push(`dfb.machine_type = $${paramIndex}`);
      values.push(machineType);
      paramIndex++;
    }

    if (status) {
      conditions.push(`dfb.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (machineId) {
      conditions.push(`dfb.machine_id = $${paramIndex}`);
      values.push(machineId);
      paramIndex++;
    }

    if (operatorId) {
      conditions.push(`dfb.operator_id = $${paramIndex}`);
      values.push(operatorId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const query = `
      SELECT
        dfb.*,
        fm.id as machine_id, fm.name as machine_name, fm.type as machine_type_name,
        u1.id as created_by_user_id, u1.name as created_by_user_name,
        u2.id as operator_user_id, u2.name as operator_user_name
      FROM digital_fabrication_batches dfb
      LEFT JOIN fabrication_machines fm ON fm.id = dfb.machine_id
      LEFT JOIN users u1 ON u1.id = dfb.created_by
      LEFT JOIN users u2 ON u2.id = dfb.operator_id
      ${whereClause}
      ORDER BY dfb.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, values);

    // Count total
    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM digital_fabrication_batches dfb
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, values.slice(0, -2));
    const total = countResult.rows[0]?.count || 0;

    return {
      data: result.rows.map(this.mapToBatch),
      total,
    };
  }

  async findBatchById(id: string): Promise<DigitalFabricationBatch | null> {
    const query = `
      SELECT
        dfb.*,
        fm.id as machine_id, fm.name as machine_name, fm.type as machine_type_name,
        u1.id as created_by_user_id, u1.name as created_by_user_name,
        u2.id as operator_user_id, u2.name as operator_user_name
      FROM digital_fabrication_batches dfb
      LEFT JOIN fabrication_machines fm ON fm.id = dfb.machine_id
      LEFT JOIN users u1 ON u1.id = dfb.created_by
      LEFT JOIN users u2 ON u2.id = dfb.operator_id
      WHERE dfb.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return null;

    return this.mapToBatch(result.rows[0]);
  }

  async createBatch(dto: CreateDigitalFabricationBatchDTO, createdBy: string): Promise<DigitalFabricationBatch> {
    const materialUnit: MaterialUnit = dto.machineType === 'PRINTER_3D' ? 'GRAMS' : 'CM_SQ';

    const query = `
      INSERT INTO digital_fabrication_batches (
        machine_type, machine_id, planned_date, operator_id,
        created_by, notes, status, material_unit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      dto.machineType,
      dto.machineId,
      dto.plannedDate,
      dto.operatorId,
      createdBy,
      dto.notes,
      'DRAFT',
      materialUnit,
    ]);

    const batchId = result.rows[0].id;

    // Registrar histórico
    await this.addHistory(batchId, null, 'CREATED', null, 'DRAFT', createdBy);

    return this.findBatchById(batchId) as Promise<DigitalFabricationBatch>;
  }

  async updateBatch(id: string, dto: UpdateDigitalFabricationBatchDTO, userId: string): Promise<DigitalFabricationBatch> {
    // Buscar estado anterior
    const previousBatchQuery = `
      SELECT status
      FROM digital_fabrication_batches
      WHERE id = $1
    `;
    const previousBatchResult = await db.query(previousBatchQuery, [id]);
    const previousBatch = previousBatchResult.rows[0];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.machineId !== undefined) {
      fields.push(`machine_id = $${paramIndex}`);
      values.push(dto.machineId);
      paramIndex++;
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(dto.status);
      paramIndex++;

      // Atualizar timestamps automaticamente
      if (dto.status === 'IN_PROGRESS' && previousBatch) {
        fields.push(`started_at = $${paramIndex}`);
        values.push(new Date().toISOString());
        paramIndex++;
      }
      if (dto.status === 'COMPLETED' || dto.status === 'FAILED' || dto.status === 'CANCELLED') {
        fields.push(`completed_at = $${paramIndex}`);
        values.push(new Date().toISOString());
        paramIndex++;
      }
    }
    if (dto.plannedDate !== undefined) {
      fields.push(`planned_date = $${paramIndex}`);
      values.push(dto.plannedDate);
      paramIndex++;
    }
    if (dto.operatorId !== undefined) {
      fields.push(`operator_id = $${paramIndex}`);
      values.push(dto.operatorId);
      paramIndex++;
    }
    if (dto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(dto.notes);
      paramIndex++;
    }

    values.push(id);

    const query = `
      UPDATE digital_fabrication_batches
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    await db.query(query, values);

    // Registrar histórico se status mudou
    if (dto.status && previousBatch?.status !== dto.status) {
      await this.addHistory(id, null, 'STATUS_CHANGED', previousBatch?.status, dto.status, userId);
    }

    return this.findBatchById(id) as Promise<DigitalFabricationBatch>;
  }

  async deleteBatch(id: string): Promise<void> {
    const query = `
      DELETE FROM digital_fabrication_batches
      WHERE id = $1
    `;

    await db.query(query, [id]);
  }

  // ============================================
  // FABRICATION ITEMS
  // ============================================

  async findItemsByBatchId(batchId: string): Promise<DigitalFabricationItem[]> {
    const query = `
      SELECT
        dfi.*,
        p1.id as product_id, p1.code as product_code, p1.name as product_name,
        p2.id as material_product_id, p2.code as material_product_code,
        p2.name as material_product_name, p2.current_stock as material_product_current_stock
      FROM digital_fabrication_items dfi
      LEFT JOIN products p1 ON p1.id = dfi.product_id
      LEFT JOIN products p2 ON p2.id = dfi.material_product_id
      WHERE dfi.batch_id = $1
      ORDER BY dfi.created_at ASC
    `;

    const result = await db.query(query, [batchId]);

    return result.rows.map(this.mapToItem);
  }

  async findItemById(id: string): Promise<DigitalFabricationItem | null> {
    const query = `
      SELECT
        dfi.*,
        p1.id as product_id, p1.code as product_code, p1.name as product_name,
        p2.id as material_product_id, p2.code as material_product_code,
        p2.name as material_product_name, p2.current_stock as material_product_current_stock
      FROM digital_fabrication_items dfi
      LEFT JOIN products p1 ON p1.id = dfi.product_id
      LEFT JOIN products p2 ON p2.id = dfi.material_product_id
      WHERE dfi.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return null;

    const item = this.mapToItem(result.rows[0]);

    // Buscar batch
    const batch = await this.findBatchById(result.rows[0].batch_id);
    if (batch) {
      item.batch = batch;
    }

    return item;
  }

  async createItem(dto: CreateDigitalFabricationItemDTO): Promise<DigitalFabricationItem> {
    let cutAreaPerUnit = undefined;
    if (dto.cutWidth && dto.cutHeight) {
      cutAreaPerUnit = (dto.cutWidth / 10) * (dto.cutHeight / 10);
    }

    const query = `
      INSERT INTO digital_fabrication_items (
        batch_id, product_id, item_name, file_name, quantity_planned,
        material_type, material_product_id, material_planned, material_unit,
        cut_width, cut_height, cut_area_per_unit, print_time_minutes,
        print_settings, laser_settings, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const result = await db.query(query, [
      dto.batchId,
      dto.productId,
      dto.itemName,
      dto.fileName,
      dto.quantityPlanned,
      dto.materialType,
      dto.materialProductId,
      dto.materialPlanned,
      dto.materialUnit,
      dto.cutWidth,
      dto.cutHeight,
      cutAreaPerUnit,
      dto.printTimeMinutes,
      dto.printSettings,
      dto.laserSettings,
      dto.notes,
    ]);

    return this.findItemById(result.rows[0].id) as Promise<DigitalFabricationItem>;
  }

  async updateItem(id: string, dto: UpdateDigitalFabricationItemDTO): Promise<DigitalFabricationItem> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.productId !== undefined) {
      fields.push(`product_id = $${paramIndex}`);
      values.push(dto.productId);
      paramIndex++;
    }
    if (dto.itemName !== undefined) {
      fields.push(`item_name = $${paramIndex}`);
      values.push(dto.itemName);
      paramIndex++;
    }
    if (dto.fileName !== undefined) {
      fields.push(`file_name = $${paramIndex}`);
      values.push(dto.fileName);
      paramIndex++;
    }
    if (dto.quantityPlanned !== undefined) {
      fields.push(`quantity_planned = $${paramIndex}`);
      values.push(dto.quantityPlanned);
      paramIndex++;
    }
    if (dto.quantityProduced !== undefined) {
      fields.push(`quantity_produced = $${paramIndex}`);
      values.push(dto.quantityProduced);
      paramIndex++;
    }
    if (dto.quantityFailed !== undefined) {
      fields.push(`quantity_failed = $${paramIndex}`);
      values.push(dto.quantityFailed);
      paramIndex++;
    }
    if (dto.materialType !== undefined) {
      fields.push(`material_type = $${paramIndex}`);
      values.push(dto.materialType);
      paramIndex++;
    }
    if (dto.materialProductId !== undefined) {
      fields.push(`material_product_id = $${paramIndex}`);
      values.push(dto.materialProductId);
      paramIndex++;
    }
    if (dto.materialPlanned !== undefined) {
      fields.push(`material_planned = $${paramIndex}`);
      values.push(dto.materialPlanned);
      paramIndex++;
    }
    if (dto.materialUsed !== undefined) {
      fields.push(`material_used = $${paramIndex}`);
      values.push(dto.materialUsed);
      paramIndex++;
    }
    if (dto.materialUnit !== undefined) {
      fields.push(`material_unit = $${paramIndex}`);
      values.push(dto.materialUnit);
      paramIndex++;
    }
    if (dto.cutWidth !== undefined) {
      fields.push(`cut_width = $${paramIndex}`);
      values.push(dto.cutWidth);
      paramIndex++;
    }
    if (dto.cutHeight !== undefined) {
      fields.push(`cut_height = $${paramIndex}`);
      values.push(dto.cutHeight);
      paramIndex++;
    }
    if (dto.printTimeMinutes !== undefined) {
      fields.push(`print_time_minutes = $${paramIndex}`);
      values.push(dto.printTimeMinutes);
      paramIndex++;
    }
    if (dto.actualPrintTimeMinutes !== undefined) {
      fields.push(`actual_print_time_minutes = $${paramIndex}`);
      values.push(dto.actualPrintTimeMinutes);
      paramIndex++;
    }
    if (dto.printSettings !== undefined) {
      fields.push(`print_settings = $${paramIndex}`);
      values.push(dto.printSettings);
      paramIndex++;
    }
    if (dto.laserSettings !== undefined) {
      fields.push(`laser_settings = $${paramIndex}`);
      values.push(dto.laserSettings);
      paramIndex++;
    }
    if (dto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(dto.notes);
      paramIndex++;
    }

    values.push(id);

    const query = `
      UPDATE digital_fabrication_items
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    await db.query(query, values);

    return this.findItemById(id) as Promise<DigitalFabricationItem>;
  }

  async deleteItem(id: string): Promise<void> {
    const query = `
      DELETE FROM digital_fabrication_items
      WHERE id = $1
    `;

    await db.query(query, [id]);
  }

  async completeItem(
    id: string,
    dto: CompleteFabricationItemDTO,
    userId: string
  ): Promise<DigitalFabricationItem> {
    const item = await this.findItemById(id);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    const query = `
      UPDATE digital_fabrication_items
      SET quantity_produced = $1, quantity_failed = $2,
          material_used = $3, actual_print_time_minutes = $4,
          notes = $5
      WHERE id = $6
      RETURNING *
    `;

    await db.query(query, [
      dto.quantityProduced,
      dto.quantityFailed,
      dto.materialUsed,
      dto.actualPrintTimeMinutes,
      dto.notes || item.notes,
      id,
    ]);

    // Se há produto associado e foi produzido, adicionar ao estoque
    if (item.productId && dto.quantityProduced > 0) {
      await this.addToStock(item.productId, dto.quantityProduced, userId, `Produção digital - ${item.itemName}`);
    }

    // Registrar histórico
    await this.addHistory(
      item.batchId,
      id,
      'ITEM_COMPLETED',
      null,
      `Produzido: ${dto.quantityProduced}, Falhas: ${dto.quantityFailed}`,
      userId
    );

    return this.findItemById(id) as Promise<DigitalFabricationItem>;
  }

  // ============================================
  // MATERIAL CONSUMPTION
  // ============================================

  async findConsumptionByBatchId(batchId: string): Promise<FabricationMaterialConsumption[]> {
    const query = `
      SELECT
        fmc.*,
        p.id as material_product_id, p.code as material_product_code, p.name as material_product_name,
        u.id as consumed_by_user_id, u.name as consumed_by_user_name
      FROM fabrication_material_consumption fmc
      LEFT JOIN products p ON p.id = fmc.material_product_id
      LEFT JOIN users u ON u.id = fmc.consumed_by
      WHERE fmc.batch_id = $1
      ORDER BY fmc.consumed_at DESC
    `;

    const result = await db.query(query, [batchId]);

    return result.rows.map(this.mapToConsumption);
  }

  async registerConsumption(
    dto: RegisterMaterialConsumptionDTO,
    userId: string
  ): Promise<FabricationMaterialConsumption> {
    // Buscar estoque atual do material
    const materialQuery = `
      SELECT current_stock, name
      FROM products
      WHERE id = $1
    `;
    const materialResult = await db.query(materialQuery, [dto.materialProductId]);

    if (materialResult.rows.length === 0) {
      throw new Error('Material não encontrado');
    }

    const material = materialResult.rows[0];
    const totalConsumed = dto.quantityConsumed + dto.quantityWasted;
    const currentStock = material.current_stock || 0;

    if (currentStock < totalConsumed) {
      throw new Error(`Estoque insuficiente. Disponível: ${currentStock}, Solicitado: ${totalConsumed}`);
    }

    // Baixar do estoque
    const newStock = Math.max(0, currentStock - totalConsumed);
    const updateStockQuery = `
      UPDATE products
      SET current_stock = $1
      WHERE id = $2
    `;
    await db.query(updateStockQuery, [newStock, dto.materialProductId]);

    // Registrar consumo
    const insertQuery = `
      INSERT INTO fabrication_material_consumption (
        batch_id, item_id, material_product_id, quantity_consumed,
        quantity_wasted, unit, consumed_by, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      dto.batchId,
      dto.itemId,
      dto.materialProductId,
      dto.quantityConsumed,
      dto.quantityWasted,
      dto.unit,
      userId,
      dto.notes,
    ]);

    // Registrar movimentação de estoque
    try {
      const movementQuery = `
        INSERT INTO inventory_movements (product_id, type, quantity, user_id, reason)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(movementQuery, [
        dto.materialProductId,
        'OUT',
        totalConsumed,
        userId,
        `Fabricação digital - Lote ${dto.batchId}`,
      ]);
    } catch (error) {
      // Ignora erro se tabela não existir
    }

    // Registrar histórico
    await this.addHistory(
      dto.batchId,
      dto.itemId || null,
      'MATERIAL_CONSUMED',
      null,
      `${dto.quantityConsumed} consumido, ${dto.quantityWasted} desperdiçado`,
      userId
    );

    const consumptionId = result.rows[0].id;
    const consumptions = await this.findConsumptionByBatchId(dto.batchId);
    return consumptions.find(c => c.id === consumptionId)!;
  }

  // ============================================
  // HISTORY
  // ============================================

  async findHistoryByBatchId(batchId: string): Promise<DigitalFabricationHistory[]> {
    const query = `
      SELECT
        dfh.*,
        u.id as performed_by_user_id, u.name as performed_by_user_name
      FROM digital_fabrication_history dfh
      LEFT JOIN users u ON u.id = dfh.performed_by
      WHERE dfh.batch_id = $1
      ORDER BY dfh.performed_at DESC
    `;

    const result = await db.query(query, [batchId]);

    return result.rows.map(this.mapToHistory);
  }

  private async addHistory(
    batchId: string,
    itemId: string | null,
    action: string,
    previousStatus: string | null,
    newStatus: string | null,
    performedBy: string,
    details?: any
  ): Promise<void> {
    const query = `
      INSERT INTO digital_fabrication_history (
        batch_id, item_id, action, previous_status, new_status, details, performed_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await db.query(query, [
      batchId,
      itemId,
      action,
      previousStatus,
      newStatus,
      details,
      performedBy,
    ]);
  }

  // ============================================
  // STOCK OPERATIONS
  // ============================================

  private async addToStock(productId: string, quantity: number, userId: string, reason: string): Promise<void> {
    try {
      // Buscar estoque atual
      const productQuery = `
        SELECT current_stock
        FROM products
        WHERE id = $1
      `;
      const productResult = await db.query(productQuery, [productId]);

      if (productResult.rows.length === 0) {
        console.error('Produto não encontrado');
        return;
      }

      const product = productResult.rows[0];
      const newStock = (product.current_stock || 0) + quantity;

      // Atualizar estoque
      const updateQuery = `
        UPDATE products
        SET current_stock = $1
        WHERE id = $2
      `;
      await db.query(updateQuery, [newStock, productId]);

      // Registrar movimentação
      const movementQuery = `
        INSERT INTO inventory_movements (product_id, type, quantity, user_id, reason)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(movementQuery, [productId, 'IN', quantity, userId, reason]);
    } catch (error) {
      console.error('Erro ao adicionar ao estoque:', error);
    }
  }

  // ============================================
  // DASHBOARD & STATS
  // ============================================

  async getDashboardStats(): Promise<FabricationDashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // Buscar todos os lotes
    const query = `
      SELECT id, machine_type, status, completed_at, total_items_produced,
             total_items_failed, total_material_used, total_material_wasted
      FROM digital_fabrication_batches
    `;

    const result = await db.query(query);
    const allBatches = result.rows;

    // Filtrar por tipo
    const printer3dBatches = allBatches.filter(b => b.machine_type === 'PRINTER_3D');
    const laserBatches = allBatches.filter(b => b.machine_type === 'LASER_CUTTER');

    // Calcular stats para impressora 3D
    const printer3dActive = printer3dBatches.filter(b => b.status === 'IN_PROGRESS').length;
    const printer3dCompletedToday = printer3dBatches.filter(b =>
      b.status === 'COMPLETED' && b.completed_at && new Date(b.completed_at) >= today
    ).length;
    const printer3dQueued = printer3dBatches.filter(b => b.status === 'QUEUED').length;

    const printer3dTodayBatches = printer3dBatches.filter(b =>
      b.completed_at && new Date(b.completed_at) >= today
    );
    const printer3dFilamentUsed = printer3dTodayBatches.reduce((sum, b) => sum + (b.total_material_used || 0), 0);
    const printer3dFilamentWasted = printer3dTodayBatches.reduce((sum, b) => sum + (b.total_material_wasted || 0), 0);

    // Calcular stats para laser
    const laserActive = laserBatches.filter(b => b.status === 'IN_PROGRESS').length;
    const laserCompletedToday = laserBatches.filter(b =>
      b.status === 'COMPLETED' && b.completed_at && new Date(b.completed_at) >= today
    ).length;
    const laserQueued = laserBatches.filter(b => b.status === 'QUEUED').length;

    const laserTodayBatches = laserBatches.filter(b =>
      b.completed_at && new Date(b.completed_at) >= today
    );
    const laserMaterialUsed = laserTodayBatches.reduce((sum, b) => sum + (b.total_material_used || 0), 0);
    const laserMaterialWasted = laserTodayBatches.reduce((sum, b) => sum + (b.total_material_wasted || 0), 0);

    // Stats gerais
    const pendingBatches = allBatches.filter(b => b.status === 'QUEUED' || b.status === 'DRAFT').length;
    const inProgressBatches = allBatches.filter(b => b.status === 'IN_PROGRESS').length;
    const completedThisWeek = allBatches.filter(b =>
      b.status === 'COMPLETED' && b.completed_at && new Date(b.completed_at) >= weekStart
    ).length;

    // Taxa de falha
    const totalProduced = allBatches.reduce((sum, b) => sum + (b.total_items_produced || 0), 0);
    const totalFailed = allBatches.reduce((sum, b) => sum + (b.total_items_failed || 0), 0);
    const failureRate = totalProduced + totalFailed > 0
      ? Math.round((totalFailed / (totalProduced + totalFailed)) * 100)
      : 0;

    return {
      printer3d: {
        activeBatches: printer3dActive,
        completedToday: printer3dCompletedToday,
        itemsInQueue: printer3dQueued,
        totalFilamentUsedToday: printer3dFilamentUsed,
        totalFilamentWastedToday: printer3dFilamentWasted,
      },
      laserCutter: {
        activeBatches: laserActive,
        completedToday: laserCompletedToday,
        itemsInQueue: laserQueued,
        totalMaterialUsedToday: laserMaterialUsed,
        totalMaterialWastedToday: laserMaterialWasted,
      },
      pendingBatches,
      inProgressBatches,
      completedThisWeek,
      failureRate,
    };
  }

  async getBatchSummaries(machineType?: FabricationMachineType): Promise<FabricationBatchSummary[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (machineType) {
      conditions.push(`dfb.machine_type = $${paramIndex}`);
      values.push(machineType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        dfb.*,
        fm.name as machine_name,
        u.name as operator_name
      FROM digital_fabrication_batches dfb
      LEFT JOIN fabrication_machines fm ON fm.id = dfb.machine_id
      LEFT JOIN users u ON u.id = dfb.operator_id
      ${whereClause}
      ORDER BY dfb.created_at DESC
      LIMIT 50
    `;

    const result = await db.query(query, values);
    const batches = result.rows;

    // Contar itens de cada lote
    const batchIds = batches.map(b => b.id);
    if (batchIds.length === 0) return [];

    const itemCountQuery = `
      SELECT batch_id, COUNT(*)::int as count
      FROM digital_fabrication_items
      WHERE batch_id = ANY($1::text[])
      GROUP BY batch_id
    `;
    const itemCountResult = await db.query(itemCountQuery, [batchIds]);

    const countMap = new Map<string, number>();
    for (const row of itemCountResult.rows) {
      countMap.set(row.batch_id, row.count);
    }

    return batches.map(batch => {
      const totalPlanned = batch.total_items_planned || 0;
      const totalProduced = batch.total_items_produced || 0;

      return {
        id: batch.id,
        batchNumber: batch.batch_number,
        machineType: batch.machine_type,
        machineName: batch.machine_name,
        status: batch.status,
        itemsCount: countMap.get(batch.id) || 0,
        totalItemsPlanned: totalPlanned,
        totalItemsProduced: totalProduced,
        totalItemsFailed: batch.total_items_failed || 0,
        progressPercent: totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0,
        totalMaterialPlanned: batch.total_material_planned || 0,
        totalMaterialUsed: batch.total_material_used || 0,
        totalMaterialWasted: batch.total_material_wasted || 0,
        materialUnit: batch.material_unit,
        operatorName: batch.operator_name,
        plannedDate: batch.planned_date,
        startedAt: batch.started_at,
        createdAt: batch.created_at,
      };
    });
  }

  // ============================================
  // MAPPERS
  // ============================================

  private mapToMachine(data: any): FabricationMachine {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      model: data.model,
      brand: data.brand,
      buildVolumeX: data.build_volume_x,
      buildVolumeY: data.build_volume_y,
      buildVolumeZ: data.build_volume_z,
      isActive: data.is_active,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToBatch(data: any): DigitalFabricationBatch {
    return {
      id: data.id,
      batchNumber: data.batch_number,
      machineType: data.machine_type,
      machineId: data.machine_id,
      machine: data.machine_name ? {
        id: data.machine_id,
        name: data.machine_name,
        type: data.machine_type_name,
      } as any : undefined,
      status: data.status,
      plannedDate: data.planned_date,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      createdBy: data.created_by,
      createdByUser: data.created_by_user_name ? {
        id: data.created_by_user_id,
        name: data.created_by_user_name,
      } : undefined,
      operatorId: data.operator_id,
      operator: data.operator_user_name ? {
        id: data.operator_user_id,
        name: data.operator_user_name,
      } : undefined,
      totalMaterialPlanned: data.total_material_planned || 0,
      totalMaterialUsed: data.total_material_used || 0,
      totalMaterialWasted: data.total_material_wasted || 0,
      materialUnit: data.material_unit,
      totalItemsPlanned: data.total_items_planned || 0,
      totalItemsProduced: data.total_items_produced || 0,
      totalItemsFailed: data.total_items_failed || 0,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToItem(data: any): DigitalFabricationItem {
    return {
      id: data.id,
      batchId: data.batch_id,
      batch: undefined,
      productId: data.product_id,
      product: data.product_name ? {
        id: data.product_id,
        code: data.product_code,
        name: data.product_name,
      } : undefined,
      itemName: data.item_name,
      fileName: data.file_name,
      quantityPlanned: data.quantity_planned,
      quantityProduced: data.quantity_produced || 0,
      quantityFailed: data.quantity_failed || 0,
      materialType: data.material_type,
      materialProductId: data.material_product_id,
      materialProduct: data.material_product_name ? {
        id: data.material_product_id,
        code: data.material_product_code,
        name: data.material_product_name,
        currentStock: data.material_product_current_stock,
      } : undefined,
      materialPlanned: data.material_planned || 0,
      materialUsed: data.material_used || 0,
      materialUnit: data.material_unit,
      cutWidth: data.cut_width,
      cutHeight: data.cut_height,
      cutAreaPerUnit: data.cut_area_per_unit,
      printTimeMinutes: data.print_time_minutes,
      actualPrintTimeMinutes: data.actual_print_time_minutes,
      printSettings: data.print_settings,
      laserSettings: data.laser_settings,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToConsumption(data: any): FabricationMaterialConsumption {
    return {
      id: data.id,
      batchId: data.batch_id,
      itemId: data.item_id,
      materialProductId: data.material_product_id,
      materialProduct: data.material_product_name ? {
        id: data.material_product_id,
        code: data.material_product_code,
        name: data.material_product_name,
      } : undefined,
      quantityConsumed: data.quantity_consumed,
      quantityWasted: data.quantity_wasted,
      unit: data.unit,
      consumedBy: data.consumed_by,
      consumedByUser: data.consumed_by_user_name ? {
        id: data.consumed_by_user_id,
        name: data.consumed_by_user_name,
      } : undefined,
      consumedAt: data.consumed_at,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  private mapToHistory(data: any): DigitalFabricationHistory {
    return {
      id: data.id,
      batchId: data.batch_id,
      itemId: data.item_id,
      action: data.action,
      previousStatus: data.previous_status,
      newStatus: data.new_status,
      details: data.details,
      performedBy: data.performed_by,
      performedByUser: data.performed_by_user_name ? {
        id: data.performed_by_user_id,
        name: data.performed_by_user_name,
      } : undefined,
      performedAt: data.performed_at,
      createdAt: data.created_at,
    };
  }
}
