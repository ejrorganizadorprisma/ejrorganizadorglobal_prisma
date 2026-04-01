import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ApprovalDelegationsRepository } from '../repositories/approval-delegations.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import type { Request, Response } from 'express';

const router = Router();
const repo = new ApprovalDelegationsRepository();
const notificationsRepo = new NotificationsRepository();

router.use(authenticate);

// GET /api/v1/approval-delegations - List all delegations
router.get('/', async (req: Request, res: Response) => {
  try {
    const delegations = await repo.findAll();
    res.json({ success: true, data: delegations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/v1/approval-delegations/active - List active delegations
router.get('/active', async (req: Request, res: Response) => {
  try {
    const delegations = await repo.getActiveDelegates();
    res.json({ success: true, data: delegations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/v1/approval-delegations - Create delegation (OWNER only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'OWNER' && userRole !== 'DIRECTOR') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Apenas administradores podem criar delegações' } });
    }

    const userId = (req as any).user?.id;
    const { delegatedTo, startDate, endDate } = req.body;

    if (!delegatedTo || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Campos obrigatórios: delegatedTo, startDate, endDate' } });
    }

    const delegation = await repo.create({
      delegatedBy: userId,
      delegatedTo,
      startDate,
      endDate,
    });

    // Notify delegate
    await notificationsRepo.create({
      userId: delegatedTo,
      type: 'INFO',
      title: 'Delegação de Aprovação',
      message: `Você recebeu permissão para aprovar orçamentos de compra (${startDate} a ${endDate}).`,
    });

    res.status(201).json({ success: true, data: delegation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// DELETE /api/v1/approval-delegations/:id - Revoke delegation (OWNER only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'OWNER' && userRole !== 'DIRECTOR') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Apenas administradores podem revogar delegações' } });
    }

    const delegation = await repo.findById(req.params.id);
    if (!delegation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Delegação não encontrada' } });
    }

    await repo.revoke(req.params.id);

    // Notify delegate
    await notificationsRepo.create({
      userId: delegation.delegatedTo,
      type: 'WARNING',
      title: 'Delegação Revogada',
      message: 'Sua delegação de aprovação de orçamentos foi revogada.',
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
