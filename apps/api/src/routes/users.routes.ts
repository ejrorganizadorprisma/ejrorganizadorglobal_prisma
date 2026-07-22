import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new UsersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Mutações de usuário SÓ para admins (fecha escalada de privilégio / sequestro de conta)
const adminOnly = authorize(['OWNER', 'DIRECTOR', 'MANAGER']);

// GET /api/v1/users - Listar usuários com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/v1/users/:id - Buscar usuário por ID
router.get('/:id', asyncHandler(controller.findById));

// PATCH /api/v1/users/:id - Atualizar usuário
router.patch('/:id', adminOnly, asyncHandler(controller.update));

// PATCH /api/v1/users/:id/toggle-status - Ativar/Desativar usuário
router.patch('/:id/toggle-status', adminOnly, asyncHandler(controller.toggleStatus));

// DELETE /api/v1/users/:id - Excluir usuário
router.delete('/:id', adminOnly, asyncHandler(controller.delete));

export default router;
