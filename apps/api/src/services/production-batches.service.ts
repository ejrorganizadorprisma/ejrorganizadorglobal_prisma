import { ProductionBatchesRepository } from '../repositories/production-batches.repository';
import type {
  ProductionBatch,
  ProductionBatchStatus,
  ProductionUnit,
  UnitComponent,
  UnitTest,
  ProductionHistory,
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

export class ProductionBatchesService {
  private repository: ProductionBatchesRepository;

  constructor() {
    this.repository = new ProductionBatchesRepository();
  }

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
    return this.repository.findMany(params);
  }

  async findById(id: string): Promise<ProductionBatch | null> {
    return this.repository.findById(id);
  }

  async create(dto: CreateProductionBatchDTO, createdBy: string): Promise<ProductionBatch> {
    return this.repository.create(dto, createdBy);
  }

  async update(id: string, dto: UpdateProductionBatchDTO, userId: string): Promise<ProductionBatch> {
    return this.repository.update(id, dto, userId);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    // Verificar se pode ser excluído (apenas DRAFT ou CANCELLED)
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (!['DRAFT', 'CANCELLED'].includes(batch.status)) {
      throw new Error('Apenas lotes em rascunho ou cancelados podem ser excluídos');
    }

    return this.repository.delete(id);
  }

  // ============================================
  // BATCH LIFECYCLE
  // ============================================

  async release(id: string, userId: string): Promise<ProductionBatch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (!['DRAFT', 'PLANNED'].includes(batch.status)) {
      throw new Error('Lote deve estar em rascunho ou planejado para ser liberado');
    }

    // 1. Criar unidades ANTES de mudar o status (evita conflito com trigger)
    try {
      const existingUnits = await this.repository.findUnitsByBatchId(id);
      if (existingUnits.length === 0) {
        await this.repository.createUnitsManually(id, batch.quantityPlanned, batch.productId);
      }
    } catch (error: any) {
      console.error('Erro ao criar unidades:', error);
      throw new Error(`Erro ao criar unidades de produção: ${error.message}`);
    }

    // 2. Atualizar status para RELEASED via SQL direto (bypass trigger)
    let updated: ProductionBatch;
    try {
      updated = await this.repository.releaseBypassTrigger(id, userId);
    } catch (error: any) {
      console.error('Erro ao atualizar status para RELEASED:', error);
      throw new Error(`Erro ao liberar lote: ${error.message}`);
    }

    // 3. Consumir estoque dos componentes (opcional)
    try {
      await this.repository.consumeStock(id, userId);
    } catch (error: any) {
      console.error('Erro ao consumir estoque (não crítico):', error);
    }

    return updated;
  }

  async start(id: string, userId: string): Promise<ProductionBatch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (batch.status !== 'RELEASED') {
      throw new Error('Lote deve estar liberado para iniciar produção');
    }

    return this.repository.update(id, {
      status: 'IN_PROGRESS',
      actualStartDate: new Date().toISOString(),
    }, userId);
  }

  async pause(id: string, userId: string): Promise<ProductionBatch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (batch.status !== 'IN_PROGRESS') {
      throw new Error('Lote deve estar em progresso para pausar');
    }

    return this.repository.update(id, { status: 'PAUSED' }, userId);
  }

  async resume(id: string, userId: string): Promise<ProductionBatch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (batch.status !== 'PAUSED') {
      throw new Error('Lote deve estar pausado para retomar');
    }

    return this.repository.update(id, { status: 'IN_PROGRESS' }, userId);
  }

  async complete(id: string, userId: string): Promise<ProductionBatch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (!['IN_PROGRESS', 'TESTING'].includes(batch.status)) {
      throw new Error('Lote deve estar em progresso ou em teste para completar');
    }

    // Verificar se todas as unidades estão completas ou refugadas
    const units = await this.repository.findUnitsByBatchId(id);
    const pendingUnits = units.filter((u) =>
      !['COMPLETED', 'SCRAPPED'].includes(u.status)
    );

    if (pendingUnits.length > 0) {
      throw new Error(`Ainda existem ${pendingUnits.length} unidades pendentes`);
    }

    // Adicionar produtos acabados ao estoque
    const completedCount = units.filter((u) => u.status === 'COMPLETED').length;
    if (completedCount > 0) {
      await this.repository.addFinishedToStock(id, completedCount, userId);
    }

    return this.repository.update(id, {
      status: 'COMPLETED',
      actualEndDate: new Date().toISOString(),
    }, userId);
  }

  async cancel(id: string, userId: string): Promise<ProductionBatch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) {
      throw new Error('Lote já foi completado ou cancelado');
    }

    // TODO: Devolver estoque dos componentes se já consumidos

    return this.repository.update(id, { status: 'CANCELLED' }, userId);
  }

  // ============================================
  // PRODUCTION UNITS
  // ============================================

  async findUnitsByBatchId(batchId: string): Promise<ProductionUnit[]> {
    return this.repository.findUnitsByBatchId(batchId);
  }

  async findUnitById(id: string): Promise<ProductionUnit | null> {
    return this.repository.findUnitById(id);
  }

  async updateUnit(id: string, dto: UpdateProductionUnitDTO, userId: string): Promise<ProductionUnit> {
    return this.repository.updateUnit(id, dto, userId);
  }

  async assignUnit(unitId: string, userId: string, assignedBy: string): Promise<ProductionUnit> {
    return this.repository.assignUnit(unitId, userId, assignedBy);
  }

  async startUnit(unitId: string, userId: string): Promise<ProductionUnit> {
    const unit = await this.repository.findUnitById(unitId);
    if (!unit) {
      throw new Error('Unidade não encontrada');
    }

    if (unit.status !== 'PENDING') {
      throw new Error('Unidade deve estar pendente para iniciar');
    }

    return this.repository.updateUnit(unitId, {
      status: 'IN_PRODUCTION',
      assignedTo: userId,
    }, userId);
  }

  async finishMounting(unitId: string, userId: string): Promise<ProductionUnit> {
    const unit = await this.repository.findUnitById(unitId);
    if (!unit) {
      throw new Error('Unidade não encontrada');
    }

    if (unit.status !== 'IN_PRODUCTION') {
      throw new Error('Unidade deve estar em produção');
    }

    // Verificar se todos os componentes estão montados
    const components = await this.repository.findComponentsByUnitId(unitId);
    const pendingComponents = components.filter((c) => c.status !== 'MOUNTED');

    if (pendingComponents.length > 0) {
      throw new Error(`Ainda existem ${pendingComponents.length} componentes pendentes`);
    }

    return this.repository.updateUnit(unitId, {
      status: 'AWAITING_TEST',
    }, userId);
  }

  async scrapUnit(unitId: string, userId: string, reason?: string): Promise<ProductionUnit> {
    const unit = await this.repository.findUnitById(unitId);
    if (!unit) {
      throw new Error('Unidade não encontrada');
    }

    return this.repository.updateUnit(unitId, {
      status: 'SCRAPPED',
      notes: reason,
    }, userId);
  }

  // ============================================
  // UNIT COMPONENTS
  // ============================================

  async findComponentsByUnitId(unitId: string): Promise<UnitComponent[]> {
    return this.repository.findComponentsByUnitId(unitId);
  }

  async updateComponent(id: string, dto: UpdateUnitComponentDTO, userId: string): Promise<UnitComponent> {
    return this.repository.updateComponent(id, dto, userId);
  }

  async mountComponent(componentId: string, userId: string, quantityUsed?: number): Promise<UnitComponent> {
    return this.repository.updateComponent(componentId, {
      status: 'MOUNTED',
      quantityUsed,
    }, userId);
  }

  async mountAllComponents(unitId: string, userId: string): Promise<void> {
    return this.repository.mountAllComponents(unitId, userId);
  }

  async markComponentDefective(componentId: string, userId: string, notes?: string): Promise<UnitComponent> {
    return this.repository.updateComponent(componentId, {
      status: 'DEFECTIVE',
      notes,
    }, userId);
  }

  // ============================================
  // UNIT TESTS
  // ============================================

  async findTestsByUnitId(unitId: string): Promise<UnitTest[]> {
    return this.repository.findTestsByUnitId(unitId);
  }

  async createTest(dto: CreateUnitTestDTO, testedBy: string): Promise<UnitTest> {
    const unit = await this.repository.findUnitById(dto.unitId);
    if (!unit) {
      throw new Error('Unidade não encontrada');
    }

    // Validar estado para o tipo de teste
    if (dto.testType === 'ASSEMBLY') {
      if (!['AWAITING_TEST', 'IN_TESTING', 'TEST_FAILED', 'REWORK'].includes(unit.status)) {
        throw new Error('Unidade deve estar aguardando teste ou em retrabalho');
      }
    } else if (dto.testType === 'FINAL') {
      if (!['TEST_PASSED', 'REWORK'].includes(unit.status)) {
        throw new Error('Unidade deve ter passado no teste de montagem');
      }

      // REGRA: O teste final NÃO pode ser realizado pelo mesmo usuário que fez o teste de montagem
      const existingTests = await this.repository.findTestsByUnitId(dto.unitId);
      const assemblyTest = existingTests.find((t) => t.testType === 'ASSEMBLY' && t.result === 'PASSED');

      if (assemblyTest && assemblyTest.testedBy === testedBy) {
        throw new Error('O teste final não pode ser realizado pelo mesmo usuário que fez o teste de montagem');
      }
    }

    return this.repository.createTest(dto, testedBy);
  }

  // ============================================
  // PRODUCTION HISTORY
  // ============================================

  async getBatchHistory(batchId: string): Promise<ProductionHistory[]> {
    return this.repository.getHistory('BATCH', batchId);
  }

  async getUnitHistory(unitId: string): Promise<ProductionHistory[]> {
    // Buscar histórico da unidade
    const unitHistory = await this.repository.getHistory('UNIT', unitId);

    // Buscar componentes da unidade
    const components = await this.repository.findComponentsByUnitId(unitId);
    const componentIds = components.map((c) => c.id);

    // Buscar histórico de cada componente
    const componentHistories: ProductionHistory[] = [];
    for (const componentId of componentIds) {
      const history = await this.repository.getHistory('COMPONENT', componentId);
      // Adicionar info do componente no histórico
      const component = components.find((c) => c.id === componentId);
      const enrichedHistory = history.map((h) => ({
        ...h,
        notes: h.notes || (component?.part?.name ? `Componente: ${component.part.name}` : undefined),
      }));
      componentHistories.push(...enrichedHistory);
    }

    // Combinar e ordenar por data (mais recente primeiro)
    const allHistory = [...unitHistory, ...componentHistories];
    allHistory.sort((a, b) => {
      const dateA = new Date(a.performedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.performedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return allHistory;
  }

  // ============================================
  // MY PRODUCTION
  // ============================================

  async findMyUnits(userId: string): Promise<MyProductionUnit[]> {
    return this.repository.findMyUnits(userId);
  }

  async getMyProductionSummary(userId: string): Promise<MyProductionSummary> {
    return this.repository.getMyProductionSummary(userId);
  }

  // ============================================
  // SUMMARIES
  // ============================================

  async getBatchSummary(id: string): Promise<BatchSummary | null> {
    return this.repository.getBatchSummary(id);
  }

  async getUnitsSummary(batchId: string): Promise<UnitSummary[]> {
    return this.repository.getUnitsSummary(batchId);
  }

  // ============================================
  // COMPONENT RELEASE (Liberação de Componentes)
  // ============================================

  async getComponentsForRelease(batchId: string) {
    return this.repository.findComponentsForRelease(batchId);
  }

  async releaseComponent(
    componentId: string,
    quantity: number,
    userId: string,
    notes?: string
  ) {
    return this.repository.releaseComponent(componentId, quantity, userId, notes);
  }

  async releaseMultipleComponents(
    releases: Array<{ componentId: string; quantity: number }>,
    userId: string,
    notes?: string
  ) {
    return this.repository.releaseMultipleComponents(releases, userId, notes);
  }

  async getReleaseHistory(batchId: string) {
    return this.repository.getReleaseHistory(batchId);
  }

  async getReleaseSummary(batchId: string) {
    // Sincronizar componentes do BOM antes de retornar o resumo
    // Isso garante que novos componentes adicionados ao BOM apareçam
    try {
      const syncResult = await this.repository.syncBOMComponents(batchId);
      if (syncResult.added > 0) {
        console.log(`Sincronização automática: ${syncResult.added} componentes adicionados`);
      }
    } catch (error: any) {
      console.error('Erro na sincronização automática:', error.message);
    }

    return this.repository.getReleaseSummaryByPart(batchId);
  }

  // Sincroniza componentes do BOM com as unidades existentes
  // Útil quando o BOM é atualizado após o lote já ter sido liberado
  async syncBOMComponents(batchId: string) {
    return this.repository.syncBOMComponents(batchId);
  }
}
