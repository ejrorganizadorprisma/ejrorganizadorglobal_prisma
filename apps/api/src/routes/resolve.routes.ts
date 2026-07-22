import { Router } from 'express';
import { ResolveController } from '../controllers/resolve.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const c = new ResolveController();

// Cron (sem autenticação por cookie; protegido por CRON_SECRET) — antes do authenticate
router.get('/cron/auto-confirm', c.cron);

router.use(authenticate);

// Papel do usuário no Resolve
router.get('/me', c.me);

// Tickets
router.get('/tickets', c.list);
router.post('/tickets', c.create);
router.get('/tickets/:id', c.detail);
router.patch('/tickets/:id', c.action);
router.post('/tickets/:id/comments', c.addComment);
router.post('/tickets/:id/vote', c.vote);

// Mural (todos os logados)
router.get('/mural', c.mural);

// Equipe
router.get('/team', c.team);
router.post('/team', c.addMember);
router.get('/team/users', c.searchUsers);
router.patch('/team/:memberId', c.updateMember);

// Admin
router.get('/admin/overview', c.adminOverview);
router.post('/admin/auto-confirm', c.autoConfirm);

export default router;
