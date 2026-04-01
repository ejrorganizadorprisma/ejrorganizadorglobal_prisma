import { Router } from 'express';
import { DocumentSettingsController } from '../controllers/document-settings.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new DocumentSettingsController();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/document-settings - Get all settings
router.get('/', controller.getAllSettings);

// GET /api/v1/document-settings/default - Get default settings
router.get('/default', controller.getDefaultSettings);

// GET /api/v1/document-settings/:id - Get settings by ID
router.get('/:id', controller.getSettingsById);

// POST /api/v1/document-settings - Create new settings
router.post('/', controller.createSettings);

// PUT /api/v1/document-settings/:id - Update settings
router.put('/:id', controller.updateSettings);

// PUT /api/v1/document-settings/:id/set-default - Set as default
router.put('/:id/set-default', controller.setAsDefault);

// DELETE /api/v1/document-settings/:id - Delete settings
router.delete('/:id', controller.deleteSettings);

export default router;
