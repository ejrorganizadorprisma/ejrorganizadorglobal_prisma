import { Response, NextFunction } from 'express';
import { FinancialService } from '../services/financial.service';
import type { AuthRequest } from '../middleware/auth';
import type { FinancialFilters } from '@ejr/shared-types';

export class FinancialController {
  private service = new FinancialService();

  /**
   * GET /api/v1/financial/summary
   * Resumo financeiro geral
   */
  getSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const summary = await this.service.getSummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/financial/cash-flow?days=30
   * Fluxo de caixa para os próximos N dias
   */
  getCashFlow = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const cashFlow = await this.service.getCashFlow(days);

      res.json({
        success: true,
        data: cashFlow,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/financial/calendar?month=2026-03
   * Calendário financeiro de um mês
   */
  getCalendar = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const month = req.query.month as string ||
        new Date().toISOString().substring(0, 7);

      const calendar = await this.service.getCalendar(month);

      res.json({
        success: true,
        data: calendar,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/financial/receivables
   * Lista paginada de contas a receber
   */
  getReceivables = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: FinancialFilters = {
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        entityId: req.query.entityId as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await this.service.getReceivables(filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        totals: result.totals,
        page: filters.page,
        limit: filters.limit,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/financial/payables
   * Lista paginada de contas a pagar
   */
  getPayables = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: FinancialFilters = {
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        entityId: req.query.entityId as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await this.service.getPayables(filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        totals: result.totals,
        page: filters.page,
        limit: filters.limit,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/financial/debtors
   * Lista paginada de devedores
   */
  getDebtors = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        search: req.query.search as string,
        onlyOverdue: req.query.onlyOverdue === 'true',
        onlyCreditExceeded: req.query.onlyCreditExceeded === 'true',
        sortBy: (req.query.sortBy as any) || 'overdue',
        sortOrder: (req.query.sortOrder as any) || 'desc',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };
      const result = await this.service.getDebtors(filters);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/financial/cashbox
   * Dados do caixa: saldo, projeções, fluxo diário, alertas e métricas
   */
  getCashBox = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getCashBox();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
