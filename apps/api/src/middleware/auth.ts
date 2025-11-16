import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { supabase } from '../config/supabase';

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
  // AUTENTICAÇÃO DESABILITADA TEMPORARIAMENTE
  // Cria um usuário mock para desenvolvimento
  req.user = {
    id: 'mock-user-id',
    email: 'admin@ejr.com',
    role: 'OWNER',
  };

  next();
}
