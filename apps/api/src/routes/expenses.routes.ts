import { Router, Response } from 'express';
import { z } from 'zod';
import { ExpensesRepository } from '../repositories/expenses.repository';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();
const repo = new ExpensesRepository();

// Despesa é dado financeiro: mesmo nível de acesso do módulo Financeiro.
router.use(authenticate);
router.use(authorize(['OWNER', 'DIRECTOR', 'MANAGER']));

const CATEGORIES = [
  'RENT', 'PAYROLL', 'TAX', 'UTILITIES', 'FREIGHT',
  'SERVICES', 'MAINTENANCE', 'MARKETING', 'FEES', 'OTHER',
] as const;

const installmentSchema = z.object({
  installmentNumber: z.number().int().positive(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate deve ser YYYY-MM-DD'),
  notes: z.string().max(500).optional(),
});

const createSchema = z.object({
  description: z.string().min(1).max(300),
  category: z.enum(CATEGORIES),
  supplierId: z.string().nullish(),
  totalAmount: z.number().positive(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  documentNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  recurrence: z.enum(['NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  recurrenceDay: z.number().int().min(1).max(31).nullish(),
  recurrenceUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  installments: z.array(installmentSchema).min(1).max(120),
});

const updateSchema = createSchema
  .omit({ totalAmount: true, installments: true, issueDate: true })
  .partial();

const asyncRoute =
  (fn: (req: AuthRequest, res: Response) => Promise<any>) =>
  async (req: AuthRequest, res: Response, next: any) => {
    try { await fn(req, res); } catch (e) { next(e); }
  };

// GET / — listagem com filtros
router.get('/', asyncRoute(async (req, res) => {
  const result = await repo.findMany({
    page: Math.max(1, parseInt(req.query.page as string) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)),
    search: req.query.search as string,
    category: req.query.category as string,
    status: req.query.status as string,
    supplierId: req.query.supplierId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });
  res.json({ success: true, ...result });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const expense = await repo.findById(req.params.id);
  if (!expense) throw new NotFoundError('Despesa não encontrada');
  res.json({ success: true, data: expense });
}));

router.post('/', asyncRoute(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message || 'Dados inválidos');
  }
  const data = parsed.data;

  // A soma das parcelas precisa fechar com o total (tolerância de 1 unidade
  // para o arredondamento da divisão automática).
  const sum = data.installments.reduce((s, i) => s + i.amount, 0);
  if (Math.abs(sum - data.totalAmount) > 1) {
    throw new ValidationError(
      `Soma das parcelas (${sum}) difere do valor total (${data.totalAmount})`
    );
  }

  const expense = await repo.create({ ...data, createdBy: req.user!.id } as any);
  res.status(201).json({ success: true, data: expense });
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message || 'Dados inválidos');
  }
  const existing = await repo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Despesa não encontrada');

  const expense = await repo.update(req.params.id, parsed.data as any);
  res.json({ success: true, data: expense });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const existing = await repo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Despesa não encontrada');
  const result = await repo.remove(req.params.id);
  res.json({ success: true, ...result });
}));

// PATCH /installments/:installmentId/pay — baixa
router.patch('/installments/:installmentId/pay', asyncRoute(async (req, res) => {
  const paidDate = (req.body?.paidDate as string) || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
    throw new ValidationError('paidDate deve ser YYYY-MM-DD');
  }
  const expense = await repo.payInstallment(req.params.installmentId, paidDate, req.body?.paymentMethod);
  res.json({ success: true, data: expense });
}));

// PATCH /installments/:installmentId/unpay — estorno da baixa
router.patch('/installments/:installmentId/unpay', asyncRoute(async (req, res) => {
  const expense = await repo.unpayInstallment(req.params.installmentId);
  res.json({ success: true, data: expense });
}));

export default router;
