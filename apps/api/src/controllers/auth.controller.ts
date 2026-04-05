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

  const result = await db.query(
    'SELECT mobile_app_enabled, mobile_app_api_key FROM system_settings LIMIT 1'
  );
  const settings = result.rows[0];

  if (!settings || !settings.mobile_app_enabled) {
    throw new UnauthorizedError('Acesso via aplicativo desabilitado pelo administrador');
  }

  const apiKey = req.headers['x-mobile-api-key'] as string;
  if (!apiKey || apiKey !== settings.mobile_app_api_key) {
    throw new UnauthorizedError('Chave de conexão inválida');
  }
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate mobile access if request comes from mobile app
      await validateMobileAccess(req);

      const data: LoginDTO = req.body;
      const result = await authService.login(data);

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
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
