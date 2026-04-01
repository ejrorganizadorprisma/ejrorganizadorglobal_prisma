import { Router } from 'express';
import { DigitalFabricationController } from '../controllers/digital-fabrication.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new DigitalFabricationController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============================================
// DASHBOARD & STATS
// ============================================

// GET /api/digital-fabrication/dashboard - Estatísticas do dashboard
router.get('/dashboard', asyncHandler(controller.getDashboardStats));

// GET /api/digital-fabrication/summaries - Resumos dos lotes
router.get('/summaries', asyncHandler(controller.getBatchSummaries));

// ============================================
// MACHINES
// ============================================

// GET /api/digital-fabrication/machines - Listar máquinas
router.get('/machines', asyncHandler(controller.findAllMachines));

// GET /api/digital-fabrication/machines/:id - Buscar máquina por ID
router.get('/machines/:id', asyncHandler(controller.findMachineById));

// POST /api/digital-fabrication/machines - Criar máquina
router.post('/machines', asyncHandler(controller.createMachine));

// PATCH /api/digital-fabrication/machines/:id - Atualizar máquina
router.patch('/machines/:id', asyncHandler(controller.updateMachine));

// DELETE /api/digital-fabrication/machines/:id - Excluir máquina
router.delete('/machines/:id', asyncHandler(controller.deleteMachine));

// ============================================
// BATCHES
// ============================================

// GET /api/digital-fabrication/batches - Listar lotes
router.get('/batches', asyncHandler(controller.findManyBatches));

// GET /api/digital-fabrication/batches/:id - Buscar lote por ID
router.get('/batches/:id', asyncHandler(controller.findBatchById));

// POST /api/digital-fabrication/batches - Criar lote
router.post('/batches', asyncHandler(controller.createBatch));

// PATCH /api/digital-fabrication/batches/:id - Atualizar lote
router.patch('/batches/:id', asyncHandler(controller.updateBatch));

// DELETE /api/digital-fabrication/batches/:id - Excluir lote
router.delete('/batches/:id', asyncHandler(controller.deleteBatch));

// ============================================
// BATCH LIFECYCLE
// ============================================

// POST /api/digital-fabrication/batches/:id/start - Iniciar lote
router.post('/batches/:id/start', asyncHandler(controller.startBatch));

// POST /api/digital-fabrication/batches/:id/pause - Pausar lote
router.post('/batches/:id/pause', asyncHandler(controller.pauseBatch));

// POST /api/digital-fabrication/batches/:id/resume - Retomar lote
router.post('/batches/:id/resume', asyncHandler(controller.resumeBatch));

// POST /api/digital-fabrication/batches/:id/complete - Completar lote
router.post('/batches/:id/complete', asyncHandler(controller.completeBatch));

// POST /api/digital-fabrication/batches/:id/cancel - Cancelar lote
router.post('/batches/:id/cancel', asyncHandler(controller.cancelBatch));

// POST /api/digital-fabrication/batches/:id/fail - Marcar como falhou
router.post('/batches/:id/fail', asyncHandler(controller.failBatch));

// ============================================
// BATCH ITEMS
// ============================================

// GET /api/digital-fabrication/batches/:id/items - Listar itens do lote
router.get('/batches/:id/items', asyncHandler(controller.findItemsByBatchId));

// GET /api/digital-fabrication/batches/:id/items/:itemId - Buscar item
router.get('/batches/:id/items/:itemId', asyncHandler(controller.findItemById));

// POST /api/digital-fabrication/items - Criar item (batchId no body)
router.post('/items', asyncHandler(controller.createItem));

// PATCH /api/digital-fabrication/items/:itemId - Atualizar item
router.patch('/items/:itemId', asyncHandler(controller.updateItem));

// DELETE /api/digital-fabrication/items/:itemId - Excluir item
router.delete('/items/:itemId', asyncHandler(controller.deleteItem));

// POST /api/digital-fabrication/items/:itemId/complete - Completar item
router.post('/items/:itemId/complete', asyncHandler(controller.completeItem));

// ============================================
// MATERIAL CONSUMPTION
// ============================================

// GET /api/digital-fabrication/batches/:id/consumption - Listar consumo do lote
router.get('/batches/:id/consumption', asyncHandler(controller.findConsumptionByBatchId));

// POST /api/digital-fabrication/consumption - Registrar consumo de material
router.post('/consumption', asyncHandler(controller.registerConsumption));

// ============================================
// HISTORY
// ============================================

// GET /api/digital-fabrication/batches/:id/history - Histórico do lote
router.get('/batches/:id/history', asyncHandler(controller.findHistoryByBatchId));

export default router;
