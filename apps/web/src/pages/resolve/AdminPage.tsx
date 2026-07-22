import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { useAdminOverview, useResolveMe, useTeam, useSearchTeamUsers, useAddTeamMember, useUpdateTeamMember } from '../../hooks/useResolve';
import { TICKET_STATUS_META, formatTicketCode } from '@ejr/shared-types';
import type { TicketStatus } from '@ejr/shared-types';
import { Search, ShieldCheck } from 'lucide-react';

const COUNT_ORDER: TicketStatus[] = ['NEW', 'TRIAGE', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED'];

export function AdminPage() {
  const { data: me, isLoading: meLoading } = useResolveMe();
  const { data: ov } = useAdminOverview({ enabled: !!me?.isAdmin });
  const { data: team } = useTeam({ enabled: !!me?.isAdmin });
  const search = useSearchTeamUsers();
  const addMember = useAddTeamMember();
  const updateMember = useUpdateTeamMember();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);

  if (meLoading) return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Carregando…</div>;
  if (!me?.isAdmin) return <Navigate to="/resolve" replace />;

  const doSearch = async () => {
    if (q.trim().length < 3) { toast.error('Digite ao menos 3 caracteres'); return; }
    try { setResults(await search.mutateAsync(q.trim())); } catch (e: any) { toast.error(e.response?.data?.message || 'Erro'); }
  };
  const add = async (userId: string, role: string) => {
    try { await addMember.mutateAsync({ userId, role }); toast.success('Adicionado à equipe'); setResults([]); setQ(''); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erro'); }
  };
  const change = async (patch: { memberId: string; role?: string; active?: boolean }) => {
    try { await updateMember.mutateAsync(patch); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao atualizar membro'); }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <ResolveNav />

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Métricas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {COUNT_ORDER.filter((s) => ov?.counts?.[s]).map((s) => (
          <div key={s} className="p-3 rounded-xl bg-white border border-gray-200">
            <div className={`w-2 h-2 rounded-full mb-1 ${TICKET_STATUS_META[s].dot}`} />
            <p className="text-2xl font-bold text-gray-900">{ov?.counts?.[s] || 0}</p>
            <p className="text-xs text-gray-500">{TICKET_STATUS_META[s].label}</p>
          </div>
        ))}
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <p className="text-2xl font-bold text-indigo-700">{ov?.avgResolutionHours ?? '—'}{ov?.avgResolutionHours != null ? 'h' : ''}</p>
          <p className="text-xs text-indigo-600">Tempo médio (90d)</p>
        </div>
      </div>

      {(ov?.aging?.filter((a) => a.overdue).length || 0) > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Atrasadas (SLA: P1 1d · P2 3d · P3 7d · P4 30d · sem prioridade 2d)</h2>
          <div className="space-y-1">
            {ov!.aging.filter((a) => a.overdue).map((a) => (
              <Link key={a.id} to={`/resolve/t/${a.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100 hover:border-red-300">
                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">{a.overdueDays}d atrasada</span>
                <span className="text-xs font-mono text-indigo-600">{formatTicketCode(a.code)}</span>
                <span className="text-sm text-gray-800 truncate">{a.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Equipe</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Buscar usuário por nome ou email…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <button onClick={doSearch} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">Buscar</button>
        </div>
        {results.map((u) => (
          <div key={u.id} className="flex items-center justify-between py-2 border-t border-gray-100 text-sm">
            <div><span className="font-medium">{u.name}</span> <span className="text-gray-400">{u.email}</span></div>
            {u.isMember ? <span className="text-xs text-gray-400">já é membro</span> : (
              <div className="flex gap-1">
                <button onClick={() => add(u.id, 'DEV')} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">+ Dev</button>
                <button onClick={() => add(u.id, 'ADMIN')} className="px-2 py-1 text-xs bg-violet-50 text-violet-700 rounded hover:bg-violet-100">+ Admin</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {(team?.implicitAdmins || []).map((m) => (
          <div key={m.user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 text-sm">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-violet-500" /><span className="font-medium">{m.user.name}</span><span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">Admin (Proprietário)</span></div>
            <span className="text-xs text-gray-400">{m.user.openAssigned || 0} em aberto</span>
          </div>
        ))}
        {(team?.members || []).map((m) => (
          <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${m.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
            <div className="flex items-center gap-2"><span className="font-medium">{m.user.name}</span><span className="text-xs text-gray-400">{m.user.email}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{m.user.openAssigned || 0} em aberto</span>
              <select value={m.role} onChange={(e) => change({ memberId: m.id, role: e.target.value })} className="text-xs px-2 py-1 border border-gray-200 rounded"><option value="DEV">Dev</option><option value="ADMIN">Admin</option></select>
              <button onClick={() => change({ memberId: m.id, active: !m.active })} className={`text-xs px-2 py-1 rounded ${m.active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.active ? 'Desativar' : 'Reativar'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
