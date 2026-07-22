import { z } from 'zod';

// ==================== ENUMS ====================
export type TicketType = 'BUG' | 'SUGGESTION';
export type TicketStatus =
  | 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'AWAITING_CONFIRMATION'
  | 'RESOLVED' | 'REOPENED' | 'CLOSED' | 'REJECTED';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type ResolveRole = 'DEV' | 'ADMIN';
export type TicketSeverity = 'BLOCKING' | 'ANNOYING' | 'MINOR';

// ==================== CONSTANTES DE DOMÍNIO ====================
export const RESOLVE_PLATFORMS: Array<{ slug: string; label: string }> = [
  { slug: 'ejrorganizador', label: 'EJR Organizador (plataforma principal)' },
  { slug: 'mobile', label: 'App Mobile (vendedores)' },
  { slug: 'ejr-hub', label: 'EJR Hub' },
  { slug: 'roboplay', label: 'RoboPlay' },
  { slug: 'outro', label: 'Outro' },
];
export function platformLabel(slug?: string | null): string {
  if (!slug) return '—';
  return RESOLVE_PLATFORMS.find((p) => p.slug === slug)?.label ?? slug;
}

export const TICKET_TYPE_META: Record<TicketType, { label: string; emoji: string }> = {
  BUG: { label: 'Erro', emoji: '🐛' },
  SUGGESTION: { label: 'Sugestão', emoji: '💡' },
};

export const TICKET_SEVERITIES: Array<{ value: TicketSeverity; label: string }> = [
  { value: 'BLOCKING', label: 'Não consigo usar' },
  { value: 'ANNOYING', label: 'Atrapalha, mas dá para usar' },
  { value: 'MINOR', label: 'Detalhe / melhoria visual' },
];
export function severityLabel(value?: string | null): string | null {
  if (!value) return null;
  return TICKET_SEVERITIES.find((s) => s.value === value)?.label ?? value;
}

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; dot: string; badge: string; description: string }> = {
  NEW: { label: 'Novo', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', description: 'Recebido, aguardando triagem da equipe' },
  TRIAGE: { label: 'Em triagem', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200', description: 'A equipe está analisando a demanda' },
  IN_PROGRESS: { label: 'Em andamento', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', description: 'Um desenvolvedor está trabalhando nisso' },
  AWAITING_CONFIRMATION: { label: 'Aguardando sua confirmação', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200', description: 'Resolvido pela equipe — confirme se funcionou' },
  RESOLVED: { label: 'Resolvido', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', description: 'Resolução confirmada' },
  REOPENED: { label: 'Reaberto', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200', description: 'O problema voltou ou não foi resolvido' },
  CLOSED: { label: 'Encerrado', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200', description: 'Encerrado sem alteração (duplicado, não reproduzido...)' },
  REJECTED: { label: 'Não acatado', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200', description: 'Sugestão analisada e não acatada' },
};
export function statusLabel(status: TicketStatus): string {
  return TICKET_STATUS_META[status]?.label ?? status;
}

export const TICKET_PRIORITY_META: Record<TicketPriority, { label: string; badge: string }> = {
  P1: { label: 'P1 · Crítico', badge: 'bg-red-100 text-red-700 border-red-200' },
  P2: { label: 'P2 · Alto', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  P3: { label: 'P3 · Médio', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  P4: { label: 'P4 · Baixo', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export const EVENT_ACTION_LABELS: Record<string, string> = {
  CREATED: 'criou a demanda',
  STATUS_CHANGED: 'alterou o status',
  RESOLVED: 'marcou como resolvida',
  CONFIRMED: 'confirmou a resolução',
  REOPENED: 'reabriu a demanda',
  CLOSED: 'encerrou a demanda',
  REJECTED: 'recusou a sugestão',
  PRIORITY_SET: 'definiu a prioridade',
  ASSIGNED: 'atribuiu a demanda',
};

export function formatTicketCode(code: number): string {
  return `RES-${String(code).padStart(4, '0')}`;
}

// SLA (dias-alvo por prioridade); sem prioridade = triagem em 2 dias
export const SLA_DAYS: Record<TicketPriority, number> = { P1: 1, P2: 3, P3: 7, P4: 30 };
export const TRIAGE_SLA_DAYS = 2;
export const AUTO_CONFIRM_DAYS = 7;

export const OPEN_STATUSES: TicketStatus[] = ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'];

// ==================== INTERFACES ====================
export interface ResolveMembership { isTeam: boolean; isAdmin: boolean; }

export interface TicketListItem {
  id: string;
  code: number;
  type: TicketType;
  title: string;
  platform: string;
  priority: TicketPriority | null;
  status: TicketStatus;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  confirmedAt: string | null;
  closedAt: string | null;
  reporter: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  commentsCount: number;
}

export interface TicketComment {
  id: string;
  body: string;
  internal: boolean;
  createdAt: string;
  author: { id: string; name: string };
}

export interface TicketEvent {
  id: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  severity: string | null;
  reporter: { id: string; name: string; role?: string };
  resolvedBy: { id: string; name: string } | null;
  comments: TicketComment[];
  events: TicketEvent[];
}

export interface ResolveTeamMember {
  id: string;
  role: ResolveRole;
  active: boolean;
  user: { id: string; name: string; email: string | null; role: string; openAssigned?: number };
}

export interface MuralSuggestion {
  id: string;
  code: number;
  title: string;
  description: string;
  platform: string;
  status: TicketStatus;
  createdAt: string;
  reporter: { name: string };
  votes: number;
  votedByMe: boolean;
}

export interface AdminOverview {
  counts: Record<string, number>;
  aging: Array<{ id: string; code: number; title: string; priority: TicketPriority | null; status: TicketStatus; slaDays: number; overdue: boolean; overdueDays: number }>;
  avgResolutionHours: number | null;
  resolvedLast90: number;
}

// ==================== SCHEMAS (Zod) ====================
export const createTicketSchema = z.object({
  type: z.enum(['BUG', 'SUGGESTION']),
  title: z.string().trim().min(5, 'Título muito curto').max(160),
  description: z.string().trim().min(10, 'Descreva com mais detalhes'),
  platform: z.string().trim().min(1),
  url: z.string().trim().optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^https?:\/\//i.test(v), 'A URL deve começar com http:// ou https://'),
  severity: z.enum(['BLOCKING', 'ANNOYING', 'MINOR']).optional(),
});
export type CreateTicketDTO = z.infer<typeof createTicketSchema>;

export const ticketActionSchema = z.object({
  action: z.enum(['START', 'RESOLVE', 'CONFIRM', 'REOPEN', 'CLOSE', 'REJECT', 'SET_PRIORITY', 'ASSIGN']),
  value: z.string().optional(),
  comment: z.string().optional(),
});
export type TicketActionDTO = z.infer<typeof ticketActionSchema>;

export const addCommentSchema = z.object({
  body: z.string().trim().min(1, 'Escreva algo'),
  internal: z.boolean().optional(),
});
export type AddCommentDTO = z.infer<typeof addCommentSchema>;

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['DEV', 'ADMIN']).default('DEV'),
});
export const updateTeamMemberSchema = z.object({
  role: z.enum(['DEV', 'ADMIN']).optional(),
  active: z.boolean().optional(),
});
