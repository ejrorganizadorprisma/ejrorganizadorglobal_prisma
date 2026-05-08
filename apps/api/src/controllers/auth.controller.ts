import { Request, Response, NextFunction, CookieOptions } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';
import { UnauthorizedError } from '../utils/errors';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  generateCsrfToken,
} from '../utils/jwt';
import type { LoginDTO, CreateUserDTO } from '@ejr/shared-types';

const authService = new AuthService();

/**
 * Detecta cliente mobile a partir dos headers.
 * Aceita os dois headers (X-Client e X-Client-Type) por compatibilidade
 * com binarios mobile ja em campo.
 */
export function isMobileClient(req: Request): boolean {
  const xClient = (req.headers['x-client'] as string)?.toLowerCase();
  const xClientType = (req.headers['x-client-type'] as string)?.toLowerCase();
  return xClient === 'mobile' || xClientType === 'mobile';
}

function cookieOptions(maxAgeMs: number, httpOnly = true): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): string {
  // Access token (HttpOnly, 15min)
  res.cookie('accessToken', accessToken, cookieOptions(ACCESS_TOKEN_TTL_MS, true));
  // Refresh token (HttpOnly, 7 dias)
  res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_TOKEN_TTL_MS, true));
  // CSRF token (NAO-HttpOnly: cliente JS precisa ler para mandar no header)
  const csrf = generateCsrfToken();
  res.cookie('csrfToken', csrf, cookieOptions(REFRESH_TOKEN_TTL_MS, false));
  // Cookie legado: limpamos para nao confundir middleware antigo.
  res.clearCookie('token', { path: '/' });
  return csrf;
}

function clearAuthCookies(res: Response) {
  const opts: CookieOptions = { path: '/' };
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
  res.clearCookie('csrfToken', opts);
  res.clearCookie('token', opts); // legacy
}

async function validateMobileAccess(req: Request): Promise<void> {
  if (!isMobileClient(req)) return;

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
      await validateMobileAccess(req);

      const data: LoginDTO = req.body;
      const isMobile = isMobileClient(req);
      const result = await authService.login(data, isMobile, req);

      // Mobile bookkeeping (last_login + permissions)
      let mobilePermissions: any = undefined;
      if (isMobile) {
        const apiKey = req.headers['x-mobile-api-key'] as string;
        if (apiKey) {
          await db.query('UPDATE users SET mobile_app_last_login = NOW() WHERE mobile_app_token = $1', [apiKey]);
          const permResult = await db.query('SELECT mobile_app_permissions FROM users WHERE mobile_app_token = $1', [apiKey]);
          mobilePermissions = permResult.rows[0]?.mobile_app_permissions || { customers: true, quotes: true, sales: true, products: true };
        }
      }

      if (isMobile) {
        // Mobile: tokens no body. Sem cookies.
        res.json({
          success: true,
          data: {
            user: result.user,
            token: result.accessToken, // back-compat
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            refreshExpiresAt: result.refreshExpiresAt,
            ...(mobilePermissions ? { mobilePermissions } : {}),
          },
          message: 'Login realizado com sucesso',
        });
      } else {
        // Web: cookies HttpOnly. Body NAO contem tokens.
        const csrf = setAuthCookies(res, result.accessToken, result.refreshToken);
        res.json({
          success: true,
          data: {
            user: result.user,
            csrfToken: csrf, // tambem retornamos no body para conveniencia
          },
          message: 'Login realizado com sucesso',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const isMobile = isMobileClient(req);
      const refreshTokenRaw: string | undefined = isMobile
        ? req.body?.refreshToken
        : req.cookies?.refreshToken;

      const result = await authService.refresh(refreshTokenRaw, req);

      if (isMobile) {
        res.json({
          success: true,
          data: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            refreshExpiresAt: result.refreshExpiresAt,
            token: result.accessToken, // back-compat
          },
        });
      } else {
        const csrf = setAuthCookies(res, result.accessToken, result.refreshToken);
        res.json({
          success: true,
          data: { csrfToken: csrf },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateUserDTO = req.body;
      const result = await authService.register(data);

      // Register so far ainda usa fluxo antigo (1 token). Para o web tambem
      // setamos cookies novos. Se algum dia precisar refresh aqui, basta
      // migrar para auth.service.login depois do create.
      if (isMobileClient(req)) {
        res.status(201).json({
          success: true,
          data: result,
          message: 'Usuário criado com sucesso',
        });
      } else {
        // Set legacy + new cookies for backwards compatibility on register.
        res.cookie('accessToken', result.token, cookieOptions(ACCESS_TOKEN_TTL_MS, true));
        res.status(201).json({
          success: true,
          data: result,
          message: 'Usuário criado com sucesso',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const isMobile = isMobileClient(req);
      const refreshTokenRaw: string | undefined = isMobile
        ? req.body?.refreshToken
        : req.cookies?.refreshToken;

      await authService.logout(refreshTokenRaw);

      if (!isMobile) {
        clearAuthCookies(res);
      }

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
      await validateMobileAccess(req);

      const user = await authService.getCurrentUser(req.user!.id);

      if (isMobileClient(req)) {
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
