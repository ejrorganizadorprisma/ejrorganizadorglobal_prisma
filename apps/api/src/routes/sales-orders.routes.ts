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
router.post('/:id/receive', controller.receive);
// Separação no Estoque
router.get('/separation/queue', controller.separationQueue);
router.post('/:id/release-separation', controller.releaseSeparation);
router.post('/:id/claim-separation', controller.claimSeparation);
router.post('/:id/postpone-separation', controller.postponeSeparation);
router.post('/:id/separate', controller.separate);
router.post('/:id/return-to-separation', controller.returnToSeparation);
router.get('/:id/separation-events', controller.separationEvents);
router.post('/:id/approve', controller.approve);
router.post('/:id/to-deliver', controller.toDeliver);
router.post('/:id/mark-delivered', controller.markDelivered);
router.post('/:id/complete', controller.complete);
router.get('/:id/conversions', controller.conversions);

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
