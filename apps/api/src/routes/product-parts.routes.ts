import { Router } from 'express';
import { ProductPartsController } from '../controllers/product-parts.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ProductPartsController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/products/:productId/parts - Listar peças de um produto
router.get('/:productId/parts', asyncHandler(controller.findByProductId));

// GET /api/products/:productId/bom - Explosão BOM (Bill of Materials)
router.get('/:productId/bom', asyncHandler(controller.getBOM));

// GET /api/products/:productId/can-assemble - Verificar disponibilidade para montagem
router.get('/:productId/can-assemble', asyncHandler(controller.checkAvailability));

// POST /api/products/:productId/parts - Adicionar peça ao produto
router.post('/:productId/parts', asyncHandler(controller.addPart));

// PUT /api/products/:productId/parts/:productPartId - Atualizar quantidade/opcional
router.put('/:productId/parts/:productPartId', asyncHandler(controller.updatePart));

// DELETE /api/products/:productId/parts/:productPartId - Remover peça do produto
router.delete('/:productId/parts/:productPartId', asyncHandler(controller.removePart));

export default router;
