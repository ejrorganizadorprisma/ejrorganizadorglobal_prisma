import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

// Função para traduzir mensagens de erro do PostgreSQL para português
function translatePostgresError(message: string): string {
  const translations: Record<string, string> = {
    'does not exist': 'não existe',
    'already exists': 'já existe',
    'violates not-null constraint': 'viola restrição de não-nulo',
    'violates unique constraint': 'viola restrição de unicidade',
    'violates foreign key constraint': 'viola restrição de chave estrangeira',
    'violates check constraint': 'viola restrição de verificação',
    'duplicate key value': 'valor de chave duplicado',
    'null value in column': 'valor nulo na coluna',
    'column': 'coluna',
    'relation': 'relação',
    'of relation': 'da relação',
    'invalid input syntax': 'sintaxe de entrada inválida',
    'permission denied': 'permissão negada',
    'connection refused': 'conexão recusada',
    'database': 'banco de dados',
    'table': 'tabela',
  };

  let translatedMessage = message;

  for (const [english, portuguese] of Object.entries(translations)) {
    const regex = new RegExp(english, 'gi');
    translatedMessage = translatedMessage.replace(regex, portuguese);
  }

  return translatedMessage;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // App errors (custom)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Traduz mensagens de erro do PostgreSQL
  const translatedMessage = translatePostgresError(err.message || 'Ocorreu um erro inesperado');

  // Default error - retorna a mensagem do erro traduzida
  res.status(500).json({
    success: false,
    message: translatedMessage,
    error: {
      code: 'INTERNAL_ERROR',
      message: translatedMessage,
    },
  });
}
