import { Router } from 'express';
import { SellersController } from '../controllers/sellers.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new SellersController();

router.use(authenticate);
router.use(authorize(['OWNER', 'DIRECTOR', 'MANAGER']));

router.get('/stats', controller.getStats);
router.get('/comparison', controller.getComparison);
router.get('/:id/stats', controller.getSellerStats);

export default router;
