import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SalesController();

// Aplicar autenticação em todas as rotas
router.use(authenticate);

// GET /api/v1/sales/stats - deve vir antes de /:id
router.get('/stats', controller.getSaleStats);

// GET /api/v1/sales
router.get('/', controller.getSales);

// POST /api/v1/sales/convert-from-quote
router.post('/convert-from-quote', controller.convertFromQuote);

// POST /api/v1/sales
router.post('/', controller.createSale);

// GET /api/v1/sales/:id
router.get('/:id', controller.getSale);

// PUT /api/v1/sales/:id
router.put('/:id', controller.updateSale);

// DELETE /api/v1/sales/:id
router.delete('/:id', controller.deleteSale);

// POST /api/v1/sales/:id/payments
router.post('/:id/payments', controller.addPayment);

// PUT /api/v1/sales/:id/payments/:paymentId
router.put('/:id/payments/:paymentId', controller.updatePayment);

export default router;
