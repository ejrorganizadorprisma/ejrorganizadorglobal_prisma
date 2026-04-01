import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { db } from '../config/database';

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
    // Tenta obter o token do cookie ou do header Authorization
    let token = req.cookies?.token;

    // Se não tiver no cookie, tenta pegar do header Authorization
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError('Token não fornecido');
    }

    // Verifica e decodifica o token
    const decoded = verifyToken(token);

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

    // Adiciona os dados do usuário na requisição
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
