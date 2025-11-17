import { Router } from 'express';
import { ProductSuppliersController } from '../controllers/product-suppliers.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ProductSuppliersController();

router.use(authenticate);

// GET /api/products/:productId/suppliers - Listar fornecedores de um produto
router.get('/:productId/suppliers', asyncHandler(controller.findByProductId));

// POST /api/products/:productId/suppliers - Vincular fornecedor ao produto
router.post('/:productId/suppliers', asyncHandler(controller.create));

// PUT /api/product-suppliers/:id - Atualizar relacionamento produto-fornecedor
router.put('/product-suppliers/:id', asyncHandler(controller.update));

// DELETE /api/product-suppliers/:id - Desvincular fornecedor do produto
router.delete('/product-suppliers/:id', asyncHandler(controller.delete));

// GET /api/suppliers/:supplierId/products - Listar produtos de um fornecedor
router.get('/suppliers/:supplierId/products', asyncHandler(controller.findBySupplierId));

export default router;
