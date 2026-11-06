import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { PosService } from '../services/pos.service';

/**
 * PDV / Caixa — /api/v1/pos
 * Operador de Caixa (CASHIER) + OWNER/DIRECTOR/MANAGER.
 */
const router = Router();
const service = new PosService();

router.use(authenticate);
router.use(authorize(['OWNER', 'DIRECTOR', 'MANAGER', 'CASHIER']));

const handle =
  (fn: (req: AuthRequest) => Promise<any>, status = 200) =>
  (req: AuthRequest, res: Response, next: NextFunction) =>
    fn(req)
      .then((data) => res.status(status).json({ success: true, data }))
      .catch(next);

const user = (req: AuthRequest) => ({ id: req.user!.id, role: req.user!.role });

// Caixa aberto do operador logado (null se nenhum)
router.get('/session/current', handle((req) => service.currentSession(user(req))));

// Histórico de turnos
router.get('/sessions', handle((req) => service.listSessions(user(req), Number(req.query.limit) || 30)));

// Abrir caixa { openingAmount }
router.post('/session/open', handle((req) => service.openSession(user(req), req.body?.openingAmount), 201));

// Totais do turno
router.get('/session/:id/totals', handle((req) => service.totalsFor(user(req), req.params.id)));

// Vendas do turno
router.get('/session/:id/sales', handle((req) => service.sessionSales(user(req), req.params.id)));

// Sangria / suprimento { type: 'WITHDRAWAL'|'SUPPLY', amount, reason }
router.post(
  '/session/:id/movements',
  handle((req) => service.addMovement(user(req), req.params.id, req.body?.type, req.body?.amount, req.body?.reason), 201)
);

// Fechar caixa { countedCash, notes }
router.post(
  '/session/:id/close',
  handle((req) => service.closeSession(user(req), req.params.id, req.body?.countedCash, req.body?.notes))
);

// Busca exata por código de barras / código (scanner)
router.get('/products/lookup', handle((req) => service.lookupProduct(String(req.query.code || ''))));

// Vincular código de barras a um produto { barcode } (gerentes)
router.post('/products/:id/barcode', handle((req) => service.setBarcode(user(req), req.params.id, req.body?.barcode)));

// Cadastro rápido de produto com o código lido (gerentes)
router.post('/products/quick', handle((req) => service.quickCreateProduct(user(req), req.body || {}), 201));

// Finalizar venda
router.post('/sales', handle((req) => service.createSale(user(req), req.body || {}), 201));

// Cupom de uma venda do PDV
router.get('/sales/:id/receipt', handle((req) => service.receipt(user(req), req.params.id)));

export default router;
