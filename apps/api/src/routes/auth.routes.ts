import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth';
import { LoginSchema, CreateUserSchema } from '@ejr/shared-types';
import { z } from 'zod';

const router = Router();
const authController = new AuthController();

// Rate limit dedicado para /login: 5 tentativas por (IP + email) em 15min.
// Defesa contra brute-force credencial-stuffing. A chave inclui o email
// para que o mesmo usuario nao consiga ofuscar tentativas trocando emails.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => {
    const email = (req.body?.email || '').toLowerCase();
    return `${req.ip}:${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip localhost em dev (mesmo padrao do limiter global).
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.socket.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Muitas tentativas de login. Aguarde 15 minutos.',
    },
  },
});

// Rate limit dedicado para /refresh: 30/15min por IP.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REFRESH_ATTEMPTS',
      message: 'Muitas tentativas de refresh. Aguarde alguns minutos.',
    },
  },
});

// Rate limit dedicado para /register: 5 cadastros por IP por hora.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REGISTRATIONS',
      message: 'Muitos cadastros recentes desse IP. Tente novamente em 1h.',
    },
  },
});

// POST /api/v1/auth/login
router.post(
  '/login',
  loginLimiter,
  validateRequest(z.object({ body: LoginSchema })),
  authController.login.bind(authController)
);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshLimiter, authController.refresh.bind(authController));

// POST /api/v1/auth/register
router.post(
  '/register',
  registerLimiter,
  validateRequest(z.object({ body: CreateUserSchema })),
  authController.register.bind(authController)
);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout.bind(authController));

// GET /api/v1/auth/me
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
