import { Link } from 'react-router-dom';
import { formatTicketCode, platformLabel } from '@ejr/shared-types';
import type { TicketListItem } from '@ejr/shared-types';
import { StatusBadge, PriorityBadge, TypeBadge } from './badges';
import { MessageSquare, User } from 'lucide-react';

export function TicketCard({
  ticket, showReporter = false, compact = false, footer,
}: { ticket: TicketListItem; showReporter?: boolean; compact?: boolean; footer?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all">
      <Link to={`/resolve/t/${ticket.id}`} className={`block ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-semibold text-indigo-600 flex-shrink-0">{formatTicketCode(ticket.code)}</span>
            <TypeBadge type={ticket.type} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <StatusBadge status={ticket.status} withDot={!compact} />
        </div>
        <p className={`font-medium text-gray-900 ${compact ? 'text-sm line-clamp-2' : ''}`}>{ticket.title}</p>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
          <span>{platformLabel(ticket.platform)}</span>
          {showReporter && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.reporter.name}</span>}
          {ticket.assignee && <span>→ {ticket.assignee.name}</span>}
          {ticket.commentsCount > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {ticket.commentsCount}</span>}
          <span className="ml-auto">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
      </Link>
      {footer && <div className="px-3 pb-3 -mt-1">{footer}</div>}
    </div>
  );
}
