import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new UsersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/v1/users - Listar usuários com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/v1/users/:id - Buscar usuário por ID
router.get('/:id', asyncHandler(controller.findById));

// PATCH /api/v1/users/:id - Atualizar usuário
router.patch('/:id', asyncHandler(controller.update));

// PATCH /api/v1/users/:id/toggle-status - Ativar/Desativar usuário
router.patch('/:id/toggle-status', asyncHandler(controller.toggleStatus));

// DELETE /api/v1/users/:id - Excluir usuário
router.delete('/:id', asyncHandler(controller.delete));

export default router;
