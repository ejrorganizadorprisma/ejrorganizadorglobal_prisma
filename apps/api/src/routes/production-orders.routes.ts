import { Router } from 'express';
import { ProductionOrdersController } from '../controllers/production-orders.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ProductionOrdersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/production-orders - Listar ordens de produção com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/production-orders/:id - Buscar ordem por ID
router.get('/:id', asyncHandler(controller.findById));

// POST /api/production-orders - Criar nova ordem
router.post('/', asyncHandler(controller.create));

// PATCH /api/production-orders/:id - Atualizar ordem
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/production-orders/:id - Excluir ordem
router.delete('/:id', asyncHandler(controller.delete));

// GET /api/production-orders/:id/materials - Listar consumo de materiais
router.get('/:id/materials', asyncHandler(controller.getMaterialConsumption));

// GET /api/production-orders/:id/operations - Listar operações
router.get('/:id/operations', asyncHandler(controller.getOperations));

// GET /api/production-orders/:id/reportings - Listar apontamentos
router.get('/:id/reportings', asyncHandler(controller.getReportings));

// POST /api/production-orders/:id/release - Liberar ordem para produção
router.post('/:id/release', asyncHandler(controller.release));

// POST /api/production-orders/:id/report - Apontar produção
router.post('/:id/report', asyncHandler(controller.report));

// POST /api/production-orders/:id/complete - Completar ordem
router.post('/:id/complete', asyncHandler(controller.complete));

// POST /api/production-orders/:id/pause - Pausar ordem
router.post('/:id/pause', asyncHandler(controller.pause));

// POST /api/production-orders/:id/resume - Retomar ordem pausada
router.post('/:id/resume', asyncHandler(controller.resume));

// POST /api/production-orders/:id/cancel - Cancelar ordem
router.post('/:id/cancel', asyncHandler(controller.cancel));

export default router;
