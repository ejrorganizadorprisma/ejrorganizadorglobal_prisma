import { ResolveRepository } from '../repositories/resolve.repository';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import {
  SLA_DAYS, TRIAGE_SLA_DAYS, AUTO_CONFIRM_DAYS, statusLabel,
  type ResolveMembership, type TicketActionDTO, type AdminOverview, type TicketPriority,
} from '@ejr/shared-types';

const OPEN = ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'];
const isOwner = (role?: string) => role === 'OWNER';

export class ResolveService {
  private repo = new ResolveRepository();

  /** OWNER é o super-admin implícito (equivalente ao EJR_ADMIN do Hub). */
  async getMembership(userId: string, userRole?: string): Promise<ResolveMembership> {
    if (isOwner(userRole)) return { isTeam: true, isAdmin: true };
    const m = await this.repo.getTeamMember(userId);
    if (!m || !m.active) return { isTeam: false, isAdmin: false };
    return { isTeam: true, isAdmin: m.role === 'ADMIN' };
  }

  async createTicket(dto: any, userId: string) {
    return this.repo.create(dto, userId);
  }

  async listTickets(userId: string, userRole: string | undefined, scope?: string) {
    const membership = await this.getMembership(userId, userRole);
    if (scope === 'all') {
      if (!membership.isTeam) throw new ForbiddenError('Apenas a equipe pode ver todas as demandas');
      return { tickets: await this.repo.listAll(), membership };
    }
    return { tickets: await this.repo.listMine(userId), membership };
  }

  async getDetail(id: string, userId: string, userRole?: string) {
    const core = await this.repo.getCore(id);
    if (!core) throw new NotFoundError('Demanda não encontrada');
    const membership = await this.getMembership(userId, userRole);
    if (!membership.isTeam && core.reporterId !== userId) {
      throw new ForbiddenError('Você não tem acesso a esta demanda');
    }
    const ticket = await this.repo.findDetail(id, membership.isTeam); // reporter não vê notas internas
    return { ticket, membership };
  }

  async applyAction(id: string, dto: TicketActionDTO, userId: string, userRole?: string) {
    const core = await this.repo.getCore(id);
    if (!core) throw new NotFoundError('Demanda não encontrada');
    const m = await this.getMembership(userId, userRole);
    const isTeam = m.isTeam, isAdmin = m.isAdmin, isReporter = core.reporterId === userId;

    const fields: Record<string, any> = {};
    let action = 'STATUS_CHANGED';
    let fromValue: string | null = core.status;
    let toValue: string | null = null;
    const inOpen = OPEN.includes(core.status);

    switch (dto.action) {
      case 'START': {
        if (!isTeam) throw new ForbiddenError('Apenas a equipe pode iniciar o atendimento');
        if (!['NEW', 'TRIAGE', 'REOPENED'].includes(core.status)) throw new BadRequestError(`Não é possível iniciar a partir de "${statusLabel(core.status as any)}"`);
        fields.status = 'IN_PROGRESS';
        if (!core.assigneeId) fields.assignee_id = userId;
        action = 'STATUS_CHANGED'; toValue = 'IN_PROGRESS';
        break;
      }
      case 'RESOLVE': {
        if (!isTeam) throw new ForbiddenError('Apenas a equipe pode resolver');
        if (!inOpen) throw new BadRequestError(`Não é possível resolver a partir de "${statusLabel(core.status as any)}"`);
        const newStatus = isAdmin ? 'RESOLVED' : 'AWAITING_CONFIRMATION';
        fields.status = newStatus;
        fields.resolved_by_id = userId;
        fields.resolved_at = new Date().toISOString();
        if (isAdmin) fields.confirmed_at = new Date().toISOString();
        if (!core.assigneeId) fields.assignee_id = userId;
        action = 'RESOLVED'; toValue = newStatus;
        break;
      }
      case 'CONFIRM': {
        if (!isReporter && !isAdmin) throw new ForbiddenError('Só quem abriu (ou um admin) pode confirmar');
        if (core.status !== 'AWAITING_CONFIRMATION') throw new BadRequestError('A demanda não está aguardando confirmação');
        fields.status = 'RESOLVED'; fields.confirmed_at = new Date().toISOString();
        action = 'CONFIRMED'; toValue = 'RESOLVED';
        break;
      }
      case 'REOPEN': {
        if (!isReporter && !isTeam) throw new ForbiddenError('Sem permissão para reabrir');
        if (!['AWAITING_CONFIRMATION', 'RESOLVED', 'CLOSED'].includes(core.status)) throw new BadRequestError('Só é possível reabrir demandas resolvidas/encerradas');
        // Limpa resolved_at para não inflar as métricas de tempo médio/resolvidas.
        fields.status = 'REOPENED'; fields.confirmed_at = null; fields.resolved_at = null;
        action = 'REOPENED'; toValue = 'REOPENED';
        break;
      }
      case 'CLOSE': {
        if (!isAdmin) throw new ForbiddenError('Apenas admin pode encerrar');
        if (!inOpen && core.status !== 'AWAITING_CONFIRMATION') throw new BadRequestError('Não é possível encerrar nesta situação');
        fields.status = 'CLOSED'; fields.closed_at = new Date().toISOString();
        action = 'CLOSED'; toValue = 'CLOSED';
        break;
      }
      case 'REJECT': {
        if (!isAdmin) throw new ForbiddenError('Apenas admin pode recusar');
        if (!inOpen) throw new BadRequestError('Não é possível recusar nesta situação');
        if (core.type !== 'SUGGESTION') throw new BadRequestError('Só sugestões podem ser "não acatadas"');
        fields.status = 'REJECTED'; fields.closed_at = new Date().toISOString();
        action = 'REJECTED'; toValue = 'REJECTED';
        break;
      }
      case 'SET_PRIORITY': {
        if (!isAdmin) throw new ForbiddenError('Apenas admin define prioridade');
        const p = dto.value as TicketPriority;
        if (!['P1', 'P2', 'P3', 'P4'].includes(p)) throw new BadRequestError('Prioridade inválida');
        fields.priority = p;
        if (core.status === 'NEW') fields.status = 'TRIAGE';
        action = 'PRIORITY_SET'; fromValue = core.priority; toValue = p;
        break;
      }
      case 'ASSIGN': {
        if (!isAdmin) throw new ForbiddenError('Apenas admin atribui responsável');
        const target = dto.value;
        if (!target) throw new BadRequestError('Informe o responsável');
        const ok = await this.repo.isActiveTeamUser(target);
        if (!ok) throw new BadRequestError('O responsável precisa ser um membro ativo da equipe');
        fields.assignee_id = target;
        if (core.status === 'NEW') fields.status = 'TRIAGE';
        action = 'ASSIGNED'; fromValue = core.assigneeId; toValue = target;
        break;
      }
      default:
        throw new BadRequestError('Ação inválida');
    }

    await this.repo.applyUpdate(id, fields, { actorId: userId, action, fromValue, toValue },
      dto.comment && dto.comment.trim() ? { authorId: userId, body: dto.comment } : null);
    return this.repo.findListItem(id);
  }

  async addComment(id: string, userId: string, userRole: string | undefined, body: string, internal?: boolean) {
    const core = await this.repo.getCore(id);
    if (!core) throw new NotFoundError('Demanda não encontrada');
    const m = await this.getMembership(userId, userRole);
    if (!m.isTeam && core.reporterId !== userId) throw new ForbiddenError('Sem acesso a esta demanda');
    return this.repo.addComment(id, userId, body, !!(internal && m.isTeam));
  }

  async toggleVote(id: string, userId: string) {
    const core = await this.repo.getCore(id);
    if (!core) throw new NotFoundError('Demanda não encontrada');
    if (core.type !== 'SUGGESTION' || ['CLOSED', 'REJECTED'].includes(core.status)) {
      throw new BadRequestError('Esta demanda não aceita votos');
    }
    return this.repo.toggleVote(id, userId);
  }

  async mural(viewerId: string | null) {
    return { suggestions: await this.repo.listMural(viewerId), loggedIn: !!viewerId };
  }

  // ---------- Equipe ----------
  async listTeam(userId: string, userRole?: string) {
    const m = await this.getMembership(userId, userRole);
    if (!m.isTeam) throw new ForbiddenError('Apenas a equipe');
    const rows = await this.repo.listTeamMembers();
    const members = rows.map((r) => ({
      id: r.id, role: r.role, active: r.active,
      user: { id: r.user_id, name: r.name, email: r.email, role: r.user_role, openAssigned: Number(r.open_assigned) },
    }));
    const implicit = await this.repo.listImplicitAdmins();
    const implicitAdmins = implicit.map((r) => ({
      id: null, role: 'ADMIN', active: true,
      user: { id: r.user_id, name: r.name, email: r.email, role: r.user_role, openAssigned: Number(r.open_assigned) },
    }));
    return { members, implicitAdmins };
  }

  async searchUsers(q: string) {
    if (!q || q.trim().length < 3) throw new BadRequestError('Digite ao menos 3 caracteres');
    const rows = await this.repo.searchUsers(q.trim());
    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isMember: !!u.member_id }));
  }

  async addTeamMember(userId: string, role: string) {
    await this.repo.upsertMember(userId, role || 'DEV');
  }

  async updateTeamMember(memberId: string, patch: { role?: string; active?: boolean }) {
    await this.repo.updateMember(memberId, patch);
  }

  // ---------- Admin ----------
  async adminOverview(): Promise<AdminOverview> {
    const counts = await this.repo.countsByStatus();
    const open = await this.repo.openTicketsForAging();
    const now = Date.now();
    const aging = open.map((t) => {
      const slaDays = t.priority ? (SLA_DAYS[t.priority as TicketPriority] ?? TRIAGE_SLA_DAYS) : TRIAGE_SLA_DAYS;
      const deadline = new Date(t.created_at).getTime() + slaDays * 86400000;
      const overdueDays = Math.max(0, Math.floor((now - deadline) / 86400000));
      return { id: t.id, code: t.code, title: t.title, priority: t.priority ?? null, status: t.status, slaDays, overdue: now > deadline, overdueDays };
    }).sort((a, b) => b.overdueDays - a.overdueDays);
    const { avgHours, resolvedLast90 } = await this.repo.avgResolutionHours();
    return { counts, aging, avgResolutionHours: avgHours, resolvedLast90 };
  }

  // ---------- Cron (auto-confirm) ----------
  async autoConfirmStale(): Promise<{ autoConfirmed: number }> {
    const stale = await this.repo.findStaleAwaiting(AUTO_CONFIRM_DAYS);
    for (const t of stale) {
      await this.repo.applyUpdate(t.id,
        { status: 'RESOLVED', confirmed_at: new Date().toISOString() },
        { actorId: null, action: 'CONFIRMED', fromValue: 'AWAITING_CONFIRMATION', toValue: 'RESOLVED:AUTO' });
    }
    return { autoConfirmed: stale.length };
  }
}
