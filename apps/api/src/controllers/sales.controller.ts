import { Request, Response, NextFunction } from 'express';
import { SalesService } from '../services/sales.service';
import type { AuthRequest } from '../middleware/auth';
import type {
  SaleFilters,
  CreateSaleDTO,
  UpdateSaleDTO,
  CreateSalePaymentDTO,
  UpdateSalePaymentDTO,
} from '@ejr/shared-types';

export class SalesController {
  private service = new SalesService();

  /**
   * GET /api/v1/sales
   * Listar vendas com filtros e paginação
   */
  getSales = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: SaleFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        customerId: req.query.customerId as string,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
      };

      // SALESPERSON can only see their own sales
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
   * GET /api/v1/sales/stats
   * Obter estatísticas de vendas
   */
  getSaleStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: SaleFilters = {
        customerId: req.query.customerId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      // SALESPERSON can only see their own sales stats
      if (req.user!.role === 'SALESPERSON') {
        filters.sellerId = req.user!.id;
      }

      const stats = await this.service.getStats(filters);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/sales/:id
   * Buscar venda por ID
   */
  getSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const sale = await this.service.getById(id);

      res.json({
        success: true,
        data: sale,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales
   * Criar nova venda
   */
  createSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const saleData: CreateSaleDTO = req.body;
      const userId = req.user!.id;

      const sale = await this.service.create(saleData, userId);

      res.status(201).json({
        success: true,
        data: sale,
        message: 'Venda criada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales/convert-from-quote
   * Converter orçamento em venda
   */
  convertFromQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { quoteId, paymentMethod, installments, saleDate, dueDate, notes, internalNotes } = req.body;
      const userId = req.user!.id;

      if (!quoteId) {
        return res.status(400).json({ success: false, message: 'quoteId é obrigatório' });
      }

      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: 'paymentMethod é obrigatório' });
      }

      const sale = await this.service.convertFromQuote(
        quoteId,
        { paymentMethod, installments, saleDate, dueDate, notes, internalNotes },
        userId
      );

      res.status(201).json({
        success: true,
        data: sale,
        message: 'Orçamento convertido em venda com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/sales/:id
   * Atualizar venda
   */
  updateSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const saleData: UpdateSaleDTO = req.body;

      const sale = await this.service.update(id, saleData, req.user!.id);

      res.json({
        success: true,
        data: sale,
        message: 'Venda atualizada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/sales/:id
   * Deletar venda
   */
  deleteSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(id, req.user!.id);

      res.json({
        success: true,
        message: 'Venda deletada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/sales/:id/payments
   * Adicionar pagamento à venda
   */
  addPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const paymentData: CreateSalePaymentDTO = req.body;

      const payment = await this.service.addPayment(id, paymentData);

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Pagamento adicionado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/sales/:id/payments/:paymentId
   * Atualizar pagamento
   */
  updatePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const paymentData: UpdateSalePaymentDTO = req.body;

      const payment = await this.service.updatePayment(paymentId, paymentData);

      res.json({
        success: true,
        data: payment,
        message: 'Pagamento atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };
}
