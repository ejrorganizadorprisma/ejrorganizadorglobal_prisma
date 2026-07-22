import { db } from '../config/database';
import type { TicketDetail, TicketListItem, TicketComment, TicketEvent, MuralSuggestion } from '@ejr/shared-types';

const rid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

function mapListItem(r: any): TicketListItem {
  return {
    id: r.id,
    code: r.code,
    type: r.type,
    title: r.title,
    platform: r.platform,
    priority: r.priority ?? null,
    status: r.status,
    url: r.url ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at ?? null,
    confirmedAt: r.confirmed_at ?? null,
    closedAt: r.closed_at ?? null,
    reporter: { id: r.reporter_id, name: r.reporter_name },
    assignee: r.assignee_id ? { id: r.assignee_id, name: r.assignee_name } : null,
    commentsCount: Number(r.comments_count ?? 0),
  };
}

const LIST_SELECT = `
  SELECT t.*,
    ru.name AS reporter_name,
    au.name AS assignee_name,
    (SELECT count(*) FROM ticket_comments c WHERE c.ticket_id = t.id) AS comments_count
  FROM tickets t
  JOIN users ru ON ru.id = t.reporter_id
  LEFT JOIN users au ON au.id = t.assignee_id`;

export class ResolveRepository {
  // ---------- Membership ----------
  async getTeamMember(userId: string): Promise<{ role: string; active: boolean } | null> {
    const r = await db.query('SELECT role, active FROM resolve_team_members WHERE user_id = $1', [userId]);
    return r.rows[0] || null;
  }

  // ---------- Tickets ----------
  async create(dto: { type: string; title: string; description: string; platform: string; url?: string; severity?: string }, reporterId: string): Promise<TicketListItem> {
    const id = rid('tkt');
    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO tickets (id, type, title, description, platform, url, severity, reporter_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'NEW')`,
        [id, dto.type, dto.title, dto.description, dto.platform, dto.url || null, dto.severity || null, reporterId]
      );
      await client.query(
        `INSERT INTO ticket_events (id, ticket_id, actor_id, action, to_value) VALUES ($1,$2,$3,'CREATED','NEW')`,
        [rid('tevt'), id, reporterId]
      );
    });
    return (await this.findListItem(id))!;
  }

  async findListItem(id: string): Promise<TicketListItem | null> {
    const r = await db.query(`${LIST_SELECT} WHERE t.id = $1`, [id]);
    return r.rows[0] ? mapListItem(r.rows[0]) : null;
  }

  async listMine(userId: string): Promise<TicketListItem[]> {
    const r = await db.query(`${LIST_SELECT} WHERE t.reporter_id = $1 ORDER BY t.created_at DESC`, [userId]);
    return r.rows.map(mapListItem);
  }

  async listAll(): Promise<TicketListItem[]> {
    const r = await db.query(`${LIST_SELECT} ORDER BY t.status ASC, t.created_at DESC`);
    return r.rows.map(mapListItem);
  }

  /** Núcleo do ticket para a máquina de estados. */
  async getCore(id: string): Promise<{ id: string; code: number; type: string; status: string; reporterId: string; assigneeId: string | null; resolvedById: string | null; priority: string | null } | null> {
    const r = await db.query('SELECT id, code, type, status, reporter_id, assignee_id, resolved_by_id, priority FROM tickets WHERE id = $1', [id]);
    const t = r.rows[0];
    if (!t) return null;
    return { id: t.id, code: t.code, type: t.type, status: t.status, reporterId: t.reporter_id, assigneeId: t.assignee_id, resolvedById: t.resolved_by_id, priority: t.priority };
  }

  async findDetail(id: string, includeInternal: boolean): Promise<TicketDetail | null> {
    const base = await db.query(
      `SELECT t.*, ru.name AS reporter_name, ru.role AS reporter_role,
              au.name AS assignee_name, rbu.id AS resolved_by_id2, rbu.name AS resolved_by_name,
              (SELECT count(*) FROM ticket_comments c WHERE c.ticket_id = t.id) AS comments_count
         FROM tickets t
         JOIN users ru ON ru.id = t.reporter_id
         LEFT JOIN users au ON au.id = t.assignee_id
         LEFT JOIN users rbu ON rbu.id = t.resolved_by_id
        WHERE t.id = $1`, [id]);
    const r = base.rows[0];
    if (!r) return null;

    const commentsQ = await db.query(
      `SELECT c.id, c.body, c.internal, c.created_at, c.author_id, u.name AS author_name
         FROM ticket_comments c JOIN users u ON u.id = c.author_id
        WHERE c.ticket_id = $1 ${includeInternal ? '' : 'AND c.internal = false'}
        ORDER BY c.created_at ASC`, [id]);
    const comments: TicketComment[] = commentsQ.rows.map((c) => ({
      id: c.id, body: c.body, internal: c.internal, createdAt: c.created_at,
      author: { id: c.author_id, name: c.author_name },
    }));

    const eventsQ = await db.query(
      `SELECT e.id, e.action, e.from_value, e.to_value, e.created_at, e.actor_id, u.name AS actor_name
         FROM ticket_events e LEFT JOIN users u ON u.id = e.actor_id
        WHERE e.ticket_id = $1 ORDER BY e.created_at ASC`, [id]);
    const events: TicketEvent[] = eventsQ.rows.map((e) => ({
      id: e.id, action: e.action, fromValue: e.from_value, toValue: e.to_value, createdAt: e.created_at,
      actor: e.actor_id ? { id: e.actor_id, name: e.actor_name } : null,
    }));

    return {
      ...mapListItem(r),
      description: r.description,
      severity: r.severity ?? null,
      reporter: { id: r.reporter_id, name: r.reporter_name, role: r.reporter_role },
      resolvedBy: r.resolved_by_id2 ? { id: r.resolved_by_id2, name: r.resolved_by_name } : null,
      comments,
      events,
    };
  }

  /** Aplica um update + grava evento (+ comentário público opcional) atomicamente. */
  async applyUpdate(
    id: string,
    fields: Record<string, any>,
    event: { actorId: string | null; action: string; fromValue?: string | null; toValue?: string | null },
    comment?: { authorId: string; body: string } | null
  ): Promise<void> {
    await db.transaction(async (client) => {
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(fields)) { sets.push(`${k} = $${i++}`); vals.push(v); }
      sets.push('updated_at = NOW()');
      vals.push(id);
      await client.query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = $${i}`, vals);
      await client.query(
        `INSERT INTO ticket_events (id, ticket_id, actor_id, action, from_value, to_value) VALUES ($1,$2,$3,$4,$5,$6)`,
        [rid('tevt'), id, event.actorId, event.action, event.fromValue ?? null, event.toValue ?? null]
      );
      if (comment && comment.body.trim()) {
        await client.query(
          `INSERT INTO ticket_comments (id, ticket_id, author_id, body, internal) VALUES ($1,$2,$3,$4,false)`,
          [rid('tcmt'), id, comment.authorId, comment.body.trim()]
        );
      }
    });
  }

  async addComment(ticketId: string, authorId: string, body: string, internal: boolean): Promise<TicketComment> {
    const id = rid('tcmt');
    await db.query(
      `INSERT INTO ticket_comments (id, ticket_id, author_id, body, internal) VALUES ($1,$2,$3,$4,$5)`,
      [id, ticketId, authorId, body.trim(), internal]
    );
    const r = await db.query(`SELECT c.id,c.body,c.internal,c.created_at,c.author_id,u.name AS author_name FROM ticket_comments c JOIN users u ON u.id=c.author_id WHERE c.id=$1`, [id]);
    const c = r.rows[0];
    return { id: c.id, body: c.body, internal: c.internal, createdAt: c.created_at, author: { id: c.author_id, name: c.author_name } };
  }

  // ---------- Votos / Mural ----------
  async toggleVote(ticketId: string, userId: string): Promise<{ voted: boolean; votes: number }> {
    const existing = await db.query('SELECT 1 FROM ticket_votes WHERE ticket_id=$1 AND user_id=$2', [ticketId, userId]);
    let voted: boolean;
    if (existing.rows.length) {
      await db.query('DELETE FROM ticket_votes WHERE ticket_id=$1 AND user_id=$2', [ticketId, userId]);
      voted = false;
    } else {
      await db.query('INSERT INTO ticket_votes (ticket_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ticketId, userId]);
      voted = true;
    }
    const cnt = await db.query('SELECT count(*) AS n FROM ticket_votes WHERE ticket_id=$1', [ticketId]);
    return { voted, votes: Number(cnt.rows[0].n) };
  }

  async listMural(viewerId: string | null): Promise<MuralSuggestion[]> {
    const r = await db.query(
      `SELECT t.id, t.code, t.title, t.description, t.platform, t.status, t.created_at,
              ru.name AS reporter_name,
              (SELECT count(*) FROM ticket_votes v WHERE v.ticket_id=t.id) AS votes,
              ${viewerId ? `EXISTS (SELECT 1 FROM ticket_votes v2 WHERE v2.ticket_id=t.id AND v2.user_id=$1)` : 'false'} AS voted
         FROM tickets t JOIN users ru ON ru.id=t.reporter_id
        WHERE t.type='SUGGESTION' AND t.status NOT IN ('CLOSED','REJECTED')
        ORDER BY votes DESC, t.created_at DESC
        LIMIT 100`,
      viewerId ? [viewerId] : []
    );
    return r.rows.map((s) => ({
      id: s.id, code: s.code, title: s.title, description: s.description, platform: s.platform,
      status: s.status, createdAt: s.created_at, reporter: { name: s.reporter_name },
      votes: Number(s.votes), votedByMe: !!s.voted,
    }));
  }

  // ---------- Equipe ----------
  async listTeamMembers(): Promise<any[]> {
    const r = await db.query(
      `SELECT m.id, m.role, m.active, u.id AS user_id, u.name, u.email, u.role AS user_role,
              (SELECT count(*) FROM tickets t WHERE t.assignee_id=u.id AND t.status IN ('NEW','TRIAGE','IN_PROGRESS','REOPENED')) AS open_assigned
         FROM resolve_team_members m JOIN users u ON u.id=m.user_id
        ORDER BY m.active DESC, u.name ASC`);
    return r.rows;
  }

  async listImplicitAdmins(): Promise<any[]> {
    // OWNER é o super-admin implícito (equivalente ao EJR_ADMIN do Hub)
    const r = await db.query(
      `SELECT u.id AS user_id, u.name, u.email, u.role AS user_role,
              (SELECT count(*) FROM tickets t WHERE t.assignee_id=u.id AND t.status IN ('NEW','TRIAGE','IN_PROGRESS','REOPENED')) AS open_assigned
         FROM users u
        WHERE u.role='OWNER' AND u.is_active=true
          AND NOT EXISTS (SELECT 1 FROM resolve_team_members m WHERE m.user_id=u.id)
        ORDER BY u.name ASC`);
    return r.rows;
  }

  async searchUsers(q: string): Promise<any[]> {
    const r = await db.query(
      `SELECT u.id, u.name, u.email, u.role,
              (SELECT m.id FROM resolve_team_members m WHERE m.user_id=u.id) AS member_id
         FROM users u
        WHERE u.is_active=true AND (u.name ILIKE $1 OR u.email ILIKE $1)
        ORDER BY u.name ASC LIMIT 10`, [`%${q}%`]);
    return r.rows;
  }

  async upsertMember(userId: string, role: string): Promise<void> {
    await db.query(
      `INSERT INTO resolve_team_members (id, user_id, role, active) VALUES ($1,$2,$3,true)
       ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role, active=true`,
      [rid('rtm'), userId, role]
    );
  }

  async updateMember(memberId: string, patch: { role?: string; active?: boolean }): Promise<void> {
    const sets: string[] = []; const vals: any[] = []; let i = 1;
    if (patch.role !== undefined) { sets.push(`role=$${i++}`); vals.push(patch.role); }
    if (patch.active !== undefined) { sets.push(`active=$${i++}`); vals.push(patch.active); }
    if (!sets.length) return;
    vals.push(memberId);
    await db.query(`UPDATE resolve_team_members SET ${sets.join(', ')} WHERE id=$${i}`, vals);
  }

  async isActiveTeamUser(userId: string): Promise<boolean> {
    const r = await db.query(
      `SELECT 1 FROM users u WHERE u.id=$1 AND u.is_active=true AND (u.role='OWNER' OR EXISTS (SELECT 1 FROM resolve_team_members m WHERE m.user_id=u.id AND m.active=true))`,
      [userId]);
    return r.rows.length > 0;
  }

  // ---------- Admin overview ----------
  async countsByStatus(): Promise<Record<string, number>> {
    const r = await db.query('SELECT status, count(*) AS n FROM tickets GROUP BY status');
    const out: Record<string, number> = {};
    for (const row of r.rows) out[row.status] = Number(row.n);
    return out;
  }

  async openTicketsForAging(): Promise<any[]> {
    const r = await db.query(
      `SELECT id, code, title, priority, status, created_at FROM tickets
        WHERE status IN ('NEW','TRIAGE','IN_PROGRESS','REOPENED')`);
    return r.rows;
  }

  async avgResolutionHours(): Promise<{ avgHours: number | null; resolvedLast90: number }> {
    const r = await db.query(
      `SELECT count(*) AS n, avg(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600.0) AS avg_h
         FROM tickets WHERE resolved_at IS NOT NULL AND resolved_at > NOW() - INTERVAL '90 days'`);
    const row = r.rows[0];
    return { avgHours: row.avg_h != null ? Math.round(Number(row.avg_h)) : null, resolvedLast90: Number(row.n) };
  }

  // ---------- Cron ----------
  async findStaleAwaiting(days: number): Promise<Array<{ id: string; reporterId: string }>> {
    const r = await db.query(
      `SELECT id, reporter_id FROM tickets
        WHERE status='AWAITING_CONFIRMATION' AND resolved_at < NOW() - ($1 || ' days')::interval`,
      [String(days)]);
    return r.rows.map((t) => ({ id: t.id, reporterId: t.reporter_id }));
  }
}
