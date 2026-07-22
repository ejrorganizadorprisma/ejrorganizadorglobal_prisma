import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { StatusBadge, TypeBadge } from '../../components/resolve/badges';
import { useTickets, useResolveMe } from '../../hooks/useResolve';
import { formatTicketCode, platformLabel } from '@ejr/shared-types';
import { Search } from 'lucide-react';

const FINAL = ['RESOLVED', 'CLOSED', 'REJECTED'];
function finalizedAt(t: any): string {
  if (t.status === 'RESOLVED') return t.confirmedAt || t.resolvedAt || t.updatedAt;
  return t.closedAt || t.updatedAt;
}

export function HistoryPage() {
  const { data: me, isLoading: meLoading } = useResolveMe();
  const { data, isLoading } = useTickets('all', { enabled: !!me?.isTeam });
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    let list = (data?.tickets || []).filter((t) => FINAL.includes(t.status));
    if (type) list = list.filter((t) => t.type === type);
    if (status) list = list.filter((t) => t.status === status);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((t) => formatTicketCode(t.code).toLowerCase().includes(s) || t.title.toLowerCase().includes(s) || t.reporter.name.toLowerCase().includes(s));
    }
    return list.sort((a, b) => new Date(finalizedAt(b)).getTime() - new Date(finalizedAt(a)).getTime());
  }, [data, q, type, status]);

  if (meLoading) return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Carregando…</div>;
  if (!me?.isTeam) return <Navigate to="/resolve/meus" replace />;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <ResolveNav />
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, título ou pessoa…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">Tipo</option><option value="BUG">🐛 Erro</option><option value="SUGGESTION">💡 Sugestão</option></select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">Status</option><option value="RESOLVED">Resolvido</option><option value="CLOSED">Encerrado</option><option value="REJECTED">Não acatado</option></select>
      </div>
      {isLoading ? <div className="text-center py-16 text-gray-400">Carregando…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="px-4 py-2 text-left">Código</th><th className="px-4 py-2 text-left">Tipo</th><th className="px-4 py-2 text-left">Título</th><th className="px-4 py-2 text-left">Plataforma</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Finalizada</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-indigo-50/30">
                  <td className="px-4 py-2"><Link to={`/resolve/t/${t.id}`} className="font-mono text-indigo-600">{formatTicketCode(t.code)}</Link></td>
                  <td className="px-4 py-2"><TypeBadge type={t.type} /></td>
                  <td className="px-4 py-2 max-w-xs truncate">{t.title}</td>
                  <td className="px-4 py-2 text-gray-500">{platformLabel(t.platform)}</td>
                  <td className="px-4 py-2"><StatusBadge status={t.status} withDot={false} /></td>
                  <td className="px-4 py-2 text-gray-500">{new Date(finalizedAt(t)).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhuma demanda finalizada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
