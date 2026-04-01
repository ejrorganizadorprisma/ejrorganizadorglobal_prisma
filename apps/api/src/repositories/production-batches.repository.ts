import { db } from '../config/database';
import type {
  ProductionBatch,
  ProductionBatchStatus,
  ProductionUnit,
  ProductionUnitStatus,
  UnitComponent,
  UnitComponentStatus,
  UnitTest,
  TestType,
  TestResult,
  ProductionHistory,
  ComponentRelease,
  CreateProductionBatchDTO,
  UpdateProductionBatchDTO,
  UpdateProductionUnitDTO,
  UpdateUnitComponentDTO,
  CreateUnitTestDTO,
  BatchSummary,
  UnitSummary,
  MyProductionUnit,
  MyProductionSummary,
} from '@ejr/shared-types';

export class ProductionBatchesRepository {
  // ============================================
  // PRODUCTION BATCHES
  // ============================================

  async findMany(params: {
    page: number;
    limit: number;
    status?: ProductionBatchStatus;
    productId?: string;
    assignedTo?: string;
  }) {
    const { page, limit, status, productId, assignedTo } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (status) {
      conditions.push(`pb.status = $${paramCounter++}`);
      values.push(status);
    }

    if (productId) {
      conditions.push(`pb.product_id = $${paramCounter++}`);
      values.push(productId);
    }

    if (assignedTo) {
      conditions.push(`pb.assigned_to = $${paramCounter++}`);
      values.push(assignedTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM production_batches pb ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const dataQuery = `
      SELECT
        pb.*,
        p.id as product_id_alias,
        p.code as product_code,
        p.name as product_name,
        p.is_assembly as product_is_assembly,
        au.id as assigned_user_id,
        au.name as assigned_user_name,
        cu.id as created_by_user_id,
        cu.name as created_by_user_name
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      LEFT JOIN users au ON pb.assigned_to = au.id
      LEFT JOIN users cu ON pb.created_by = cu.id
      ${whereClause}
      ORDER BY pb.created_at DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    const result = await db.query(dataQuery, values);

    return {
      data: result.rows.map((batch) => this.mapToBatch(batch)),
      total,
    };
  }

  async findById(id: string): Promise<ProductionBatch | null> {
    const query = `
      SELECT
        pb.*,
        p.id as product_id_alias,
        p.code as product_code,
        p.name as product_name,
        p.is_assembly as product_is_assembly,
        au.id as assigned_user_id,
        au.name as assigned_user_name,
        cu.id as created_by_user_id,
        cu.name as created_by_user_name
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      LEFT JOIN users au ON pb.assigned_to = au.id
      LEFT JOIN users cu ON pb.created_by = cu.id
      WHERE pb.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToBatch(result.rows[0]);
  }

  async create(dto: CreateProductionBatchDTO, createdBy: string): Promise<ProductionBatch> {
    // Gerar número do lote
    const batchNumberResult = await db.query('SELECT generate_batch_number() as batch_number');
    const batchNumber = batchNumberResult.rows[0].batch_number;

    const insertQuery = `
      INSERT INTO production_batches (
        batch_number, product_id, production_order_id, quantity_planned,
        planned_start_date, planned_end_date, assigned_to, created_by,
        notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      batchNumber,
      dto.productId,
      dto.productionOrderId || null,
      dto.quantityPlanned,
      dto.plannedStartDate || null,
      dto.plannedEndDate || null,
      dto.assignedTo || null,
      createdBy,
      dto.notes || null,
      'DRAFT',
    ];

    const result = await db.query(insertQuery, values);
    const batchId = result.rows[0].id;

    // Registrar histórico
    await this.addHistory('BATCH', batchId, 'CREATED', null, 'DRAFT', createdBy);

    // Fetch with complete details
    const batch = await this.findById(batchId);
    if (!batch) {
      throw new Error('Erro ao buscar lote criado');
    }

    return batch;
  }

  async update(id: string, dto: UpdateProductionBatchDTO, userId: string): Promise<ProductionBatch> {
    // Buscar estado anterior para histórico
    const prevQuery = 'SELECT status FROM production_batches WHERE id = $1';
    const prevResult = await db.query(prevQuery, [id]);
    const previousBatch = prevResult.rows[0] || null;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (dto.quantityPlanned !== undefined) {
      updateFields.push(`quantity_planned = $${paramCounter++}`);
      values.push(dto.quantityPlanned);
    }
    if (dto.status !== undefined) {
      updateFields.push(`status = $${paramCounter++}`);
      values.push(dto.status);
    }
    if (dto.plannedStartDate !== undefined) {
      updateFields.push(`planned_start_date = $${paramCounter++}`);
      values.push(dto.plannedStartDate);
    }
    if (dto.plannedEndDate !== undefined) {
      updateFields.push(`planned_end_date = $${paramCounter++}`);
      values.push(dto.plannedEndDate);
    }
    if (dto.actualStartDate !== undefined) {
      updateFields.push(`actual_start_date = $${paramCounter++}`);
      values.push(dto.actualStartDate);
    }
    if (dto.actualEndDate !== undefined) {
      updateFields.push(`actual_end_date = $${paramCounter++}`);
      values.push(dto.actualEndDate);
    }
    if (dto.assignedTo !== undefined) {
      updateFields.push(`assigned_to = $${paramCounter++}`);
      values.push(dto.assignedTo);
    }
    if (dto.notes !== undefined) {
      updateFields.push(`notes = $${paramCounter++}`);
      values.push(dto.notes);
    }

    if (updateFields.length === 0) {
      // No updates, just return current state
      const batch = await this.findById(id);
      if (!batch) {
        throw new Error('Lote não encontrado');
      }
      return batch;
    }

    values.push(id);
    const updateQuery = `
      UPDATE production_batches
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error('Lote não encontrado');
    }

    // Registrar histórico se o status mudou
    if (dto.status && previousBatch?.status !== dto.status) {
      await this.addHistory('BATCH', id, 'STATUS_CHANGED', previousBatch?.status, dto.status, userId);
    }

    // Fetch with complete details
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Erro ao buscar lote atualizado');
    }

    return batch;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const query = 'DELETE FROM production_batches WHERE id = $1';
    await db.query(query, [id]);
    return { success: true };
  }

  // Libera o lote evitando conflito com trigger usando RPC
  async releaseBypassTrigger(id: string, userId: string): Promise<ProductionBatch> {
    // Tentar usar RPC function que desabilita triggers
    try {
      const rpcQuery = 'SELECT release_batch_bypass_trigger($1, $2) as result';
      const rpcResult = await db.query(rpcQuery, [id, userId]);

      if (rpcResult.rows[0]?.result) {
        // RPC funcionou, buscar dados completos
        const batch = await this.findById(id);
        if (batch) {
          return batch;
        }
      }
    } catch (rpcError: any) {
      // RPC falhou ou não existe, usar fallback
      console.log('RPC falhou ou não existe, usando fallback:', rpcError?.message);
    }

    // Fallback: se RPC não existir ou falhar, tentar método alternativo
    const prevQuery = 'SELECT status FROM production_batches WHERE id = $1';
    const prevResult = await db.query(prevQuery, [id]);
    const previousBatch = prevResult.rows[0] || null;

    // Usar abordagem de dois updates separados
    // Update 1: Definir actual_start_date ANTES de mudar status
    await db.query(
      'UPDATE production_batches SET actual_start_date = $1 WHERE id = $2',
      [new Date().toISOString(), id]
    );

    // Update 2: Mudar status
    const updateResult = await db.query(
      'UPDATE production_batches SET status = $1 WHERE id = $2 RETURNING *',
      ['RELEASED', id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Lote não encontrado');
    }

    // Registrar histórico
    if (previousBatch?.status !== 'RELEASED') {
      await this.addHistory('BATCH', id, 'STATUS_CHANGED', previousBatch?.status, 'RELEASED', userId);
    }

    // Fetch with complete details
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Erro ao buscar lote atualizado');
    }

    return batch;
  }

  // ============================================
  // PRODUCTION UNITS
  // ============================================

  async findUnitsByBatchId(batchId: string): Promise<ProductionUnit[]> {
    const query = `
      SELECT
        pu.*,
        au.id as assigned_user_id,
        au.name as assigned_user_name,
        tu.id as tested_by_user_id,
        tu.name as tested_by_user_name,
        ftu.id as final_tested_by_user_id,
        ftu.name as final_tested_by_user_name
      FROM production_units pu
      LEFT JOIN users au ON pu.assigned_to = au.id
      LEFT JOIN users tu ON pu.tested_by = tu.id
      LEFT JOIN users ftu ON pu.final_tested_by = ftu.id
      WHERE pu.batch_id = $1
      ORDER BY pu.unit_number ASC
    `;

    const result = await db.query(query, [batchId]);
    return result.rows.map((unit) => this.mapToUnit(unit));
  }

  async findUnitById(id: string): Promise<ProductionUnit | null> {
    const query = `
      SELECT
        pu.*,
        pb.id as batch_id_alias,
        pb.batch_number as batch_batch_number,
        pb.product_id as batch_product_id,
        pb.production_order_id as batch_production_order_id,
        pb.quantity_planned as batch_quantity_planned,
        pb.quantity_produced as batch_quantity_produced,
        pb.quantity_scrapped as batch_quantity_scrapped,
        pb.quantity_in_progress as batch_quantity_in_progress,
        pb.status as batch_status,
        pb.planned_start_date as batch_planned_start_date,
        pb.planned_end_date as batch_planned_end_date,
        pb.actual_start_date as batch_actual_start_date,
        pb.actual_end_date as batch_actual_end_date,
        pb.assigned_to as batch_assigned_to,
        pb.created_by as batch_created_by,
        pb.notes as batch_notes,
        pb.created_at as batch_created_at,
        pb.updated_at as batch_updated_at,
        p.id as product_id_alias,
        p.code as product_code,
        p.name as product_name,
        p.is_assembly as product_is_assembly,
        au.id as assigned_user_id,
        au.name as assigned_user_name,
        tu.id as tested_by_user_id,
        tu.name as tested_by_user_name,
        ftu.id as final_tested_by_user_id,
        ftu.name as final_tested_by_user_name
      FROM production_units pu
      LEFT JOIN production_batches pb ON pu.batch_id = pb.id
      LEFT JOIN products p ON pb.product_id = p.id
      LEFT JOIN users au ON pu.assigned_to = au.id
      LEFT JOIN users tu ON pu.tested_by = tu.id
      LEFT JOIN users ftu ON pu.final_tested_by = ftu.id
      WHERE pu.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToUnit(result.rows[0]);
  }

  async updateUnit(id: string, dto: UpdateProductionUnitDTO, userId: string): Promise<ProductionUnit> {
    // Buscar estado anterior
    const prevQuery = 'SELECT status, batch_id FROM production_units WHERE id = $1';
    const prevResult = await db.query(prevQuery, [id]);
    const previousUnit = prevResult.rows[0] || null;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (dto.status !== undefined) {
      updateFields.push(`status = $${paramCounter++}`);
      values.push(dto.status);

      // Atualizar timestamps automaticamente
      if (dto.status === 'IN_PRODUCTION' && !previousUnit) {
        updateFields.push(`started_at = $${paramCounter++}`);
        values.push(new Date().toISOString());
      }
      if (dto.status === 'COMPLETED' || dto.status === 'SCRAPPED') {
        updateFields.push(`completed_at = $${paramCounter++}`);
        values.push(new Date().toISOString());
      }
    }
    if (dto.assignedTo !== undefined) {
      updateFields.push(`assigned_to = $${paramCounter++}`);
      values.push(dto.assignedTo);
    }
    if (dto.serialNumber !== undefined) {
      updateFields.push(`serial_number = $${paramCounter++}`);
      values.push(dto.serialNumber);
    }
    if (dto.notes !== undefined) {
      updateFields.push(`notes = $${paramCounter++}`);
      values.push(dto.notes);
    }

    if (updateFields.length === 0) {
      const unit = await this.findUnitById(id);
      if (!unit) {
        throw new Error('Unidade não encontrada');
      }
      return unit;
    }

    values.push(id);
    const updateQuery = `
      UPDATE production_units
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error('Unidade não encontrada');
    }

    // Registrar histórico
    if (dto.status && previousUnit?.status !== dto.status) {
      await this.addHistory('UNIT', id, 'STATUS_CHANGED', previousUnit?.status, dto.status, userId);
    }

    const unit = await this.findUnitById(id);
    if (!unit) {
      throw new Error('Erro ao buscar unidade atualizada');
    }

    return unit;
  }

  async assignUnit(unitId: string, userId: string, assignedBy: string): Promise<ProductionUnit> {
    // Buscar unidade atual para verificar responsável anterior
    const query = `
      SELECT
        pu.*,
        au.id as assigned_user_id,
        au.name as assigned_user_name
      FROM production_units pu
      LEFT JOIN users au ON pu.assigned_to = au.id
      WHERE pu.id = $1
    `;

    const result = await db.query(query, [unitId]);

    if (result.rows.length === 0) {
      throw new Error('Unidade não encontrada');
    }

    const currentUnit = result.rows[0];
    const previousAssignedTo = currentUnit.assigned_to;
    const previousAssignedUserName = currentUnit.assigned_user_name;

    // Se já tem responsável e é o mesmo usuário, não faz nada
    if (previousAssignedTo === userId) {
      return this.mapToUnit(currentUnit);
    }

    // Preparar dados para atualização
    const updateFields: string[] = ['assigned_to = $1'];
    const values: any[] = [userId];
    let paramCounter = 2;

    // Só muda o status e started_at se estiver PENDING (primeira atribuição)
    if (currentUnit.status === 'PENDING') {
      updateFields.push(`status = $${paramCounter++}`);
      values.push('IN_PRODUCTION');
      updateFields.push(`started_at = $${paramCounter++}`);
      values.push(new Date().toISOString());
    }

    values.push(unitId);
    const updateQuery = `
      UPDATE production_units
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, values);

    if (updateResult.rows.length === 0) {
      throw new Error('Erro ao atribuir unidade');
    }

    // Buscar nome do novo usuário
    const userQuery = 'SELECT name FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    const newUserName = userResult.rows[0]?.name || userId;

    // Registrar histórico com responsável anterior (se houver)
    if (previousAssignedTo) {
      // Mudança de responsável - registrar quem era o anterior
      await this.addHistory(
        'UNIT',
        unitId,
        'REASSIGNED',
        previousAssignedUserName || previousAssignedTo,
        newUserName,
        assignedBy,
        `Responsável alterado de ${previousAssignedUserName || 'N/A'} para ${newUserName || 'N/A'}`
      );
    } else {
      // Primeira atribuição
      await this.addHistory('UNIT', unitId, 'ASSIGNED', null, newUserName, assignedBy);
    }

    const unit = await this.findUnitById(unitId);
    if (!unit) {
      throw new Error('Erro ao buscar unidade atualizada');
    }

    return unit;
  }

  // ============================================
  // UNIT COMPONENTS
  // ============================================

  async findComponentsByUnitId(unitId: string): Promise<UnitComponent[]> {
    const query = `
      SELECT
        uc.*,
        p.id as part_id_alias,
        p.code as part_code,
        p.name as part_name,
        p.current_stock as part_current_stock,
        pp.id as product_part_id_alias,
        pp.part_id as product_part_part_id,
        pp.quantity as product_part_quantity,
        mu.id as mounted_by_user_id,
        mu.name as mounted_by_user_name,
        ru.id as released_by_user_id,
        ru.name as released_by_user_name
      FROM unit_components uc
      LEFT JOIN products p ON uc.part_id = p.id
      LEFT JOIN product_parts pp ON uc.product_part_id = pp.id
      LEFT JOIN users mu ON uc.mounted_by = mu.id
      LEFT JOIN users ru ON uc.released_by = ru.id
      WHERE uc.unit_id = $1
      ORDER BY uc.id ASC
    `;

    const result = await db.query(query, [unitId]);
    return result.rows.map((comp) => this.mapToComponent(comp));
  }

  async updateComponent(id: string, dto: UpdateUnitComponentDTO, userId: string): Promise<UnitComponent> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (dto.status !== undefined) {
      updateFields.push(`status = $${paramCounter++}`);
      values.push(dto.status);

      if (dto.status === 'MOUNTED') {
        updateFields.push(`mounted_at = $${paramCounter++}`);
        values.push(new Date().toISOString());
        updateFields.push(`mounted_by = $${paramCounter++}`);
        values.push(userId);
      }
    }
    if (dto.quantityUsed !== undefined) {
      updateFields.push(`quantity_used = $${paramCounter++}`);
      values.push(dto.quantityUsed);
    }
    if (dto.notes !== undefined) {
      updateFields.push(`notes = $${paramCounter++}`);
      values.push(dto.notes);
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    values.push(id);
    const updateQuery = `
      UPDATE unit_components
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error('Componente não encontrado');
    }

    // Registrar histórico
    await this.addHistory('COMPONENT', id, 'STATUS_CHANGED', null, dto.status || '', userId);

    // Buscar com detalhes completos
    const unitId = result.rows[0].unit_id;
    const components = await this.findComponentsByUnitId(unitId);
    const component = components.find(c => c.id === id);

    if (!component) {
      throw new Error('Erro ao buscar componente atualizado');
    }

    return component;
  }

  async mountAllComponents(unitId: string, userId: string): Promise<void> {
    // Buscar componentes pendentes
    const selectQuery = `
      SELECT id, quantity_required
      FROM unit_components
      WHERE unit_id = $1 AND status = 'PENDING'
    `;

    const result = await db.query(selectQuery, [unitId]);
    const components = result.rows;

    if (components.length === 0) {
      return;
    }

    // Atualizar todos os componentes pendentes
    const mountedAt = new Date().toISOString();

    for (const comp of components) {
      await db.query(
        `UPDATE unit_components
         SET status = 'MOUNTED',
             mounted_at = $1,
             mounted_by = $2,
             quantity_used = $3
         WHERE id = $4`,
        [mountedAt, userId, comp.quantity_required, comp.id]
      );
    }

    await this.addHistory('UNIT', unitId, 'ALL_COMPONENTS_MOUNTED', null, null, userId);
  }

  // ============================================
  // UNIT TESTS
  // ============================================

  async findTestsByUnitId(unitId: string): Promise<UnitTest[]> {
    const query = `
      SELECT
        ut.*,
        u.id as tested_by_user_id,
        u.name as tested_by_user_name
      FROM unit_tests ut
      LEFT JOIN users u ON ut.tested_by = u.id
      WHERE ut.unit_id = $1
      ORDER BY ut.tested_at DESC
    `;

    const result = await db.query(query, [unitId]);
    return result.rows.map((test) => this.mapToTest(test));
  }

  async createTest(dto: CreateUnitTestDTO, testedBy: string): Promise<UnitTest> {
    const insertQuery = `
      INSERT INTO unit_tests (
        unit_id, test_type, result, tested_by, observations, defects_found
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      dto.unitId,
      dto.testType,
      dto.result,
      testedBy,
      dto.observations || null,
      dto.defectsFound || null,
    ]);

    const testId = result.rows[0].id;

    // Atualizar status da unidade baseado no teste
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (dto.testType === 'ASSEMBLY') {
      updateFields.push(`tested_at = $${paramCounter++}`);
      values.push(new Date().toISOString());
      updateFields.push(`tested_by = $${paramCounter++}`);
      values.push(testedBy);

      if (dto.result === 'PASSED' || dto.result === 'CONDITIONAL') {
        updateFields.push(`status = $${paramCounter++}`);
        values.push('TEST_PASSED');
      } else if (dto.result === 'FAILED') {
        updateFields.push(`status = $${paramCounter++}`);
        values.push('TEST_FAILED');
      }
    } else if (dto.testType === 'FINAL') {
      updateFields.push(`final_tested_at = $${paramCounter++}`);
      values.push(new Date().toISOString());
      updateFields.push(`final_tested_by = $${paramCounter++}`);
      values.push(testedBy);

      if (dto.result === 'PASSED' || dto.result === 'CONDITIONAL') {
        updateFields.push(`status = $${paramCounter++}`);
        values.push('COMPLETED');
      } else if (dto.result === 'FAILED') {
        updateFields.push(`status = $${paramCounter++}`);
        values.push('REWORK');
      }
    }

    if (updateFields.length > 0) {
      values.push(dto.unitId);
      const updateQuery = `
        UPDATE production_units
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
      `;
      await db.query(updateQuery, values);
    }

    // Registrar histórico
    await this.addHistory('UNIT', dto.unitId, `TEST_${dto.testType}`, null, dto.result, testedBy);

    // Buscar teste com detalhes
    const tests = await this.findTestsByUnitId(dto.unitId);
    const test = tests.find(t => t.id === testId);

    if (!test) {
      throw new Error('Erro ao buscar teste criado');
    }

    return test;
  }

  // ============================================
  // PRODUCTION HISTORY
  // ============================================

  async getHistory(entityType: string, entityId: string): Promise<ProductionHistory[]> {
    const query = `
      SELECT
        ph.*,
        u.id as performed_by_user_id,
        u.name as performed_by_user_name
      FROM production_history ph
      LEFT JOIN users u ON ph.performed_by = u.id
      WHERE ph.entity_type = $1 AND ph.entity_id = $2
      ORDER BY ph.performed_at DESC
    `;

    const result = await db.query(query, [entityType, entityId]);
    return result.rows.map((h) => this.mapToHistory(h));
  }

  private async addHistory(
    entityType: string,
    entityId: string,
    action: string,
    previousValue: string | null,
    newValue: string | null,
    performedBy: string,
    notes?: string
  ): Promise<void> {
    const query = `
      INSERT INTO production_history (
        entity_type, entity_id, action, previous_value, new_value, performed_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await db.query(query, [
      entityType,
      entityId,
      action,
      previousValue,
      newValue,
      performedBy,
      notes || null,
    ]);
  }

  // ============================================
  // MY PRODUCTION (Minha Produção)
  // ============================================

  async findMyUnits(userId: string): Promise<MyProductionUnit[]> {
    // Buscar unidades do usuário
    const unitsQuery = `
      SELECT
        pu.*,
        pb.id as batch_id_alias,
        pb.batch_number as batch_batch_number,
        pb.product_id as batch_product_id,
        pb.production_order_id as batch_production_order_id,
        pb.quantity_planned as batch_quantity_planned,
        pb.quantity_produced as batch_quantity_produced,
        pb.quantity_scrapped as batch_quantity_scrapped,
        pb.quantity_in_progress as batch_quantity_in_progress,
        pb.status as batch_status,
        pb.planned_start_date as batch_planned_start_date,
        pb.planned_end_date as batch_planned_end_date,
        pb.actual_start_date as batch_actual_start_date,
        pb.actual_end_date as batch_actual_end_date,
        pb.assigned_to as batch_assigned_to,
        pb.created_by as batch_created_by,
        pb.notes as batch_notes,
        pb.created_at as batch_created_at,
        pb.updated_at as batch_updated_at,
        p.id as product_id_alias,
        p.code as product_code,
        p.name as product_name,
        p.is_assembly as product_is_assembly,
        au.id as assigned_user_id,
        au.name as assigned_user_name
      FROM production_units pu
      LEFT JOIN production_batches pb ON pu.batch_id = pb.id
      LEFT JOIN products p ON pb.product_id = p.id
      LEFT JOIN users au ON pu.assigned_to = au.id
      WHERE pu.assigned_to = $1
        AND pu.status IN ('IN_PRODUCTION', 'AWAITING_TEST', 'REWORK', 'TEST_FAILED')
      ORDER BY pu.started_at DESC
    `;

    const unitsResult = await db.query(unitsQuery, [userId]);

    if (unitsResult.rows.length === 0) {
      return [];
    }

    // Extrair todos os IDs das unidades para batch fetch
    const unitIds = unitsResult.rows.map((unit) => unit.id);

    // Buscar TODOS os componentes de uma vez (evita N+1 queries)
    const componentsQuery = `
      SELECT
        uc.*,
        p.id as part_id_alias,
        p.code as part_code,
        p.name as part_name,
        p.current_stock as part_current_stock,
        pp.id as product_part_id_alias,
        pp.part_id as product_part_part_id,
        pp.quantity as product_part_quantity,
        mu.id as mounted_by_user_id,
        mu.name as mounted_by_user_name,
        ru.id as released_by_user_id,
        ru.name as released_by_user_name
      FROM unit_components uc
      LEFT JOIN products p ON uc.part_id = p.id
      LEFT JOIN product_parts pp ON uc.product_part_id = pp.id
      LEFT JOIN users mu ON uc.mounted_by = mu.id
      LEFT JOIN users ru ON uc.released_by = ru.id
      WHERE uc.unit_id = ANY($1)
      ORDER BY uc.id ASC
    `;

    const componentsResult = await db.query(componentsQuery, [unitIds]);

    // Buscar TODOS os testes de uma vez (evita N+1 queries)
    const testsQuery = `
      SELECT
        ut.*,
        u.id as tested_by_user_id,
        u.name as tested_by_user_name
      FROM unit_tests ut
      LEFT JOIN users u ON ut.tested_by = u.id
      WHERE ut.unit_id = ANY($1)
      ORDER BY ut.tested_at DESC
    `;

    const testsResult = await db.query(testsQuery, [unitIds]);

    // Agrupar componentes por unit_id
    const componentsByUnit = new Map<string, any[]>();
    for (const comp of componentsResult.rows) {
      const unitComps = componentsByUnit.get(comp.unit_id) || [];
      unitComps.push(comp);
      componentsByUnit.set(comp.unit_id, unitComps);
    }

    // Agrupar testes por unit_id
    const testsByUnit = new Map<string, any[]>();
    for (const test of testsResult.rows) {
      const unitTests = testsByUnit.get(test.unit_id) || [];
      unitTests.push(test);
      testsByUnit.set(test.unit_id, unitTests);
    }

    // Montar resultado final com dados já buscados
    const unitsWithDetails: MyProductionUnit[] = unitsResult.rows.map((unit) => {
      const components = (componentsByUnit.get(unit.id) || []).map((comp) => this.mapToComponent(comp));
      const tests = (testsByUnit.get(unit.id) || []).map((test) => this.mapToTest(test));

      return {
        ...this.mapToUnit(unit),
        batch: {
          ...this.mapToBatch({
            id: unit.batch_id_alias,
            batch_number: unit.batch_batch_number,
            product_id: unit.batch_product_id,
            production_order_id: unit.batch_production_order_id,
            quantity_planned: unit.batch_quantity_planned,
            quantity_produced: unit.batch_quantity_produced,
            quantity_scrapped: unit.batch_quantity_scrapped,
            quantity_in_progress: unit.batch_quantity_in_progress,
            status: unit.batch_status,
            planned_start_date: unit.batch_planned_start_date,
            planned_end_date: unit.batch_planned_end_date,
            actual_start_date: unit.batch_actual_start_date,
            actual_end_date: unit.batch_actual_end_date,
            assigned_to: unit.batch_assigned_to,
            created_by: unit.batch_created_by,
            notes: unit.batch_notes,
            created_at: unit.batch_created_at,
            updated_at: unit.batch_updated_at,
            product: {
              id: unit.product_id_alias,
              code: unit.product_code,
              name: unit.product_name,
              is_assembly: unit.product_is_assembly,
            },
          }),
          product: {
            id: unit.product_id_alias,
            code: unit.product_code,
            name: unit.product_name,
          },
        },
        components,
        tests,
      } as MyProductionUnit;
    });

    return unitsWithDetails;
  }

  async getMyProductionSummary(userId: string): Promise<MyProductionSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const query = `
      SELECT id, status, completed_at
      FROM production_units
      WHERE assigned_to = $1
    `;

    const result = await db.query(query, [userId]);
    const units = result.rows;

    return {
      assignedUnits: units.length,
      inProgress: units.filter((u) => u.status === 'IN_PRODUCTION').length,
      awaitingTest: units.filter((u) => u.status === 'AWAITING_TEST').length,
      completedToday: units.filter((u) =>
        u.status === 'COMPLETED' && u.completed_at && new Date(u.completed_at) >= today
      ).length,
      completedThisWeek: units.filter((u) =>
        u.status === 'COMPLETED' && u.completed_at && new Date(u.completed_at) >= weekStart
      ).length,
    };
  }

  // ============================================
  // BATCH SUMMARY
  // ============================================

  async getBatchSummary(id: string): Promise<BatchSummary | null> {
    const batch = await this.findById(id);
    if (!batch) return null;

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productName: batch.product?.name || '',
      productCode: batch.product?.code || '',
      status: batch.status,
      quantityPlanned: batch.quantityPlanned,
      quantityProduced: batch.quantityProduced,
      quantityScrapped: batch.quantityScrapped,
      quantityInProgress: batch.quantityInProgress,
      progressPercentage: batch.quantityPlanned > 0
        ? Math.round((batch.quantityProduced / batch.quantityPlanned) * 100)
        : 0,
      assignedToName: undefined, // Adicionar se necessário
      plannedStartDate: batch.plannedStartDate,
      actualStartDate: batch.actualStartDate,
    };
  }

  async getUnitsSummary(batchId: string): Promise<UnitSummary[]> {
    const units = await this.findUnitsByBatchId(batchId);
    const summaries: UnitSummary[] = [];

    for (const unit of units) {
      const components = await this.findComponentsByUnitId(unit.id);
      const tests = await this.findTestsByUnitId(unit.id);

      const assemblyTest = tests.find((t) => t.testType === 'ASSEMBLY');
      const finalTest = tests.find((t) => t.testType === 'FINAL');

      summaries.push({
        id: unit.id,
        unitNumber: unit.unitNumber,
        serialNumber: unit.serialNumber,
        status: unit.status,
        assignedToName: unit.assignedUser?.name,
        componentsTotal: components.length,
        componentsMounted: components.filter((c) => c.status === 'MOUNTED').length,
        mountingProgress: components.length > 0
          ? Math.round((components.filter((c) => c.status === 'MOUNTED').length / components.length) * 100)
          : 0,
        assemblyTestResult: assemblyTest?.result,
        finalTestResult: finalTest?.result,
      });
    }

    return summaries;
  }

  // ============================================
  // MANUAL UNIT CREATION (fallback se trigger não funcionar)
  // ============================================

  // Sincroniza componentes do BOM com as unidades existentes
  // Adiciona componentes que estão no BOM mas não estão nas unit_components
  async syncBOMComponents(batchId: string): Promise<{ added: number; partIds: string[] }> {
    // Buscar o lote
    const batch = await this.findById(batchId);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    // Buscar todas as unidades do lote
    const unitsQuery = 'SELECT id FROM production_units WHERE batch_id = $1';
    const unitsResult = await db.query(unitsQuery, [batchId]);
    const units = unitsResult.rows;

    if (units.length === 0) {
      return { added: 0, partIds: [] };
    }

    // Buscar BOM atual do produto
    const bomQuery = 'SELECT id, part_id, quantity FROM product_parts WHERE product_id = $1';
    const bomResult = await db.query(bomQuery, [batch.productId]);
    const bomParts = bomResult.rows;

    if (bomParts.length === 0) {
      return { added: 0, partIds: [] };
    }

    // Buscar componentes existentes de todas as unidades
    const unitIds = units.map((u) => u.id);
    const existingQuery = 'SELECT unit_id, part_id FROM unit_components WHERE unit_id = ANY($1)';
    const existingResult = await db.query(existingQuery, [unitIds]);
    const existingComponents = existingResult.rows;

    // Criar mapa de componentes existentes por unidade
    const existingMap = new Map<string, Set<string>>();
    for (const comp of existingComponents) {
      const unitParts = existingMap.get(comp.unit_id) || new Set();
      unitParts.add(comp.part_id);
      existingMap.set(comp.unit_id, unitParts);
    }

    // Encontrar componentes faltantes e criar
    const componentsToInsert = [];
    const addedPartIds = new Set<string>();

    for (const unit of units) {
      const existingParts = existingMap.get(unit.id) || new Set();

      for (const part of bomParts) {
        if (!existingParts.has(part.part_id)) {
          componentsToInsert.push({
            unit_id: unit.id,
            product_part_id: part.id,
            part_id: part.part_id,
            quantity_required: part.quantity,
            status: 'PENDING',
          });
          addedPartIds.add(part.part_id);
        }
      }
    }

    if (componentsToInsert.length === 0) {
      return { added: 0, partIds: [] };
    }

    // Inserir componentes faltantes
    for (const comp of componentsToInsert) {
      await db.query(
        `INSERT INTO unit_components (unit_id, product_part_id, part_id, quantity_required, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [comp.unit_id, comp.product_part_id, comp.part_id, comp.quantity_required, comp.status]
      );
    }

    console.log(`Sincronização: ${componentsToInsert.length} componentes adicionados para ${units.length} unidades`);

    return {
      added: componentsToInsert.length,
      partIds: Array.from(addedPartIds),
    };
  }

  /**
   * Gera serial numbers únicos para unidades de produção
   * Formato: EJR-N (onde N é um contador sequencial global que aumenta infinitamente)
   * REGRA: Nunca pode haver IDs duplicadas
   */
  async generateSerialNumbers(quantity: number): Promise<string[]> {
    // Buscar TODOS os serial numbers para encontrar o maior número
    const query = `
      SELECT serial_number
      FROM production_units
      WHERE serial_number IS NOT NULL
        AND serial_number LIKE 'EJR-%'
    `;

    const result = await db.query(query);
    let maxNumber = 0;

    if (result.rows.length > 0) {
      // Encontrar o maior número entre todos os seriais
      for (const unit of result.rows) {
        const match = unit.serial_number?.match(/^EJR-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Próximo contador começa após o maior existente
    const nextCounter = maxNumber + 1;

    // Gerar serial numbers
    const serialNumbers: string[] = [];
    for (let i = 0; i < quantity; i++) {
      serialNumbers.push(`EJR-${nextCounter + i}`);
    }

    return serialNumbers;
  }

  async createUnitsManually(batchId: string, quantityPlanned: number, productId: string): Promise<void> {
    // Gerar serial numbers únicos para cada unidade (formato: EJR-1, EJR-2, ...)
    const serialNumbers = await this.generateSerialNumbers(quantityPlanned);

    // Criar unidades de produção
    const insertedUnits = [];
    for (let i = 1; i <= quantityPlanned; i++) {
      const insertQuery = `
        INSERT INTO production_units (batch_id, unit_number, serial_number, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const result = await db.query(insertQuery, [
        batchId,
        i,
        serialNumbers[i - 1],
        'PENDING',
      ]);

      insertedUnits.push(result.rows[0]);
    }

    // Buscar BOM do produto
    const bomQuery = 'SELECT id, part_id, quantity FROM product_parts WHERE product_id = $1';
    const bomResult = await db.query(bomQuery, [productId]);
    const bomParts = bomResult.rows;

    if (bomParts.length === 0) {
      console.log('Produto não possui BOM, unidades criadas sem componentes');
      return;
    }

    // Criar componentes para cada unidade
    const componentsToInsert = [];
    for (const unit of insertedUnits) {
      for (const part of bomParts) {
        componentsToInsert.push({
          unit_id: unit.id,
          product_part_id: part.id,
          part_id: part.part_id,
          quantity_required: part.quantity,
          status: 'PENDING',
        });
      }
    }

    if (componentsToInsert.length > 0) {
      for (const comp of componentsToInsert) {
        try {
          await db.query(
            `INSERT INTO unit_components (unit_id, product_part_id, part_id, quantity_required, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [comp.unit_id, comp.product_part_id, comp.part_id, comp.quantity_required, comp.status]
          );
        } catch (error) {
          console.error('Erro ao criar componente:', error);
          // Não falha - componentes podem ser criados manualmente depois
        }
      }
    }

    console.log(`Criadas ${insertedUnits.length} unidades com ${componentsToInsert.length} componentes`);
  }

  // ============================================
  // COMPONENT RELEASE (Liberação de Componentes)
  // ============================================

  // Buscar todos os componentes de um lote para liberação
  async findComponentsForRelease(batchId: string): Promise<any[]> {
    // Buscar todas as unidades do lote
    const unitsQuery = `
      SELECT id, unit_number
      FROM production_units
      WHERE batch_id = $1
      ORDER BY unit_number ASC
    `;

    const unitsResult = await db.query(unitsQuery, [batchId]);

    if (unitsResult.rows.length === 0) {
      return [];
    }

    const units = unitsResult.rows;

    // Buscar componentes de todas as unidades
    const unitIds = units.map((u) => u.id);
    const componentsQuery = `
      SELECT
        uc.*,
        p.id as part_id_alias,
        p.code as part_code,
        p.name as part_name,
        p.current_stock as part_current_stock,
        ru.id as released_by_user_id,
        ru.name as released_by_user_name
      FROM unit_components uc
      LEFT JOIN products p ON uc.part_id = p.id
      LEFT JOIN users ru ON uc.released_by = ru.id
      WHERE uc.unit_id = ANY($1)
      ORDER BY uc.created_at ASC
    `;

    const componentsResult = await db.query(componentsQuery, [unitIds]);

    // Agrupar componentes por part_id e adicionar info da unidade
    const unitMap = new Map(units.map((u) => [u.id, u.unit_number]));

    return componentsResult.rows.map((comp) => ({
      ...this.mapToComponent(comp),
      unitNumber: unitMap.get(comp.unit_id),
    }));
  }

  // Liberar um componente do estoque
  async releaseComponent(
    componentId: string,
    quantity: number,
    userId: string,
    notes?: string
  ): Promise<UnitComponent> {
    return await db.transaction(async (client) => {
      // Buscar o componente atual
      const componentQuery = `
        SELECT
          uc.*,
          p.id as part_id_alias,
          p.code as part_code,
          p.name as part_name,
          p.current_stock as part_current_stock,
          pu.batch_id as unit_batch_id
        FROM unit_components uc
        LEFT JOIN products p ON uc.part_id = p.id
        LEFT JOIN production_units pu ON uc.unit_id = pu.id
        WHERE uc.id = $1
      `;

      const componentResult = await client.query(componentQuery, [componentId]);

      if (componentResult.rows.length === 0) {
        throw new Error('Componente não encontrado');
      }

      const component = componentResult.rows[0];

      if (!component.part_id) {
        throw new Error(`Peça não encontrada para o componente ${componentId}`);
      }

      // Verificar estoque disponível
      const currentStock = component.part_current_stock || 0;
      if (currentStock < quantity) {
        throw new Error(`Estoque insuficiente. Disponível: ${currentStock}, Solicitado: ${quantity}`);
      }

      // Verificar se já foi liberado completamente
      const alreadyReleased = component.released_quantity || 0;
      const totalAfterRelease = alreadyReleased + quantity;
      if (totalAfterRelease > component.quantity_required) {
        throw new Error(`Quantidade excede o necessário. Necessário: ${component.quantity_required}, Já liberado: ${alreadyReleased}`);
      }

      // Calcular novo estoque (REGRA: nunca negativo)
      let newStock = currentStock - quantity;
      if (newStock < 0) {
        console.warn(`Estoque ficaria negativo para ${component.part_name}. Ajustando de ${newStock} para 0.`);
        newStock = 0;
      }

      // 1. Baixar do estoque
      await client.query(
        'UPDATE products SET current_stock = $1 WHERE id = $2',
        [newStock, component.part_id]
      );

      // 2. Atualizar o componente
      const isFullyReleased = totalAfterRelease >= component.quantity_required;
      const releasedAt = new Date().toISOString();

      await client.query(
        `UPDATE unit_components
         SET is_released = $1,
             released_quantity = $2,
             released_at = $3,
             released_by = $4
         WHERE id = $5`,
        [isFullyReleased, totalAfterRelease, releasedAt, userId, componentId]
      );

      // 3. Registrar histórico de liberação
      await client.query(
        `INSERT INTO component_releases (
          unit_component_id, batch_id, unit_id, part_id,
          quantity_released, released_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [componentId, component.unit_batch_id, component.unit_id, component.part_id, quantity, userId, notes]
      );

      // 4. Registrar movimentação de estoque (ignora erro se tabela não existir)
      try {
        await client.query(
          `INSERT INTO inventory_movements (
            product_id, type, quantity, user_id, reason
          ) VALUES ($1, $2, $3, $4, $5)`,
          [component.part_id, 'OUT', quantity, userId, `Liberação para produção - Componente ${component.part_name || component.part_id}`]
        );
      } catch (error) {
        // Ignora erro se tabela não existir
      }

      // 5. Registrar histórico
      await client.query(
        `INSERT INTO production_history (
          entity_type, entity_id, action, previous_value, new_value, performed_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['COMPONENT', componentId, 'RELEASED', String(alreadyReleased), String(totalAfterRelease), userId, notes]
      );

      // Buscar componente atualizado com todos os detalhes
      const updatedQuery = `
        SELECT
          uc.*,
          p.id as part_id_alias,
          p.code as part_code,
          p.name as part_name,
          p.current_stock as part_current_stock,
          ru.id as released_by_user_id,
          ru.name as released_by_user_name
        FROM unit_components uc
        LEFT JOIN products p ON uc.part_id = p.id
        LEFT JOIN users ru ON uc.released_by = ru.id
        WHERE uc.id = $1
      `;

      const updatedResult = await client.query(updatedQuery, [componentId]);

      return this.mapToComponent(updatedResult.rows[0]);
    });
  }

  // Liberar múltiplos componentes de uma vez
  async releaseMultipleComponents(
    releases: Array<{ componentId: string; quantity: number }>,
    userId: string,
    notes?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const release of releases) {
      try {
        await this.releaseComponent(release.componentId, release.quantity, userId, notes);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Componente ${release.componentId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // Buscar histórico de liberações de um lote
  async getReleaseHistory(batchId: string): Promise<ComponentRelease[]> {
    const query = `
      SELECT
        cr.*,
        p.id as part_id_alias,
        p.code as part_code,
        p.name as part_name,
        u.id as released_by_user_id,
        u.name as released_by_user_name
      FROM component_releases cr
      LEFT JOIN products p ON cr.part_id = p.id
      LEFT JOIN users u ON cr.released_by = u.id
      WHERE cr.batch_id = $1
      ORDER BY cr.released_at DESC
    `;

    const result = await db.query(query, [batchId]);

    return result.rows.map((r) => ({
      id: r.id,
      unitComponentId: r.unit_component_id,
      batchId: r.batch_id,
      unitId: r.unit_id,
      partId: r.part_id,
      part: r.part_id ? {
        id: r.part_id_alias,
        code: r.part_code,
        name: r.part_name,
      } : undefined,
      quantityReleased: r.quantity_released,
      releasedBy: r.released_by,
      releasedByUser: r.released_by_user_id ? {
        id: r.released_by_user_id,
        name: r.released_by_user_name,
      } : undefined,
      releasedAt: r.released_at,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  }

  // Resumo de liberações por componente (agrupado por part_id)
  async getReleaseSummaryByPart(batchId: string): Promise<any[]> {
    // Buscar o lote para pegar o produto
    const batch = await this.findById(batchId);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    // Buscar BOM do produto
    const bomQuery = `
      SELECT
        pp.id,
        pp.part_id,
        pp.quantity,
        p.id as part_id_alias,
        p.code as part_code,
        p.name as part_name,
        p.current_stock as part_current_stock
      FROM product_parts pp
      LEFT JOIN products p ON pp.part_id = p.id
      WHERE pp.product_id = $1
    `;

    const bomResult = await db.query(bomQuery, [batch.productId]);
    const bomParts = bomResult.rows;

    // Buscar todas as unidades do lote
    const unitsQuery = 'SELECT id FROM production_units WHERE batch_id = $1';
    const unitsResult = await db.query(unitsQuery, [batchId]);
    const unitIds = unitsResult.rows.map((u) => u.id);

    if (unitIds.length === 0) {
      // Sem unidades, retornar BOM apenas
      return bomParts.map((bom) => ({
        partId: bom.part_id,
        partCode: bom.part_code,
        partName: bom.part_name,
        quantityPerUnit: bom.quantity,
        totalUnits: batch.quantityPlanned,
        totalRequired: 0,
        totalReleased: 0,
        remainingToRelease: 0,
        currentStock: bom.part_current_stock || 0,
        percentReleased: 0,
        components: [],
      }));
    }

    // Buscar componentes com detalhes (incluindo ID para liberar)
    const componentsQuery = `
      SELECT id, part_id, quantity_required, released_quantity, is_released, unit_id
      FROM unit_components
      WHERE unit_id = ANY($1)
    `;

    const componentsResult = await db.query(componentsQuery, [unitIds]);
    const allComponents = componentsResult.rows;

    // Agrupar componentes por part_id
    const componentsByPart = new Map<string, Array<{
      id: string;
      quantityRequired: number;
      releasedQuantity: number;
      isReleased: boolean;
      remainingToRelease: number;
    }>>();

    for (const comp of allComponents) {
      const partComponents = componentsByPart.get(comp.part_id) || [];
      const remaining = comp.quantity_required - (comp.released_quantity || 0);
      partComponents.push({
        id: comp.id,
        quantityRequired: comp.quantity_required,
        releasedQuantity: comp.released_quantity || 0,
        isReleased: comp.is_released,
        remainingToRelease: remaining > 0 ? remaining : 0,
      });
      componentsByPart.set(comp.part_id, partComponents);
    }

    // Montar resumo
    return bomParts.map((bom) => {
      const components = componentsByPart.get(bom.part_id) || [];
      const totalReleased = components.reduce((acc, c) => acc + c.releasedQuantity, 0);
      const totalRequired = components.reduce((acc, c) => acc + c.quantityRequired, 0);

      return {
        partId: bom.part_id,
        partCode: bom.part_code,
        partName: bom.part_name,
        quantityPerUnit: bom.quantity,
        totalUnits: batch.quantityPlanned,
        totalRequired,
        totalReleased,
        remainingToRelease: totalRequired - totalReleased,
        currentStock: bom.part_current_stock || 0,
        percentReleased: totalRequired > 0
          ? Math.round((totalReleased / totalRequired) * 100)
          : 0,
        // Include individual component IDs for release
        components: components.filter((c) => c.remainingToRelease > 0),
      };
    });
  }

  // ============================================
  // STOCK INTEGRATION
  // ============================================

  async consumeStock(batchId: string, userId: string): Promise<void> {
    return await db.transaction(async (client) => {
      // Buscar o lote e seus componentes
      const batch = await this.findById(batchId);
      if (!batch) {
        throw new Error('Lote não encontrado');
      }

      // Buscar BOM do produto
      const bomQuery = 'SELECT part_id, quantity FROM product_parts WHERE product_id = $1';
      const bomResult = await client.query(bomQuery, [batch.productId]);
      const bomParts = bomResult.rows;

      // Para cada componente do BOM, baixar do estoque
      for (const part of bomParts) {
        const quantityToConsume = part.quantity * batch.quantityPlanned;

        // Buscar estoque atual do componente
        const productQuery = 'SELECT current_stock, name FROM products WHERE id = $1';
        const productResult = await client.query(productQuery, [part.part_id]);

        if (productResult.rows.length === 0) {
          console.error(`Produto ${part.part_id} não encontrado`);
          continue;
        }

        const product = productResult.rows[0];
        const currentStock = product.current_stock || 0;
        let newStock = currentStock - quantityToConsume;

        // REGRA: Estoque nunca pode ser negativo - ajustar para 0 se necessário
        if (newStock < 0) {
          console.warn(`Estoque ficaria negativo para ${product.name || part.part_id}. Ajustando de ${newStock} para 0.`);
          newStock = 0;
        }

        // Atualizar estoque diretamente
        await client.query(
          'UPDATE products SET current_stock = $1 WHERE id = $2',
          [newStock, part.part_id]
        );

        // Registrar movimentação de estoque (se a tabela existir)
        try {
          await client.query(
            `INSERT INTO inventory_movements (product_id, type, quantity, user_id, reason)
             VALUES ($1, $2, $3, $4, $5)`,
            [part.part_id, 'OUT', quantityToConsume, userId, `Consumo para lote ${batch.batchNumber}`]
          );
        } catch (error) {
          // Ignora erro se tabela não existir
        }
      }

      // Registrar histórico
      await client.query(
        `INSERT INTO production_history (entity_type, entity_id, action, previous_value, new_value, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['BATCH', batchId, 'STOCK_CONSUMED', null, null, userId]
      );
    });
  }

  async addFinishedToStock(batchId: string, quantity: number, userId: string): Promise<void> {
    return await db.transaction(async (client) => {
      const batch = await this.findById(batchId);
      if (!batch) {
        throw new Error('Lote não encontrado');
      }

      // Buscar estoque atual do produto
      const productQuery = 'SELECT current_stock FROM products WHERE id = $1';
      const productResult = await client.query(productQuery, [batch.productId]);

      if (productResult.rows.length === 0) {
        throw new Error('Produto não encontrado');
      }

      const product = productResult.rows[0];
      const newStock = (product.current_stock || 0) + quantity;

      // Atualizar estoque do produto acabado
      await client.query(
        'UPDATE products SET current_stock = $1 WHERE id = $2',
        [newStock, batch.productId]
      );

      // Registrar movimentação de estoque (se a tabela existir)
      try {
        await client.query(
          `INSERT INTO inventory_movements (product_id, type, quantity, user_id, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [batch.productId, 'IN', quantity, userId, `Produção do lote ${batch.batchNumber}`]
        );
      } catch (error) {
        // Ignora erro se tabela não existir
      }

      // Registrar histórico
      await client.query(
        `INSERT INTO production_history (entity_type, entity_id, action, previous_value, new_value, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['BATCH', batchId, 'STOCK_ADDED', null, String(quantity), userId]
      );
    });
  }

  // ============================================
  // MAPPERS
  // ============================================

  private mapToBatch(data: any): ProductionBatch {
    return {
      id: data.id,
      batchNumber: data.batch_number,
      productId: data.product_id,
      product: data.product ? {
        id: data.product.id,
        code: data.product.code,
        name: data.product.name,
        isAssembly: data.product.is_assembly,
      } : undefined,
      productionOrderId: data.production_order_id,
      quantityPlanned: data.quantity_planned,
      quantityProduced: data.quantity_produced,
      quantityScrapped: data.quantity_scrapped,
      quantityInProgress: data.quantity_in_progress,
      status: data.status as ProductionBatchStatus,
      plannedStartDate: data.planned_start_date,
      plannedEndDate: data.planned_end_date,
      actualStartDate: data.actual_start_date,
      actualEndDate: data.actual_end_date,
      assignedTo: data.assigned_to,
      createdBy: data.created_by,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToUnit(data: any): ProductionUnit {
    return {
      id: data.id,
      batchId: data.batch_id,
      batch: data.batch ? this.mapToBatch(data.batch) : undefined,
      unitNumber: data.unit_number,
      serialNumber: data.serial_number,
      status: data.status as ProductionUnitStatus,
      assignedTo: data.assigned_to,
      assignedUser: data.assigned_user ? {
        id: data.assigned_user.id,
        name: data.assigned_user.name,
      } : undefined,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      testedAt: data.tested_at,
      testedBy: data.tested_by,
      finalTestedAt: data.final_tested_at,
      finalTestedBy: data.final_tested_by,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToComponent(data: any): UnitComponent {
    return {
      id: data.id,
      unitId: data.unit_id,
      productPartId: data.product_part_id,
      productPart: (data.product_part && data.part) ? {
        id: data.product_part.id,
        partId: data.product_part.part_id,
        quantity: data.product_part.quantity,
        part: {
          id: data.part.id || data.part_id_alias,
          code: data.part.code || data.part_code,
          name: data.part.name || data.part_name,
        },
      } : undefined,
      partId: data.part_id,
      part: (data.part || data.part_id_alias) ? {
        id: data.part?.id || data.part_id_alias,
        code: data.part?.code || data.part_code,
        name: data.part?.name || data.part_name,
        currentStock: data.part?.current_stock || data.part_current_stock,
      } : undefined,
      quantityRequired: data.quantity_required,
      quantityUsed: data.quantity_used,
      status: data.status as UnitComponentStatus,
      // Campos de liberação
      isReleased: data.is_released || false,
      releasedQuantity: data.released_quantity || 0,
      releasedAt: data.released_at,
      releasedBy: data.released_by,
      releasedByUser: (data.released_by_user || data.released_by_user_id) ? {
        id: data.released_by_user?.id || data.released_by_user_id,
        name: data.released_by_user?.name || data.released_by_user_name,
      } : undefined,
      mountedAt: data.mounted_at,
      mountedBy: data.mounted_by,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToTest(data: any): UnitTest {
    return {
      id: data.id,
      unitId: data.unit_id,
      testType: data.test_type as TestType,
      result: data.result as TestResult,
      testedBy: data.tested_by,
      testedByUser: data.tested_by_user ? {
        id: data.tested_by_user.id,
        name: data.tested_by_user.name,
      } : undefined,
      testedAt: data.tested_at,
      observations: data.observations,
      defectsFound: data.defects_found,
      createdAt: data.created_at,
    };
  }

  private mapToHistory(data: any): ProductionHistory {
    return {
      id: data.id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      action: data.action,
      previousValue: data.previous_value,
      newValue: data.new_value,
      performedBy: data.performed_by,
      performedByUser: data.performed_by_user ? {
        id: data.performed_by_user.id,
        name: data.performed_by_user.name,
      } : undefined,
      performedAt: data.performed_at,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }
}
