import { Router } from 'express';
import { GoodsReceiptsController } from '../controllers/goods-receipts.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new GoodsReceiptsController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/goods-receipts - Listar recebimentos com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/goods-receipts/pending-inspections - Listar recebimentos pendentes de inspeção
router.get('/pending-inspections', asyncHandler(controller.getPendingInspections));

// GET /api/goods-receipts/supplier/:supplierId - Listar recebimentos por fornecedor
router.get('/supplier/:supplierId', asyncHandler(controller.getReceiptsBySupplier));

// GET /api/goods-receipts/purchase-order/:purchaseOrderId - Listar recebimentos por ordem de compra
router.get('/purchase-order/:purchaseOrderId', asyncHandler(controller.getReceiptsByPurchaseOrder));

// GET /api/goods-receipts/:id - Buscar recebimento por ID
router.get('/:id', asyncHandler(controller.findById));

// GET /api/goods-receipts/number/:receiptNumber - Buscar recebimento por número
router.get('/number/:receiptNumber', asyncHandler(controller.findByReceiptNumber));

// POST /api/goods-receipts - Criar novo recebimento
router.post('/', asyncHandler(controller.create));

// PATCH /api/goods-receipts/:id - Atualizar recebimento
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/goods-receipts/:id - Excluir recebimento
router.delete('/:id', asyncHandler(controller.delete));

// PATCH /api/goods-receipts/:id/status - Atualizar status do recebimento
router.patch('/:id/status', asyncHandler(controller.updateStatus));

// POST /api/goods-receipts/:id/approve - Aprovar recebimento (atualiza estoque)
router.post('/:id/approve', asyncHandler(controller.approveReceipt));

// POST /api/goods-receipts/:id/reject - Rejeitar recebimento
router.post('/:id/reject', asyncHandler(controller.rejectReceipt));

// Rotas de itens
// GET /api/goods-receipts/:id/items - Listar itens do recebimento
router.get('/:id/items', asyncHandler(controller.getItems));

// POST /api/goods-receipts/:id/items - Adicionar item ao recebimento
router.post('/:id/items', asyncHandler(controller.addItem));

// PATCH /api/goods-receipts/items/:itemId - Atualizar item do recebimento
router.patch('/items/:itemId', asyncHandler(controller.updateItem));

// DELETE /api/goods-receipts/items/:itemId - Remover item do recebimento
router.delete('/items/:itemId', asyncHandler(controller.deleteItem));

// POST /api/goods-receipts/items/:itemId/inspect - Inspecionar item (controle de qualidade)
router.post('/items/:itemId/inspect', asyncHandler(controller.inspectItem));

export default router;
