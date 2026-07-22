import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { StatusBadge } from '../../components/resolve/badges';
import { useMural, useVote } from '../../hooks/useResolve';
import { formatTicketCode, platformLabel } from '@ejr/shared-types';
import { ThumbsUp } from 'lucide-react';

export function MuralPage() {
  const { data, isLoading } = useMural();
  const vote = useVote();
  const suggestions = data?.suggestions || [];

  const onVote = async (id: string) => {
    try { await vote.mutateAsync(id); } catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao votar'); }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <ResolveNav />
      <p className="text-sm text-gray-500 mb-4">Sugestões da comunidade. Vote 👍 nas que você também quer ver.</p>
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando…</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhuma sugestão ainda. <Link to="/resolve/novo?type=SUGGESTION" className="text-indigo-600 hover:underline">Seja o primeiro.</Link></div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="flex gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <button onClick={() => onVote(s.id)} disabled={vote.isPending}
                className={`flex flex-col items-center justify-center w-14 rounded-lg border transition-colors flex-shrink-0 ${s.votedByMe ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-bold">{s.votes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-indigo-600">{formatTicketCode(s.code)}</span>
                  <StatusBadge status={s.status} withDot={false} />
                  <span className="text-xs text-gray-400">{platformLabel(s.platform)}</span>
                </div>
                <Link to={`/resolve/t/${s.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{s.title}</Link>
                <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{s.description}</p>
                <p className="text-xs text-gray-400 mt-1">por {s.reporter.name} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
