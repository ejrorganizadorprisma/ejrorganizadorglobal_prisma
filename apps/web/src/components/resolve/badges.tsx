import { TICKET_STATUS_META, TICKET_PRIORITY_META, TICKET_TYPE_META } from '@ejr/shared-types';
import type { TicketStatus, TicketPriority, TicketType } from '@ejr/shared-types';

export function StatusDot({ status }: { status: TicketStatus }) {
  const m = TICKET_STATUS_META[status];
  return <span className={`inline-block w-2 h-2 rounded-full ${m?.dot || 'bg-gray-400'}`} />;
}

export function StatusBadge({ status, withDot = true }: { status: TicketStatus; withDot?: boolean }) {
  const m = TICKET_STATUS_META[status];
  if (!m) return null;
  return (
    <span title={m.description} className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${m.badge}`}>
      {withDot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${m.dot}`} />}
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority | null }) {
  if (!priority) return null;
  const m = TICKET_PRIORITY_META[priority];
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${m.badge}`}>{m.label}</span>;
}

export function TypeBadge({ type }: { type: TicketType }) {
  const m = TICKET_TYPE_META[type];
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">{m.emoji} {m.label}</span>;
}
