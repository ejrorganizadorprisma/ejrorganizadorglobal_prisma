import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { CommissionsRepository } from '../repositories/commissions.repository';
import {
  UpdateCommissionConfigSchema,
  CreateSettlementSchema,
} from '@ejr/shared-types';

const router = Router();
const repo = new CommissionsRepository();

router.use(authenticate);

// ─── Config ────────────────────────────────────────────────

/**
 * GET /api/v1/commissions/config
 * List all commission configs
 */
router.get(
  '/config',
  authorize(['OWNER', 'DIRECTOR', 'MANAGER']),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const configs = await repo.getAllConfigs();
      res.json({ success: true, data: configs });
    } catch (error: any) {
      // Table may not exist yet in production
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [] });
      }
      next(error);
    }
  }
);

/**
 * PUT /api/v1/commissions/config/:sellerId
 * Upsert commission config for a seller
 */
router.put(
  '/config/:sellerId',
  authorize(['OWNER', 'DIRECTOR']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { sellerId } = req.params;
      const dto = UpdateCommissionConfigSchema.parse(req.body);
      const config = await repo.upsertConfig(sellerId, dto, req.user!.id);
      res.json({ success: true, data: config, message: 'Configuração de comissão atualizada' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Erro de validação', details: error.errors },
        });
      }
      next(error);
    }
  }
);

// ─── Entries ───────────────────────────────────────────────

/**
 * GET /api/v1/commissions/entries
 * List commission entries with filters
 */
router.get(
  '/entries',
  authorize(['OWNER', 'DIRECTOR', 'MANAGER']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        sellerId: req.query.sellerId as string | undefined,
        sourceType: req.query.sourceType as any,
        status: req.query.status as any,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await repo.getEntries(filters);
      res.json({ success: true, ...result });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
      next(error);
    }
  }
);

// ─── Summary ───────────────────────────────────────────────

/**
 * GET /api/v1/commissions/summary
 * All sellers summaries
 */
router.get(
  '/summary',
  authorize(['OWNER', 'DIRECTOR', 'MANAGER']),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const summaries = await repo.getAllSummaries();
      res.json({ success: true, data: summaries });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [] });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/commissions/summary/:sellerId
 * Single seller summary (authenticated user can see own)
 */
router.get(
  '/summary/:sellerId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { sellerId } = req.params;
      const summary = await repo.getSellerSummary(sellerId);
      if (!summary) {
        return res.status(404).json({ success: false, error: { message: 'Configuração de comissão não encontrada para este vendedor' } });
      }
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Settlements ───────────────────────────────────────────

/**
 * GET /api/v1/commissions/settlements
 * List settlements
 */
router.get(
  '/settlements',
  authorize(['OWNER', 'DIRECTOR', 'MANAGER']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        sellerId: req.query.sellerId as string | undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await repo.getSettlements(filters);
      res.json({ success: true, ...result });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/commissions/settlements/:id
 * Settlement detail with entries
 */
router.get(
  '/settlements/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const settlement = await repo.getSettlementById(id);
      if (!settlement) {
        return res.status(404).json({ success: false, error: { message: 'Acerto não encontrado' } });
      }
      res.json({ success: true, data: settlement });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/commissions/settlements
 * Create a new settlement
 */
router.post(
  '/settlements',
  authorize(['OWNER', 'DIRECTOR']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto = CreateSettlementSchema.parse(req.body);
      const settlement = await repo.createSettlement(dto, req.user!.id);
      res.status(201).json({ success: true, data: settlement, message: 'Acerto criado com sucesso' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Erro de validação', details: error.errors },
        });
      }
      if (error.message?.includes('Nenhuma comissão pendente')) {
        return res.status(400).json({
          success: false,
          error: { message: error.message },
        });
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/commissions/settlements/:id/pay
 * Mark settlement as paid
 */
router.patch(
  '/settlements/:id/pay',
  authorize(['OWNER', 'DIRECTOR']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const settlement = await repo.paySettlement(id, req.user!.id);
      if (!settlement) {
        return res.status(404).json({ success: false, error: { message: 'Acerto não encontrado' } });
      }
      res.json({ success: true, data: settlement, message: 'Acerto marcado como pago' });
    } catch (error) {
      next(error);
    }
  }
);

// ─── My (authenticated seller) ─────────────────────────────

/**
 * GET /api/v1/commissions/my/summary
 * Summary metrics for the authenticated seller
 */
router.get(
  '/my/summary',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.user!.id;
      const summary = await repo.getMySummary(sellerId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({
          success: true,
          data: {
            currentMonth: 0,
            previousMonth: 0,
            deltaPercent: 0,
            totalPending: 0,
            totalSettled: 0,
            totalAllTime: 0,
            entriesCount: 0,
            configSalesRate: 0,
            configCollectionsRate: 0,
          },
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/commissions/my/entries
 * Paginated commission entries for the authenticated seller
 */
router.get(
  '/my/entries',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.user!.id;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        customerId: req.query.customerId as string | undefined,
        sourceType: req.query.sourceType as 'SALE' | 'COLLECTION' | undefined,
        status: req.query.status as 'PENDING' | 'SETTLED' | undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await repo.getMyEntries(sellerId, filters);
      res.json({ success: true, ...result });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/commissions/my/monthly?months=6
 * Aggregated commission amounts per month for the last N months
 */
router.get(
  '/my/monthly',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.user!.id;
      let months = parseInt(req.query.months as string) || 6;
      if (months < 1) months = 1;
      if (months > 24) months = 24;

      const data = await repo.getMyMonthly(sellerId, months);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [] });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/commissions/my/by-customer?limit=10&startDate=&endDate=
 * Top customers ranked by commission amount generated for this seller
 */
router.get(
  '/my/by-customer',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.user!.id;
      let limit = parseInt(req.query.limit as string) || 10;
      if (limit < 1) limit = 1;
      if (limit > 50) limit = 50;

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const data = await repo.getMyByCustomer(sellerId, limit, startDate, endDate);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [] });
      }
      next(error);
    }
  }
);

export default router;
