import type { Request, Response } from 'express';
import { ProductionBatchesService } from '../services/production-batches.service';
import type { ProductionBatchStatus } from '@ejr/shared-types';

export class ProductionBatchesController {
  private service: ProductionBatchesService;

  constructor() {
    this.service = new ProductionBatchesService();
  }

  // ============================================
  // PRODUCTION BATCHES
  // ============================================

  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as ProductionBatchStatus | undefined;
    const productId = req.query.productId as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;

    const result = await this.service.findMany({
      page,
      limit,
      status,
      productId,
      assignedTo,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const batch = await this.service.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Lote não encontrado',
      });
    }

    res.json({
      success: true,
      data: batch,
    });
  };

  create = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    const batch = await this.service.create(req.body, userId);

    res.status(201).json({
      success: true,
      data: batch,
      message: 'Lote de produção criado com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.update(id, req.body, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Lote atualizado com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Lote excluído com sucesso',
    });
  };

  // ============================================
  // BATCH LIFECYCLE
  // ============================================

  release = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.release(id, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Lote liberado para produção',
    });
  };

  start = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.start(id, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Produção iniciada',
    });
  };

  pause = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.pause(id, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Produção pausada',
    });
  };

  resume = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.resume(id, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Produção retomada',
    });
  };

  complete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.complete(id, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Lote completado com sucesso',
    });
  };

  cancel = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const batch = await this.service.cancel(id, userId);

    res.json({
      success: true,
      data: batch,
      message: 'Lote cancelado',
    });
  };

  // ============================================
  // PRODUCTION UNITS
  // ============================================

  findUnitsByBatchId = async (req: Request, res: Response) => {
    const { id } = req.params;
    const units = await this.service.findUnitsByBatchId(id);

    res.json({
      success: true,
      data: units,
    });
  };

  findUnitById = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const unit = await this.service.findUnitById(unitId);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unidade não encontrada',
      });
    }

    res.json({
      success: true,
      data: unit,
    });
  };

  updateUnit = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const userId = (req as any).user?.id;

    const unit = await this.service.updateUnit(unitId, req.body, userId);

    res.json({
      success: true,
      data: unit,
      message: 'Unidade atualizada',
    });
  };

  assignUnit = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const { userId: assignedUserId } = req.body;
    const assignedBy = (req as any).user?.id;

    const unit = await this.service.assignUnit(unitId, assignedUserId, assignedBy);

    res.json({
      success: true,
      data: unit,
      message: 'Unidade atribuída',
    });
  };

  startUnit = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const userId = (req as any).user?.id;

    const unit = await this.service.startUnit(unitId, userId);

    res.json({
      success: true,
      data: unit,
      message: 'Montagem iniciada',
    });
  };

  finishMounting = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const userId = (req as any).user?.id;

    const unit = await this.service.finishMounting(unitId, userId);

    res.json({
      success: true,
      data: unit,
      message: 'Montagem finalizada, aguardando teste',
    });
  };

  scrapUnit = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const userId = (req as any).user?.id;
    const { reason } = req.body;

    const unit = await this.service.scrapUnit(unitId, userId, reason);

    res.json({
      success: true,
      data: unit,
      message: 'Unidade marcada como refugo',
    });
  };

  // ============================================
  // UNIT COMPONENTS
  // ============================================

  findComponentsByUnitId = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const components = await this.service.findComponentsByUnitId(unitId);

    res.json({
      success: true,
      data: components,
    });
  };

  updateComponent = async (req: Request, res: Response) => {
    const { componentId } = req.params;
    const userId = (req as any).user?.id;

    const component = await this.service.updateComponent(componentId, req.body, userId);

    res.json({
      success: true,
      data: component,
      message: 'Componente atualizado',
    });
  };

  mountComponent = async (req: Request, res: Response) => {
    const { componentId } = req.params;
    const userId = (req as any).user?.id;
    const { quantityUsed } = req.body;

    const component = await this.service.mountComponent(componentId, userId, quantityUsed);

    res.json({
      success: true,
      data: component,
      message: 'Componente montado',
    });
  };

  mountAllComponents = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const userId = (req as any).user?.id;

    await this.service.mountAllComponents(unitId, userId);

    res.json({
      success: true,
      message: 'Todos os componentes montados',
    });
  };

  markComponentDefective = async (req: Request, res: Response) => {
    const { componentId } = req.params;
    const userId = (req as any).user?.id;
    const { notes } = req.body;

    const component = await this.service.markComponentDefective(componentId, userId, notes);

    res.json({
      success: true,
      data: component,
      message: 'Componente marcado como defeituoso',
    });
  };

  // ============================================
  // UNIT TESTS
  // ============================================

  findTestsByUnitId = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const tests = await this.service.findTestsByUnitId(unitId);

    res.json({
      success: true,
      data: tests,
    });
  };

  createTest = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    const test = await this.service.createTest(req.body, userId);

    res.status(201).json({
      success: true,
      data: test,
      message: 'Teste registrado',
    });
  };

  // ============================================
  // PRODUCTION HISTORY
  // ============================================

  getBatchHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const history = await this.service.getBatchHistory(id);

    res.json({
      success: true,
      data: history,
    });
  };

  getUnitHistory = async (req: Request, res: Response) => {
    const { unitId } = req.params;
    const history = await this.service.getUnitHistory(unitId);

    res.json({
      success: true,
      data: history,
    });
  };

  // ============================================
  // MY PRODUCTION
  // ============================================

  findMyUnits = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const units = await this.service.findMyUnits(userId);

    res.json({
      success: true,
      data: units,
    });
  };

  getMyProductionSummary = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const summary = await this.service.getMyProductionSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  };

  // ============================================
  // SUMMARIES
  // ============================================

  getBatchSummary = async (req: Request, res: Response) => {
    const { id } = req.params;
    const summary = await this.service.getBatchSummary(id);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Lote não encontrado',
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  };

  getUnitsSummary = async (req: Request, res: Response) => {
    const { id } = req.params;
    const summary = await this.service.getUnitsSummary(id);

    res.json({
      success: true,
      data: summary,
    });
  };

  // ============================================
  // COMPONENT RELEASE (Liberação de Componentes)
  // ============================================

  getComponentsForRelease = async (req: Request, res: Response) => {
    const { id } = req.params;
    const components = await this.service.getComponentsForRelease(id);

    res.json({
      success: true,
      data: components,
    });
  };

  getReleaseSummary = async (req: Request, res: Response) => {
    const { id } = req.params;
    const summary = await this.service.getReleaseSummary(id);

    res.json({
      success: true,
      data: summary,
    });
  };

  releaseComponent = async (req: Request, res: Response) => {
    const { componentId } = req.params;
    const userId = (req as any).user?.id;
    const { quantity, notes } = req.body;

    const component = await this.service.releaseComponent(componentId, quantity, userId, notes);

    res.json({
      success: true,
      data: component,
      message: 'Componente liberado do estoque',
    });
  };

  releaseMultipleComponents = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { releases, notes } = req.body;

    const result = await this.service.releaseMultipleComponents(releases, userId, notes);

    res.json({
      success: true,
      data: result,
      message: `${result.success} componente(s) liberado(s)`,
    });
  };

  getReleaseHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const history = await this.service.getReleaseHistory(id);

    res.json({
      success: true,
      data: history,
    });
  };

  // Sincroniza componentes do BOM com as unidades existentes
  // Útil quando o BOM é atualizado após o lote já ter sido liberado
  syncBOMComponents = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.service.syncBOMComponents(id);

    res.json({
      success: true,
      data: result,
      message: result.added > 0
        ? `${result.added} componente(s) adicionado(s) às unidades`
        : 'Todos os componentes já estão sincronizados',
    });
  };
}
