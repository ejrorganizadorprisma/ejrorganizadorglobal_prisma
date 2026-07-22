import { Request, Response, NextFunction } from 'express';
import { isMobileClient } from '../controllers/auth.controller';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection.
 *
 * Para clientes web (cookies HttpOnly de auth):
 *   - cookie nao-HttpOnly `csrfToken` e setado no login.
 *   - cliente JS le esse cookie e envia o valor no header `X-CSRF-Token`
 *     em qualquer mutation (POST/PUT/PATCH/DELETE).
 *   - middleware compara cookie vs header — se diferentes ou ausentes, bloqueia.
 *
 * Para mobile: skip (mobile usa Authorization Bearer e nao e vitima de CSRF).
 *
 * Aplique este middleware DEPOIS dos endpoints que SETAM o cookie csrfToken
 * (login/refresh/logout), pois esses ainda nao tem o cookie.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (isMobileClient(req)) return next();

  const cookieToken = req.cookies?.csrfToken;
  const headerToken =
    (req.headers['x-csrf-token'] as string) ||
    (req.headers['x-xsrf-token'] as string);

  // Modo migração: usuários com sessão legada (cookie 'token' antigo) ainda
  // Estrito: mutation SEM cookie csrfToken é bloqueada (o middleware authenticate
  // emite o cookie a cada request GET, então clientes legítimos já o possuem).
  // O bypass anterior (return next() quando faltava o cookie) permitia CSRF em
  // sessões legadas — removido.
  if (!headerToken || !cookieToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      error: { code: 'CSRF_INVALID', message: 'CSRF token invalido' },
    });
  }
  next();
}
