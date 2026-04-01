import { Router } from 'express';
import { PurchaseRequestsController } from '../controllers/purchase-requests.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new PurchaseRequestsController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/v1/purchase-requests - List all requests
router.get('/', controller.findMany);

// GET /api/v1/purchase-requests/:id - Get request by ID
router.get('/:id', controller.findById);

// POST /api/v1/purchase-requests - Create new request
router.post('/', controller.create);

// PUT /api/v1/purchase-requests/:id - Update request
router.put('/:id', controller.update);

// POST /api/v1/purchase-requests/:id/review - Review (approve/reject) request
router.post('/:id/review', controller.review);

// POST /api/v1/purchase-requests/:id/convert - Convert to purchase order
router.post('/:id/convert', controller.convertToPurchaseOrder);

// DELETE /api/v1/purchase-requests/:id - Delete request (ADMIN only)
router.delete('/:id', authorize(['OWNER', 'ADMIN']), controller.delete);

// GET /api/v1/purchase-requests/:id/items - Get request items
router.get('/:id/items', controller.getItems);

export default router;
