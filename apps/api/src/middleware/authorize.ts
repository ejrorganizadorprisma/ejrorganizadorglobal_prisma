import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import type { AuthRequest } from './auth';

export function authorize(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Usuário não autenticado');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Sem permissão para acessar este recurso');
    }

    next();
  };
}
