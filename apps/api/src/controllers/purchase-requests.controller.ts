import type { Request, Response } from 'express';
import { PurchaseRequestsService } from '../services/purchase-requests.service';

export class PurchaseRequestsController {
  private service: PurchaseRequestsService;

  constructor() {
    this.service = new PurchaseRequestsService();
  }

  findMany = async (req: Request, res: Response) => {
    try {
      const { page, limit, status, priority, requestedBy } = req.query;

      const result = await this.service.findMany({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        status: status as any,
        priority: priority as any,
        requestedBy: requestedBy as string,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string) : 20)),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  findById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await this.service.findById(id);

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      console.error('Erro ao buscar requisição:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuário não autenticado',
          },
        });
      }

      const dto = {
        ...req.body,
        requestedBy: userId,
      };

      const request = await this.service.create(dto);

      res.status(201).json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await this.service.update(id, req.body);

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  review = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuário não autenticado',
          },
        });
      }

      const dto = {
        ...req.body,
        reviewedBy: userId,
      };

      const request = await this.service.review(id, dto);

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  convertToPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuário não autenticado',
          },
        });
      }

      console.log('Convertendo requisição', id, 'para ordem de compra...');
      const purchaseOrder = await this.service.convertToPurchaseOrder(id, userId);
      console.log('Ordem de compra criada:', purchaseOrder.id);
      console.log('Retornando resposta:', JSON.stringify({ success: true, data: purchaseOrder }, null, 2));

      res.json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error: any) {
      console.error('Erro ao converter requisição:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);

      res.json({
        success: true,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };

  getItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const items = await this.service.getItems(id);

      res.json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  };
}
