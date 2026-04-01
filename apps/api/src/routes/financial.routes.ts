import { Router } from 'express';
import { FinancialController } from '../controllers/financial.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new FinancialController();

// Aplicar autenticação em todas as rotas
router.use(authenticate);

// GET /api/v1/financial/summary
router.get('/summary', controller.getSummary);

// GET /api/v1/financial/cash-flow?days=30
router.get('/cash-flow', controller.getCashFlow);

// GET /api/v1/financial/calendar?month=2026-03
router.get('/calendar', controller.getCalendar);

// GET /api/v1/financial/receivables
router.get('/receivables', controller.getReceivables);

// GET /api/v1/financial/payables
router.get('/payables', controller.getPayables);

// GET /api/v1/financial/debtors
router.get('/debtors', controller.getDebtors);

export default router;
