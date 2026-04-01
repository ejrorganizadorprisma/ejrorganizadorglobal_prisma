import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as controller from '../controllers/purchase-budgets.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== BUDGETS ====================

// GET /api/v1/purchase-budgets - List all budgets
router.get('/', controller.findMany);

// GET /api/v1/purchase-budgets/last-price?productId=X&supplierId=Y - Último preço do produto com fornecedor
router.get('/last-price', controller.getLastPrice);

// GET /api/v1/purchase-budgets/:id - Get budget by ID (with items and quotes)
router.get('/:id', controller.findById);

// POST /api/v1/purchase-budgets - Create new budget
router.post('/', controller.create);

// PUT /api/v1/purchase-budgets/:id - Update budget (only DRAFT)
router.put('/:id', controller.update);

// DELETE /api/v1/purchase-budgets/:id - Delete budget
router.delete('/:id', controller.remove);

// ==================== STATUS TRANSITIONS ====================

// POST /api/v1/purchase-budgets/:id/submit - Submit for approval (DRAFT → PENDING)
router.post('/:id/submit', controller.submit);

// POST /api/v1/purchase-budgets/:id/approve - Approve (PENDING → ORDERED)
router.post('/:id/approve', controller.approve);

// POST /api/v1/purchase-budgets/:id/reject - Reject (PENDING → REJECTED)
router.post('/:id/reject', controller.reject);

// POST /api/v1/purchase-budgets/:id/reopen - Reopen (REJECTED → DRAFT)
router.post('/:id/reopen', controller.reopen);

// POST /api/v1/purchase-budgets/:id/purchase - Mark as purchased (ORDERED → PURCHASED)
router.post('/:id/purchase', controller.purchase);

// POST /api/v1/purchase-budgets/:id/cancel - Cancel budget
router.post('/:id/cancel', controller.cancel);

// PUT /api/v1/purchase-budgets/:id/installments/:installmentId/pay - Mark installment as paid
router.put('/:id/installments/:installmentId/pay', controller.payInstallment);

// ==================== ITEMS ====================

// GET /api/v1/purchase-budgets/:id/items - Get budget items
router.get('/:id/items', controller.getItems);

// POST /api/v1/purchase-budgets/:id/items - Add item to budget
router.post('/:id/items', controller.addItem);

// PUT /api/v1/purchase-budgets/items/:itemId - Update item
router.put('/items/:itemId', controller.updateItem);

// DELETE /api/v1/purchase-budgets/items/:itemId - Delete item
router.delete('/items/:itemId', controller.deleteItem);

// POST /api/v1/purchase-budgets/items/:itemId/select-quote/:quoteId - Select quote for item
router.post('/items/:itemId/select-quote/:quoteId', controller.selectQuote);

// ==================== QUOTES ====================

// GET /api/v1/purchase-budgets/items/:itemId/quotes - Get quotes for item
router.get('/items/:itemId/quotes', controller.getQuotes);

// POST /api/v1/purchase-budgets/items/:itemId/quotes - Add quote to item
router.post('/items/:itemId/quotes', controller.addQuote);

// PUT /api/v1/purchase-budgets/quotes/:quoteId - Update quote
router.put('/quotes/:quoteId', controller.updateQuote);

// DELETE /api/v1/purchase-budgets/quotes/:quoteId - Delete quote
router.delete('/quotes/:quoteId', controller.deleteQuote);

export default router;
