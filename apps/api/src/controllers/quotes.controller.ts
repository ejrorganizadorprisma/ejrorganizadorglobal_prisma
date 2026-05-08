import { Response, NextFunction } from 'express';
import { QuotesService } from '../services/quotes.service';
import { CreateQuoteSchema, UpdateQuoteSchema } from '@ejr/shared-types';
import { logger } from '../config/logger';
import type { AuthRequest } from '../middleware/auth';

export class QuotesController {
  private service = new QuotesService();

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as any;
      const customerId = req.query.customerId as string | undefined;

      // SALESPERSON can only see their own quotes
      const responsibleUserId = req.user!.role === 'SALESPERSON' ? req.user!.id : undefined;

      const { data, total } = await this.service.list({
        page,
        limit,
        search,
        status,
        customerId,
        responsibleUserId,
      });

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const quote = await this.service.getById(id, req.user?.id, req.user?.role);

      res.json({
        success: true,
        data: quote,
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      logger.debug('Criação de orçamento recebida', {
        userId: req.user?.id,
        customerId: req.body?.customerId,
        itemsCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
      });
      const data = CreateQuoteSchema.parse(req.body);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const quote = await this.service.create(data, userId, userRole);

      res.status(201).json({
        success: true,
        data: quote,
        message: 'Orçamento criado com sucesso',
      });
    } catch (error: any) {
      // Handle Zod validation errors with better messages
      if (error.name === 'ZodError') {
        const errorMessages = error.errors.map((err: any) => err.message).join(', ');
        return res.status(400).json({
          success: false,
          error: {
            message: `Erro de validação: ${errorMessages}`,
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = UpdateQuoteSchema.parse(req.body);

      const quote = await this.service.update(id, data, req.user?.id, req.user?.role);

      res.json({
        success: true,
        data: quote,
        message: 'Orçamento atualizado com sucesso',
      });
    } catch (error: any) {
      // Handle Zod validation errors with better messages
      if (error.name === 'ZodError') {
        const errorMessages = error.errors.map((err: any) => err.message).join(', ');
        return res.status(400).json({
          success: false,
          error: {
            message: `Erro de validação: ${errorMessages}`,
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(id, req.user?.id, req.user?.role);

      res.json({
        success: true,
        message: 'Orçamento deletado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const quote = await this.service.updateStatus(id, status, req.user?.id, req.user?.role);

      res.json({
        success: true,
        data: quote,
        message: 'Status atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };
}
