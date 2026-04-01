import { Router } from 'express';
import { SystemSettingsController } from '../controllers/system-settings.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SystemSettingsController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/v1/system-settings - Buscar configurações
router.get('/', (req, res) => controller.getSettings(req, res));

// PATCH /api/v1/system-settings - Atualizar configurações
router.patch('/', (req, res) => controller.updateSettings(req, res));

export default router;
