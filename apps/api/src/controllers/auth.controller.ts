import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';
import { UnauthorizedError } from '../utils/errors';
import type { LoginDTO, CreateUserDTO } from '@ejr/shared-types';

const authService = new AuthService();

async function validateMobileAccess(req: Request): Promise<void> {
  const clientType = req.headers['x-client-type'];
  if (clientType !== 'mobile') return;

  // Check global toggle
  const settingsResult = await db.query('SELECT mobile_app_enabled FROM system_settings LIMIT 1');
  if (!settingsResult.rows[0]?.mobile_app_enabled) {
    throw new UnauthorizedError('Acesso via aplicativo desabilitado pelo administrador');
  }

  // Check seller's individual token
  const apiKey = req.headers['x-mobile-api-key'] as string;
  if (!apiKey) {
    throw new UnauthorizedError('Chave de conexão não fornecida');
  }

  const userResult = await db.query(
    'SELECT id, mobile_app_authorized, mobile_app_token, mobile_app_permissions FROM users WHERE mobile_app_token = $1 LIMIT 1',
    [apiKey]
  );

  if (!userResult.rows[0]) {
    throw new UnauthorizedError('Chave de conexão inválida');
  }

  if (!userResult.rows[0].mobile_app_authorized) {
    throw new UnauthorizedError('Vendedor não autorizado para o aplicativo');
  }
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate mobile access if request comes from mobile app
      await validateMobileAccess(req);

      const data: LoginDTO = req.body;
      const result = await authService.login(data);

      // If mobile login, update last_login and include permissions
      if (req.headers['x-client-type'] === 'mobile') {
        const apiKey = req.headers['x-mobile-api-key'] as string;
        if (apiKey) {
          await db.query('UPDATE users SET mobile_app_last_login = NOW() WHERE mobile_app_token = $1', [apiKey]);
          const permResult = await db.query('SELECT mobile_app_permissions FROM users WHERE mobile_app_token = $1', [apiKey]);
          (result as any).mobilePermissions = permResult.rows[0]?.mobile_app_permissions || { customers: true, quotes: true, sales: true, products: true };
        }
      }

      // Set HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      });

      res.json({
        success: true,
        data: result,
        message: 'Login realizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateUserDTO = req.body;
      const result = await authService.register(data);

      // Set HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Usuário criado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('token');
      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Validate mobile access on session check (cuts existing sessions when admin disables)
      await validateMobileAccess(req);

      const user = await authService.getCurrentUser(req.user!.id);

      if (req.headers['x-client-type'] === 'mobile') {
        const apiKey = req.headers['x-mobile-api-key'] as string;
        if (apiKey) {
          const permResult = await db.query('SELECT mobile_app_permissions FROM users WHERE mobile_app_token = $1', [apiKey]);
          (user as any).mobilePermissions = permResult.rows[0]?.mobile_app_permissions || { customers: true, quotes: true, sales: true, products: true };
        }
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
