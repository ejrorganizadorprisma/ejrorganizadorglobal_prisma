import { Router } from 'express';
import { PermissionsController } from '../controllers/permissions.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new PermissionsController();

// All permissions routes require authentication
router.use(authenticate);

// Get all permissions configuration
router.get('/', controller.getPermissions);

// Update permissions configuration — só admins (evita que qualquer um reescreva a matriz)
router.put('/', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), controller.updatePermissions);

export default router;
