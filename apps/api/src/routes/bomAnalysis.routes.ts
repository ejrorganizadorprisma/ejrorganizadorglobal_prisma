import { Router } from 'express';
import { BOMAnalysisController } from '../controllers/bomAnalysis.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new BOMAnalysisController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/bom-analysis/explode/:productId - Explosão do BOM
// Query params: quantity (number, obrigatório)
// Retorna lista detalhada de todos os materiais necessários com quantidades e custos
router.get('/explode/:productId', asyncHandler(controller.explodeBOM));

// GET /api/bom-analysis/check-availability/:productId - Verificar disponibilidade
// Query params: quantity (number, obrigatório)
// Retorna se é possível montar o produto e disponibilidade de cada material
router.get('/check-availability/:productId', asyncHandler(controller.checkAvailability));

// GET /api/bom-analysis/suggest-purchases/:productId - Sugerir compras
// Query params: quantity (number, obrigatório)
// Retorna lista de materiais faltantes que precisam ser comprados
router.get('/suggest-purchases/:productId', asyncHandler(controller.suggestPurchases));

export default router;
