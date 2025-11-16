import { Router } from 'express';
import { ProductsController } from '../controllers/products.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ProductsController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/products - Listar produtos com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/products/categories - Listar categorias únicas
router.get('/categories', asyncHandler(controller.getCategories));

// GET /api/products/low-stock - Listar produtos com estoque baixo
router.get('/low-stock', asyncHandler(controller.getLowStock));

// GET /api/products/components - Listar apenas componentes
router.get('/components', asyncHandler(controller.getComponents));

// GET /api/products/final-products - Listar apenas produtos finais
router.get('/final-products', asyncHandler(controller.getFinalProducts));

// GET /api/products/:id - Buscar produto por ID
router.get('/:id', asyncHandler(controller.findById));

// GET /api/products/code/:code - Buscar produto por código
router.get('/code/:code', asyncHandler(controller.findByCode));

// POST /api/products - Criar novo produto
router.post('/', asyncHandler(controller.create));

// PATCH /api/products/:id - Atualizar produto
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/products/:id - Excluir produto
router.delete('/:id', asyncHandler(controller.delete));

// PATCH /api/products/:id/stock - Atualizar estoque
router.patch('/:id/stock', asyncHandler(controller.updateStock));

export default router;
