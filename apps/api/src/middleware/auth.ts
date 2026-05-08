import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { db } from '../config/database';
import { isMobileClient } from '../controllers/auth.controller';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const mobile = isMobileClient(req);

    // Mobile: SEMPRE Authorization header. Web: SEMPRE cookie.
    // Bloqueamos Authorization para o web — token em localStorage e a vulnerabilidade
    // que estamos justamente tentando eliminar nessa refatoracao.
    let token: string | undefined;
    if (mobile) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } else {
      // Cookie novo (accessToken). Mantemos fallback para "token" (cookie legado)
      // por uma janela curta de transicao — pode ser removido apos o deploy.
      token = req.cookies?.accessToken || req.cookies?.token;
    }

    if (!token) {
      throw new UnauthorizedError('Token não fornecido');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      // Diferencia "expirou" vs "invalido" para o cliente decidir refresh.
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' },
        });
      }
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Token invalido' },
      });
    }

    // Busca o usuário no banco para garantir que ainda existe e está ativo
    const result = await db.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1 LIMIT 1',
      [decoded.userId]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedError('Usuário inativo');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
