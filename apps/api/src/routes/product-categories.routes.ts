import { Router } from 'express';
import { ProductCategoriesController } from '../controllers/product-categories.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new ProductCategoriesController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas de categorias de produtos
router.get('/', controller.getAll.bind(controller));
router.get('/active', controller.getActive.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
