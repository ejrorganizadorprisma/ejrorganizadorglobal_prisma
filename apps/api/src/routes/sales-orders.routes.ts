import { Router } from 'express';
import { SalesOrdersController } from '../controllers/sales-orders.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SalesOrdersController();

router.use(authenticate);

// Rotas específicas antes de /:id
router.post('/convert-from-quote', controller.convertFromQuote);
router.post('/:id/convert-to-sale', controller.convertToSale);
router.post('/:id/cancel', controller.cancel);

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
