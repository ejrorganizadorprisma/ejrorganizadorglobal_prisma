import { Router } from 'express';
import { ServiceOrdersController } from '../controllers/service-orders.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ServiceOrdersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/service-orders - Listar ordens de serviço com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/service-orders/stats - Estatísticas das ordens de serviço
router.get('/stats', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    },
  });
}));

// GET /api/service-orders/status/:status - Listar OSs por status
router.get('/status/:status', asyncHandler(controller.getByStatus));

// GET /api/service-orders/customer/:customerId - Listar OSs de um cliente
router.get('/customer/:customerId', asyncHandler(controller.getByCustomer));

// GET /api/service-orders/:id - Buscar OS por ID com relacionamentos
router.get('/:id', asyncHandler(controller.findById));

// POST /api/service-orders - Criar nova ordem de serviço
router.post('/', asyncHandler(controller.create));

// PUT /api/service-orders/:id - Atualizar ordem de serviço
router.put('/:id', asyncHandler(controller.update));

// DELETE /api/service-orders/:id - Excluir ordem de serviço
router.delete('/:id', asyncHandler(controller.delete));

// POST /api/service-orders/:id/parts - Adicionar peça à OS
router.post('/:id/parts', asyncHandler(controller.addPart));

// DELETE /api/service-orders/:id/parts/:partId - Remover peça da OS
router.delete('/:id/parts/:partId', asyncHandler(controller.removePart));

// POST /api/service-orders/:id/complete - Completar ordem de serviço
router.post('/:id/complete', asyncHandler(controller.complete));

export default router;
