import { Response, NextFunction } from 'express';
import { SalesOrdersService } from '../services/sales-orders.service';
import type { AuthRequest } from '../middleware/auth';
import type {
  SalesOrderFilters,
  CreateSalesOrderDTO,
  UpdateSalesOrderDTO,
} from '@ejr/shared-types';

export class SalesOrdersController {
  private service = new SalesOrdersService();

  /**
   * GET /api/v1/sales-orders
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: SalesOrderFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 1000),
        customerId: req.query.customerId as string,
        sellerId: req.query.sellerId as string,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
      };

      // SALESPERSON só vê seus próprios pedidos
      if (req.user!.role === 'SALESPERSON') {
        filters.sellerId = req.user!.id;
      }

      const result = await this.service.list(filters);
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: filters.page,
        limit: filters.limit,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/sales-orders/:id
   */
  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.getById(req.params.id);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales-orders
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto: CreateSalesOrderDTO = req.body;
      const order = await this.service.create(dto, req.user!.id, req.user!.role);
      res.status(201).json({
        success: true,
        data: order,
        message: 'Pedido criado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales-orders/convert-from-quote
   */
  convertFromQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { quoteId, notes, internalNotes, orderDate } = req.body;
      if (!quoteId) {
        return res.status(400).json({ success: false, message: 'quoteId é obrigatório' });
      }
      const order = await this.service.convertFromQuote(
        quoteId,
        req.user!.id,
        req.user!.role,
        { notes, internalNotes, orderDate }
      );
      res.status(201).json({
        success: true,
        data: order,
        message: 'Orçamento convertido em pedido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales-orders/:id/convert-to-sale
   * Admin/faturamento: transforma o pedido em venda (adiciona frete, pode editar).
   */
  convertToSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const role = req.user!.role;
      // Vendedor sem permissão especial não pode faturar
      if (role === 'SALESPERSON') {
        return res
          .status(403)
          .json({ success: false, message: 'Apenas administradores podem faturar pedidos' });
      }
      const sale = await this.service.convertToSale(id, req.body, req.user!.id, role);
      res.status(201).json({
        success: true,
        data: sale,
        message: 'Pedido convertido em venda com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/sales-orders/:id
   */
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto: UpdateSalesOrderDTO = req.body;
      const order = await this.service.update(req.params.id, dto, req.user!.id, req.user!.role);
      res.json({ success: true, data: order, message: 'Pedido atualizado' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales-orders/:id/cancel
   */
  cancel = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      const order = await this.service.cancel(req.params.id, req.user!.id, reason);
      res.json({ success: true, data: order, message: 'Pedido cancelado' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/sales-orders/:id
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(req.params.id);
      res.json({ success: true, message: 'Pedido deletado' });
    } catch (error) {
      next(error);
    }
  };
}
