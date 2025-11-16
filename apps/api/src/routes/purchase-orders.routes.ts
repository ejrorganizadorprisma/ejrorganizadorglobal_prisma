import { Router } from 'express';
import { PurchaseOrdersController } from '../controllers/purchase-orders.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new PurchaseOrdersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/purchase-orders - Listar ordens de compra com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/purchase-orders/pending - Listar ordens pendentes
router.get('/pending', asyncHandler(controller.getPendingOrders));

// GET /api/purchase-orders/pending-delivery - Listar ordens com entrega atrasada
router.get('/pending-delivery', asyncHandler(controller.getOrdersWithPendingDelivery));

// GET /api/purchase-orders/supplier/:supplierId - Listar ordens por fornecedor
router.get('/supplier/:supplierId', asyncHandler(controller.getOrdersBySupplier));

// GET /api/purchase-orders/:id - Buscar ordem por ID
router.get('/:id', asyncHandler(controller.findById));

// GET /api/purchase-orders/number/:orderNumber - Buscar ordem por número
router.get('/number/:orderNumber', asyncHandler(controller.findByOrderNumber));

// POST /api/purchase-orders - Criar nova ordem de compra
router.post('/', asyncHandler(controller.create));

// PATCH /api/purchase-orders/:id - Atualizar ordem de compra
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/purchase-orders/:id - Excluir ordem de compra
router.delete('/:id', asyncHandler(controller.delete));

// PATCH /api/purchase-orders/:id/status - Atualizar status da ordem
router.patch('/:id/status', asyncHandler(controller.updateStatus));

// POST /api/purchase-orders/:id/send - Enviar ordem ao fornecedor
router.post('/:id/send', asyncHandler(controller.sendOrder));

// POST /api/purchase-orders/:id/confirm - Confirmar recebimento da ordem pelo fornecedor
router.post('/:id/confirm', asyncHandler(controller.confirmOrder));

// POST /api/purchase-orders/:id/cancel - Cancelar ordem
router.post('/:id/cancel', asyncHandler(controller.cancelOrder));

// POST /api/purchase-orders/:id/approve - Aprovar ordem
router.post('/:id/approve', asyncHandler(controller.approveOrder));

// Rotas de itens
// GET /api/purchase-orders/:id/items - Listar itens da ordem
router.get('/:id/items', asyncHandler(controller.getItems));

// POST /api/purchase-orders/:id/items - Adicionar item à ordem
router.post('/:id/items', asyncHandler(controller.addItem));

// PATCH /api/purchase-orders/items/:itemId - Atualizar item da ordem
router.patch('/items/:itemId', asyncHandler(controller.updateItem));

// DELETE /api/purchase-orders/items/:itemId - Remover item da ordem
router.delete('/items/:itemId', asyncHandler(controller.deleteItem));

export default router;
