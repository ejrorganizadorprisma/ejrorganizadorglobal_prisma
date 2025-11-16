import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new ReportsController();

router.use(authenticate);
router.use(authorize(['OWNER', 'DIRECTOR', 'MANAGER']));

router.get('/sales', controller.getSalesReport);
router.get('/inventory', controller.getInventoryReport);

export default router;
