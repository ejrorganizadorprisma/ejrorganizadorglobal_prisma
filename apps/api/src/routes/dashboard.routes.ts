import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);
router.get('/overview', controller.getCompleteOverview);
router.get('/metrics', controller.getMetrics);

export default router;
