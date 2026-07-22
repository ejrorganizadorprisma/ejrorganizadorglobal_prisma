import { Link } from 'react-router-dom';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { TicketCard } from '../../components/resolve/TicketCard';
import { useTickets } from '../../hooks/useResolve';
import type { TicketListItem } from '@ejr/shared-types';
import { Plus, Inbox } from 'lucide-react';

export function MyTicketsPage() {
  const { data, isLoading } = useTickets();
  const tickets = data?.tickets || [];
  const awaiting = tickets.filter((t) => t.status === 'AWAITING_CONFIRMATION');
  const open = tickets.filter((t) => ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'].includes(t.status));
  const done = tickets.filter((t) => ['RESOLVED', 'CLOSED', 'REJECTED'].includes(t.status));

  const Section = ({ title, items, accent }: { title: string; items: TicketListItem[]; accent?: string }) =>
    items.length === 0 ? null : (
      <div className="mb-6">
        <h2 className={`text-sm font-semibold mb-2 ${accent || 'text-gray-500'}`}>{title} ({items.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{items.map((t) => <TicketCard key={t.id} ticket={t} />)}</div>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <ResolveNav />
      <div className="flex justify-end mb-4">
        <Link to="/resolve/novo" className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Nova demanda</Link>
      </div>
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Você ainda não abriu nenhuma demanda.</p>
        </div>
      ) : (
        <>
          <Section title="Aguardando sua confirmação" items={awaiting} accent="text-orange-600" />
          <Section title="Em aberto" items={open} />
          <Section title="Finalizadas" items={done} accent="text-gray-400" />
        </>
      )}
    </div>
  );
}
