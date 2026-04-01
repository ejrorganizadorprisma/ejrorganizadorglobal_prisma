import { Request, Response, NextFunction } from 'express';
import { QuotesService } from '../services/quotes.service';
import { CreateQuoteSchema, UpdateQuoteSchema } from '@ejr/shared-types';
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

      const { data, total } = await this.service.list({
        page,
        limit,
        search,
        status,
        customerId,
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

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const quote = await this.service.getById(id);

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
      console.log('Recebendo dados do orçamento:', JSON.stringify(req.body, null, 2));
      const data = CreateQuoteSchema.parse(req.body);
      const userId = req.user!.id;

      const quote = await this.service.create(data, userId);

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

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = UpdateQuoteSchema.parse(req.body);

      const quote = await this.service.update(id, data);

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

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);

      res.json({
        success: true,
        message: 'Orçamento deletado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const quote = await this.service.updateStatus(id, status);

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
