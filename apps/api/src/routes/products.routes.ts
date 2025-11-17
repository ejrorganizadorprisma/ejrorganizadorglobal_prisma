import { Router } from 'express';
import { ProductsController } from '../controllers/products.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import multer from 'multer';

const router = Router();
const controller = new ProductsController();

// Configure multer para armazenar em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
});

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

// POST /api/products/upload-image - Upload de imagem (DEVE VIR ANTES DE /:id)
router.post('/upload-image', upload.single('image'), asyncHandler(controller.uploadImage));

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
