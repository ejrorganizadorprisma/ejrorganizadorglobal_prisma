import { Router } from 'express';
import { PermissionsController } from '../controllers/permissions.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new PermissionsController();

// All permissions routes require authentication
router.use(authenticate);

// Get all permissions configuration
router.get('/', controller.getPermissions);

// Update permissions configuration
router.put('/', controller.updatePermissions);

export default router;
