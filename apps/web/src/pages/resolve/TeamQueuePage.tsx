import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { TicketCard } from '../../components/resolve/TicketCard';
import { useTickets, useResolveMe, useTeam, useTicketAction } from '../../hooks/useResolve';
import type { TicketListItem } from '@ejr/shared-types';
import { useAuth } from '../../hooks/useAuth';

const COLUMNS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: 'new', label: '🔵 Novos', statuses: ['NEW'] },
  { key: 'triage', label: '🟣 Em triagem', statuses: ['TRIAGE'] },
  { key: 'progress', label: '🟡 Em andamento', statuses: ['IN_PROGRESS', 'REOPENED'] },
  { key: 'awaiting', label: '🟠 Aguardando confirmação', statuses: ['AWAITING_CONFIRMATION'] },
];

export function TeamQueuePage() {
  const { data: me, isLoading: meLoading } = useResolveMe();
  const { data, isLoading } = useTickets('all', { enabled: !!me?.isTeam });
  const { data: team } = useTeam({ enabled: !!me?.isAdmin });
  const action = useTicketAction();
  const user = useAuth((s) => s.user);

  const [type, setType] = useState('');
  const [mineOnly, setMineOnly] = useState(false);

  const tickets = useMemo(() => {
    let list = data?.tickets || [];
    if (type) list = list.filter((t) => t.type === type);
    if (mineOnly && user) list = list.filter((t) => t.assignee?.id === user.id);
    return list;
  }, [data, type, mineOnly, user]);

  if (meLoading) return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Carregando…</div>;
  if (!me?.isTeam) return <Navigate to="/resolve/meus" replace />;

  const assignOptions = [
    ...(team?.implicitAdmins || []).map((m) => ({ id: m.user.id, name: m.user.name })),
    ...(team?.members || []).filter((m) => m.active).map((m) => ({ id: m.user.id, name: m.user.name })),
  ];

  const doAssign = async (id: string, value: string) => {
    try { await action.mutateAsync({ id, action: 'ASSIGN', value }); toast.success('Responsável definido'); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erro'); }
  };

  const assignFooter = (t: TicketListItem) => me?.isAdmin ? (
    <select value={t.assignee?.id || ''} onChange={(e) => e.target.value && doAssign(t.id, e.target.value)}
      onClick={(e) => e.stopPropagation()} className="w-full text-xs px-2 py-1 border border-gray-200 rounded outline-none">
      <option value="">Atribuir…</option>
      {assignOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  ) : undefined;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ResolveNav />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
          <option value="">Todos os tipos</option><option value="BUG">🐛 Erros</option><option value="SUGGESTION">💡 Sugestões</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Só as minhas</label>
        <span className="text-xs text-gray-400 ml-auto">{tickets.length} em aberto</span>
      </div>

      {isLoading ? <div className="text-center py-16 text-gray-400">Carregando…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = tickets.filter((t) => col.statuses.includes(t.status));
            return (
              <div key={col.key}>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">{col.label} <span className="text-gray-400">({items.length})</span></h3>
                <div className="space-y-2">
                  {items.map((t) => <TicketCard key={t.id} ticket={t} compact showReporter footer={assignFooter(t)} />)}
                  {items.length === 0 && <p className="text-xs text-gray-300 py-4 text-center">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
