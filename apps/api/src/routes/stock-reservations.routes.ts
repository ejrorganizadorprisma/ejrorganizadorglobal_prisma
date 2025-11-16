import { Router } from 'express';
import { StockReservationsController } from '../controllers/stock-reservations.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new StockReservationsController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/stock-reservations - Listar reservas com paginação e filtros
router.get('/', asyncHandler(controller.findMany));

// GET /api/stock-reservations/product/:productId - Buscar reservas por produto
router.get('/product/:productId', asyncHandler(controller.getByProduct));

// GET /api/stock-reservations/product/:productId/total - Total reservado de um produto
router.get('/product/:productId/total', asyncHandler(controller.getTotalReserved));

// POST /api/stock-reservations/cancel-expired - Cancelar reservas expiradas
router.post('/cancel-expired', asyncHandler(controller.cancelExpired));

// GET /api/stock-reservations/:id - Buscar reserva por ID
router.get('/:id', asyncHandler(controller.findById));

// POST /api/stock-reservations - Criar nova reserva
router.post('/', asyncHandler(controller.create));

// PATCH /api/stock-reservations/:id - Atualizar reserva
router.patch('/:id', asyncHandler(controller.update));

// DELETE /api/stock-reservations/:id - Excluir reserva
router.delete('/:id', asyncHandler(controller.delete));

// POST /api/stock-reservations/:id/consume - Consumir reserva
router.post('/:id/consume', asyncHandler(controller.consumeReservation));

// POST /api/stock-reservations/:id/cancel - Cancelar reserva
router.post('/:id/cancel', asyncHandler(controller.cancelReservation));

export default router;
