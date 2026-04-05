import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new ReportsController();

router.use(authenticate);
router.use(authorize(['OWNER', 'DIRECTOR', 'MANAGER', 'COORDINATOR', 'MONITOR']));

// Legacy endpoints
router.get('/sales', controller.getSalesReport);
router.get('/inventory', controller.getInventoryReport);

// New category endpoints
router.get('/suppliers', controller.getSuppliersReport);
router.get('/products', controller.getProductsReport);
router.get('/customers', controller.getCustomersReport);
router.get('/sales-report', controller.getSalesReportV2);
router.get('/financial-report', controller.getFinancialReport);
router.get('/purchases', controller.getPurchasesReport);
router.get('/orders', controller.getOrdersReport);
router.get('/production', controller.getProductionReport);
router.get('/service-orders', controller.getServiceOrdersReport);

export default router;
