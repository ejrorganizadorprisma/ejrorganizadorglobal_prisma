import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTicket, useTicketAction, useAddComment, useTeam } from '../../hooks/useResolve';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge, PriorityBadge, TypeBadge } from '../../components/resolve/badges';
import {
  formatTicketCode, platformLabel, severityLabel, TICKET_STATUS_META, EVENT_ACTION_LABELS,
} from '@ejr/shared-types';
import { ArrowLeft, ExternalLink, Send, Lock } from 'lucide-react';
import { safeUrl } from '../../lib/safeUrl';

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useTicket(id!);
  const action = useTicketAction();
  const addComment = useAddComment();
  const user = useAuth((s) => s.user);
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);

  const isTeam = !!data?.membership?.isTeam;
  const isAdmin = !!data?.membership?.isAdmin;
  const { data: team } = useTeam({ enabled: isAdmin });

  if (isLoading) return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Carregando…</div>;
  if (!data?.ticket) return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Demanda não encontrada.</div>;
  const t = data.ticket;
  const isReporter = user?.id === t.reporter.id;

  const run = async (act: string, value?: string, cmt?: string) => {
    try { await action.mutateAsync({ id: t.id, action: act, value, comment: cmt }); toast.success('Atualizado'); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erro'); }
  };
  const reopen = () => { const why = window.prompt('Por que reabrir? (opcional)'); if (why === null) return; run('REOPEN', undefined, why || undefined); };
  const send = async () => {
    if (!comment.trim()) return;
    try { await addComment.mutateAsync({ id: t.id, body: comment.trim(), internal: internal && isTeam }); setComment(''); setInternal(false); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erro'); }
  };

  const assignOptions = [
    ...(team?.implicitAdmins || []).map((m) => ({ id: m.user.id, name: m.user.name })),
    ...(team?.members || []).filter((m) => m.active).map((m) => ({ id: m.user.id, name: m.user.name })),
  ];
  const meta = TICKET_STATUS_META[t.status];

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Link to="/resolve/meus" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Voltar</Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span className="text-sm font-mono font-bold text-indigo-600">{formatTicketCode(t.code)}</span>
          <TypeBadge type={t.type} /><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        {meta && <p className="text-sm text-gray-500 mt-0.5">{meta.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
          <span>{platformLabel(t.platform)}</span>
          <span>Aberto por {t.reporter.name} · {new Date(t.createdAt).toLocaleString('pt-BR')}</span>
          {t.severity && <span>Gravidade: {severityLabel(t.severity)}</span>}
          {t.assignee && <span>Responsável: {t.assignee.name}</span>}
          {t.resolvedBy && <span>Resolvido por: {t.resolvedBy.name}</span>}
          {safeUrl(t.url) && <a href={safeUrl(t.url)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Abrir local</a>}
        </div>
        <p className="mt-4 text-sm text-gray-800 whitespace-pre-wrap">{t.description}</p>
      </div>

      {/* Ações do reporter */}
      {isReporter && t.status === 'AWAITING_CONFIRMATION' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-orange-800 font-medium mb-2">A equipe marcou como resolvido. Funcionou?</p>
          <div className="flex gap-2">
            <button onClick={() => run('CONFIRM')} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Sim, resolvido</button>
            <button onClick={reopen} className="px-4 py-2 text-sm font-semibold bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100">Não, ainda tem erro</button>
          </div>
        </div>
      )}
      {isReporter && t.status === 'RESOLVED' && (
        <div className="mb-4"><button onClick={reopen} className="text-sm text-red-600 hover:underline">O problema voltou? Reabrir demanda</button></div>
      )}

      {/* Painel da equipe */}
      {isTeam && (
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-indigo-700 uppercase mb-3">Painel da equipe</p>
          <div className="flex flex-wrap gap-2 items-center">
            {['NEW', 'TRIAGE', 'REOPENED'].includes(t.status) && <button onClick={() => run('START')} className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600">Começar a trabalhar</button>}
            {['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'].includes(t.status) && <button onClick={() => run('RESOLVE', undefined, comment.trim() || undefined)} className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Marcar como resolvido</button>}
            {isAdmin && t.status === 'AWAITING_CONFIRMATION' && <button onClick={() => run('CONFIRM')} className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Confirmar resolução</button>}
            {isAdmin && ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED', 'AWAITING_CONFIRMATION'].includes(t.status) && <button onClick={() => run('CLOSE')} className="px-3 py-1.5 text-sm font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600">Encerrar</button>}
            {isAdmin && t.type === 'SUGGESTION' && ['NEW', 'TRIAGE', 'IN_PROGRESS', 'REOPENED'].includes(t.status) && <button onClick={() => run('REJECT')} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Não acatar</button>}
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-3 mt-3">
              <label className="text-xs text-gray-600">Prioridade:
                <select value={t.priority || ''} onChange={(e) => e.target.value && run('SET_PRIORITY', e.target.value)} className="ml-1 text-sm px-2 py-1 border border-gray-200 rounded">
                  <option value="">—</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600">Responsável:
                <select value={t.assignee?.id || ''} onChange={(e) => e.target.value && run('ASSIGN', e.target.value)} className="ml-1 text-sm px-2 py-1 border border-gray-200 rounded">
                  <option value="">—</option>{assignOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Conversa */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Conversa</p>
        <div className="space-y-3 mb-4">
          {t.comments.length === 0 && <p className="text-sm text-gray-400">Sem comentários ainda.</p>}
          {t.comments.map((c) => (
            <div key={c.id} className={`p-3 rounded-lg ${c.internal ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span className="font-medium text-gray-700">{c.author.name}</span>
                {c.internal && <span className="flex items-center gap-0.5 text-amber-600"><Lock className="w-3 h-3" /> nota interna</span>}
                <span className="ml-auto">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Escreva um comentário…" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          <button onClick={send} disabled={addComment.isPending || !comment.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1 text-sm"><Send className="w-4 h-4" /></button>
        </div>
        {isTeam && <label className="flex items-center gap-1.5 mt-2 text-xs text-gray-500"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Nota interna (só a equipe vê)</label>}
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Histórico</p>
        <div className="space-y-2">
          {t.events.map((e) => {
            const auto = e.toValue?.endsWith(':AUTO');
            return (
              <div key={e.id} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <span><span className="font-medium text-gray-700">{e.actor?.name || 'Sistema'}</span> {EVENT_ACTION_LABELS[e.action] || e.action}{auto && ' — automático'}</span>
                <span className="ml-auto">{new Date(e.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
