import { Router } from 'express';
import { QuotesController } from '../controllers/quotes.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new QuotesController();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/status', controller.updateStatus);

export default router;
