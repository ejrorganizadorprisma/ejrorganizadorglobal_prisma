import { Router } from 'express';
import { ProductionBatchesController } from '../controllers/production-batches.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ProductionBatchesController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============================================
// MY PRODUCTION (Para funcionários da produção)
// IMPORTANTE: Deve vir ANTES das rotas com :id para não conflitar
// ============================================

// GET /api/production-batches/my-production/units - Minhas unidades
router.get('/my-production/units', asyncHandler(controller.findMyUnits));

// GET /api/production-batches/my-production/summary - Meu resumo
router.get('/my-production/summary', asyncHandler(controller.getMyProductionSummary));

// ============================================
// UNIT TESTS (rota sem :id deve vir antes)
// ============================================

// POST /api/production-batches/tests - Criar teste
router.post('/tests', asyncHandler(controller.createTest));

// ============================================
// PRODUCTION BATCHES
// ============================================

// GET /api/production-batches - Listar lotes com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/production-batches/:id - Buscar lote por ID
router.get('/:id', asyncHandler(controller.findById));

// POST /api/production-batches - Criar novo lote
router.post('/', asyncHandler(controller.create));

// PATCH /api/production-batches/:id - Atualizar lote
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/production-batches/:id - Excluir lote
router.delete('/:id', asyncHandler(controller.delete));

// ============================================
// BATCH LIFECYCLE
// ============================================

// POST /api/production-batches/:id/release - Liberar lote para produção
router.post('/:id/release', asyncHandler(controller.release));

// POST /api/production-batches/:id/start - Iniciar produção
router.post('/:id/start', asyncHandler(controller.start));

// POST /api/production-batches/:id/pause - Pausar produção
router.post('/:id/pause', asyncHandler(controller.pause));

// POST /api/production-batches/:id/resume - Retomar produção
router.post('/:id/resume', asyncHandler(controller.resume));

// POST /api/production-batches/:id/complete - Completar lote
router.post('/:id/complete', asyncHandler(controller.complete));

// POST /api/production-batches/:id/cancel - Cancelar lote
router.post('/:id/cancel', asyncHandler(controller.cancel));

// ============================================
// PRODUCTION UNITS
// ============================================

// GET /api/production-batches/:id/units - Listar unidades do lote
router.get('/:id/units', asyncHandler(controller.findUnitsByBatchId));

// GET /api/production-batches/:id/units/:unitId - Buscar unidade por ID
router.get('/:id/units/:unitId', asyncHandler(controller.findUnitById));

// PATCH /api/production-batches/:id/units/:unitId - Atualizar unidade
router.patch('/:id/units/:unitId', asyncHandler(controller.updateUnit));

// POST /api/production-batches/:id/units/:unitId/assign - Atribuir unidade a funcionário
router.post('/:id/units/:unitId/assign', asyncHandler(controller.assignUnit));

// POST /api/production-batches/:id/units/:unitId/start - Iniciar montagem da unidade
router.post('/:id/units/:unitId/start', asyncHandler(controller.startUnit));

// POST /api/production-batches/:id/units/:unitId/finish-mounting - Finalizar montagem
router.post('/:id/units/:unitId/finish-mounting', asyncHandler(controller.finishMounting));

// POST /api/production-batches/:id/units/:unitId/scrap - Marcar como refugo
router.post('/:id/units/:unitId/scrap', asyncHandler(controller.scrapUnit));

// ============================================
// UNIT COMPONENTS
// ============================================

// GET /api/production-batches/:id/units/:unitId/components - Listar componentes
router.get('/:id/units/:unitId/components', asyncHandler(controller.findComponentsByUnitId));

// PATCH /api/production-batches/:id/units/:unitId/components/:componentId - Atualizar componente
router.patch('/:id/units/:unitId/components/:componentId', asyncHandler(controller.updateComponent));

// POST /api/production-batches/:id/units/:unitId/components/:componentId/mount - Montar componente
router.post('/:id/units/:unitId/components/:componentId/mount', asyncHandler(controller.mountComponent));

// POST /api/production-batches/:id/units/:unitId/components/mount-all - Montar todos os componentes
router.post('/:id/units/:unitId/components/mount-all', asyncHandler(controller.mountAllComponents));

// POST /api/production-batches/:id/units/:unitId/components/:componentId/defective - Marcar defeituoso
router.post('/:id/units/:unitId/components/:componentId/defective', asyncHandler(controller.markComponentDefective));

// ============================================
// UNIT TESTS
// ============================================

// GET /api/production-batches/:id/units/:unitId/tests - Listar testes da unidade
router.get('/:id/units/:unitId/tests', asyncHandler(controller.findTestsByUnitId));

// ============================================
// HISTORY
// ============================================

// GET /api/production-batches/:id/history - Histórico do lote
router.get('/:id/history', asyncHandler(controller.getBatchHistory));

// GET /api/production-batches/:id/units/:unitId/history - Histórico da unidade
router.get('/:id/units/:unitId/history', asyncHandler(controller.getUnitHistory));

// ============================================
// SUMMARIES
// ============================================

// GET /api/production-batches/:id/summary - Resumo do lote
router.get('/:id/summary', asyncHandler(controller.getBatchSummary));

// GET /api/production-batches/:id/units-summary - Resumo das unidades do lote
router.get('/:id/units-summary', asyncHandler(controller.getUnitsSummary));

// ============================================
// COMPONENT RELEASE (Liberação de Componentes do Estoque)
// ============================================

// GET /api/production-batches/:id/release-components - Componentes disponíveis para liberação
router.get('/:id/release-components', asyncHandler(controller.getComponentsForRelease));

// GET /api/production-batches/:id/release-summary - Resumo de liberações por componente
router.get('/:id/release-summary', asyncHandler(controller.getReleaseSummary));

// GET /api/production-batches/:id/release-history - Histórico de liberações
router.get('/:id/release-history', asyncHandler(controller.getReleaseHistory));

// POST /api/production-batches/components/:componentId/release - Liberar um componente do estoque
router.post('/components/:componentId/release', asyncHandler(controller.releaseComponent));

// POST /api/production-batches/:id/release-multiple - Liberar múltiplos componentes
router.post('/:id/release-multiple', asyncHandler(controller.releaseMultipleComponents));

// POST /api/production-batches/:id/sync-bom - Sincronizar componentes do BOM com as unidades
router.post('/:id/sync-bom', asyncHandler(controller.syncBOMComponents));

export default router;
