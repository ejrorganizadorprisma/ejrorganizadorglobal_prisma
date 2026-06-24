import { Router } from 'express';
import multer from 'multer';
import { SupplierOrdersController } from '../controllers/supplier-orders.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new SupplierOrdersController();

// Upload de NF (PDF/imagem) — memória, até 10MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Todas as rotas requerem autenticação
router.use(authenticate);

// Anexar Nota Fiscal ao pedido (PDF ou imagem)
router.post('/:id/invoice-file', upload.single('file'), asyncHandler(controller.uploadInvoiceFile));

// Listagem e busca
router.get('/', asyncHandler(controller.findMany));
router.get('/group/:groupCode', asyncHandler(controller.findByGroupCode));
router.get('/purchase-order/:purchaseOrderId', asyncHandler(controller.findByPurchaseOrderId));
router.get('/:id', asyncHandler(controller.findById));
router.get('/:id/items', asyncHandler(controller.getItems));

// Gerar pedidos a partir de uma OC
router.post('/generate', asyncHandler(controller.generateFromPurchaseOrder));

// Itens do pedido (editar qtd/preço/desconto/obs ou remover) — antes de /:id
router.patch('/items/:itemId', asyncHandler(controller.updateItem));
router.delete('/items/:itemId', asyncHandler(controller.deleteItem));

// Atualização
router.patch('/:id', asyncHandler(controller.update));

// Ações de workflow
router.post('/:id/send', asyncHandler(controller.send));
router.post('/:id/confirm', asyncHandler(controller.confirm));
router.post('/:id/cancel', asyncHandler(controller.cancel));

// Exclusão (apenas OWNER/ADMIN)
router.delete('/:id', authorize(['OWNER', 'ADMIN']), asyncHandler(controller.delete));

export default router;
