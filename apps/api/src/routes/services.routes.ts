import { Router } from 'express';
import { ServicesController } from '../controllers/services.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ServicesController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/services - Listar serviços com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/services/:id - Buscar serviço por ID
router.get('/:id', asyncHandler(controller.findById));

// GET /api/services/code/:code - Buscar serviço por código
router.get('/code/:code', asyncHandler(controller.findByCode));

// POST /api/services - Criar novo serviço
router.post('/', asyncHandler(controller.create));

// PATCH /api/services/:id - Atualizar serviço
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/services/:id - Excluir serviço
router.delete('/:id', asyncHandler(controller.delete));

export default router;
