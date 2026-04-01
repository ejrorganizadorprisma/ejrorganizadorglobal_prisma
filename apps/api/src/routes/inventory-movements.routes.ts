import { Router } from 'express';
import { InventoryMovementsController } from '../controllers/inventory-movements.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new InventoryMovementsController();

router.use(authenticate);

router.get('/product/:productId', async (req, res, next) => {
  try {
    await controller.findByProduct(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
