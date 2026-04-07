import { Router } from 'express';
import { CustomersController } from '../controllers/customers.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new CustomersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/customers - Listar clientes com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/customers/:id - Buscar cliente por ID
router.get('/:id', asyncHandler(controller.findById));

// GET /api/customers/document/:document - Buscar cliente por documento
router.get('/document/:document', asyncHandler(controller.findByDocument));

// POST /api/customers - Criar novo cliente
router.post('/', asyncHandler(controller.create));

// PATCH /api/customers/:id - Atualizar cliente
router.patch('/:id', asyncHandler(controller.update));

// POST /api/customers/:id/approve - Aprovar cliente pendente (admin)
router.post('/:id/approve', asyncHandler(controller.approve));

// POST /api/customers/:id/reject - Rejeitar cliente pendente (admin)
router.post('/:id/reject', asyncHandler(controller.reject));

// DELETE /api/customers/:id - Excluir cliente (soft delete)
router.delete('/:id', asyncHandler(controller.delete));

export default router;
