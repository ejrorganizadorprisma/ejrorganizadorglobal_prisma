import { Router } from 'express';
import multer from 'multer';
import { SalesController } from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SalesController();

// Upload de NF de saída / recibo de coleta (PDF/imagem) — memória, até 10MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

// Faturamento / Expedição / Coleta
router.post('/:id/invoice', controller.invoice);
router.post('/:id/invoice-file', upload.single('file'), controller.uploadNfFile);
router.post('/:id/expedition', controller.expedition);
router.post('/:id/collect', controller.collect);
router.post('/:id/collection-receipt', upload.single('file'), controller.uploadCollectionReceipt);

// POST /api/v1/sales/:id/payments
router.post('/:id/payments', controller.addPayment);

// PUT /api/v1/sales/:id/payments/:paymentId
router.put('/:id/payments/:paymentId', controller.updatePayment);

export default router;
