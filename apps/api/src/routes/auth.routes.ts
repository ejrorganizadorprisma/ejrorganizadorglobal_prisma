import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth';
import { LoginSchema, CreateUserSchema } from '@ejr/shared-types';
import { z } from 'zod';

const router = Router();
const authController = new AuthController();

// POST /api/v1/auth/login
router.post(
  '/login',
  validateRequest(z.object({ body: LoginSchema })),
  authController.login.bind(authController)
);

// POST /api/v1/auth/register
router.post(
  '/register',
  validateRequest(z.object({ body: CreateUserSchema })),
  authController.register.bind(authController)
);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout.bind(authController));

// GET /api/v1/auth/me
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
