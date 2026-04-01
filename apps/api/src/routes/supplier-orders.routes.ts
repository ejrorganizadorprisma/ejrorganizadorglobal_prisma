import { Router } from 'express';
import { SupplierOrdersController } from '../controllers/supplier-orders.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new SupplierOrdersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listagem e busca
router.get('/', asyncHandler(controller.findMany));
router.get('/group/:groupCode', asyncHandler(controller.findByGroupCode));
router.get('/purchase-order/:purchaseOrderId', asyncHandler(controller.findByPurchaseOrderId));
router.get('/:id', asyncHandler(controller.findById));
router.get('/:id/items', asyncHandler(controller.getItems));

// Gerar pedidos a partir de uma OC
router.post('/generate', asyncHandler(controller.generateFromPurchaseOrder));

// Atualização
router.patch('/:id', asyncHandler(controller.update));

// Ações de workflow
router.post('/:id/send', asyncHandler(controller.send));
router.post('/:id/confirm', asyncHandler(controller.confirm));
router.post('/:id/cancel', asyncHandler(controller.cancel));

// Exclusão (apenas OWNER/ADMIN)
router.delete('/:id', authorize(['OWNER', 'ADMIN']), asyncHandler(controller.delete));

export default router;
