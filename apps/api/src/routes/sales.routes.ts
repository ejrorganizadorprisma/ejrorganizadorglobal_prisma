import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SalesController();

router.use(authenticate);
router.post('/convert', controller.convertQuote);

export default router;
