import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ResolveService } from '../services/resolve.service';
import { ForbiddenError } from '../utils/errors';
import { createTicketSchema, ticketActionSchema, addCommentSchema, addTeamMemberSchema, updateTeamMemberSchema } from '@ejr/shared-types';

export class ResolveController {
  private service = new ResolveService();

  private async requireAdmin(req: AuthRequest) {
    const m = await this.service.getMembership(req.user!.id, req.user!.role);
    if (!m.isAdmin) throw new ForbiddenError('Apenas administradores do Resolve');
    return m;
  }

  me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const m = await this.service.getMembership(req.user!.id, req.user!.role);
      res.json({ success: true, data: { ...m, userId: req.user!.id } });
    } catch (e) { next(e); }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listTickets(req.user!.id, req.user!.role, req.query.scope as string);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto = createTicketSchema.parse(req.body);
      const ticket = await this.service.createTicket(dto, req.user!.id);
      res.status(201).json({ success: true, data: ticket });
    } catch (e) { next(e); }
  };

  detail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getDetail(req.params.id, req.user!.id, req.user!.role);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  action = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto = ticketActionSchema.parse(req.body);
      const ticket = await this.service.applyAction(req.params.id, dto, req.user!.id, req.user!.role);
      res.json({ success: true, data: ticket });
    } catch (e) { next(e); }
  };

  addComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto = addCommentSchema.parse(req.body);
      const c = await this.service.addComment(req.params.id, req.user!.id, req.user!.role, dto.body, dto.internal);
      res.status(201).json({ success: true, data: c });
    } catch (e) { next(e); }
  };

  vote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.toggleVote(req.params.id, req.user!.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  mural = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.mural(req.user?.id ?? null);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  team = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listTeam(req.user!.id, req.user!.role);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  addMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.requireAdmin(req);
      const dto = addTeamMemberSchema.parse(req.body);
      await this.service.addTeamMember(dto.userId, dto.role);
      res.status(201).json({ success: true });
    } catch (e) { next(e); }
  };

  updateMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.requireAdmin(req);
      const dto = updateTeamMemberSchema.parse(req.body);
      await this.service.updateTeamMember(req.params.memberId, dto);
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.requireAdmin(req);
      const users = await this.service.searchUsers((req.query.q as string) || '');
      res.json({ success: true, data: { users } });
    } catch (e) { next(e); }
  };

  adminOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.requireAdmin(req);
      const data = await this.service.adminOverview();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  autoConfirm = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await this.requireAdmin(req);
      const data = await this.service.autoConfirmStale();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  // Cron (sem cookie): protegido por CRON_SECRET no header Authorization ou ?key=
  cron = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const secret = process.env.CRON_SECRET;
      const provided = (req.headers.authorization || '').replace('Bearer ', '') || (req.query.key as string) || '';
      if (!secret || provided !== secret) return res.status(401).json({ success: false, message: 'Não autorizado' });
      const data = await this.service.autoConfirmStale();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };
}
