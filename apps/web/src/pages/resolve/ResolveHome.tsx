import { Link } from 'react-router-dom';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { useMural, useResolveMe } from '../../hooks/useResolve';
import { Bug, Lightbulb, ListChecks, ThumbsUp, ArrowRight } from 'lucide-react';
import { formatTicketCode } from '@ejr/shared-types';

const STEPS = [
  { n: 1, t: 'Abra a demanda', d: 'Descreva o erro ou a sugestão e onde acontece.' },
  { n: 2, t: 'A equipe tria', d: 'Definimos prioridade e quem vai resolver.' },
  { n: 3, t: 'Resolvemos', d: 'Você acompanha o andamento e os comentários.' },
  { n: 4, t: 'Você confirma', d: 'Confirma se resolveu — ou reabre se voltou.' },
];

export function ResolveHome() {
  const { data: me } = useResolveMe();
  const { data: mural } = useMural();
  const top = (mural?.suggestions || []).slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <ResolveNav />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Link to="/resolve/novo?type=BUG" className="p-4 rounded-xl bg-red-50 border border-red-200 hover:shadow-sm transition-all">
          <Bug className="w-6 h-6 text-red-500 mb-2" />
          <p className="font-semibold text-gray-900">Reportar um erro</p>
          <p className="text-xs text-gray-500">Algo não funciona como deveria</p>
        </Link>
        <Link to="/resolve/novo?type=SUGGESTION" className="p-4 rounded-xl bg-amber-50 border border-amber-200 hover:shadow-sm transition-all">
          <Lightbulb className="w-6 h-6 text-amber-500 mb-2" />
          <p className="font-semibold text-gray-900">Enviar uma sugestão</p>
          <p className="text-xs text-gray-500">Uma ideia para melhorar</p>
        </Link>
        <Link to="/resolve/meus" className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 hover:shadow-sm transition-all">
          <ListChecks className="w-6 h-6 text-indigo-500 mb-2" />
          <p className="font-semibold text-gray-900">Minhas demandas</p>
          <p className="text-xs text-gray-500">Acompanhe seus chamados</p>
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Como funciona</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STEPS.map((s) => (
          <div key={s.n} className="p-3 rounded-xl bg-white border border-gray-200">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mb-2">{s.n}</div>
            <p className="text-sm font-medium text-gray-900">{s.t}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.d}</p>
          </div>
        ))}
      </div>

      {top.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Sugestões mais votadas</h2>
            <Link to="/resolve/mural" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">Ver mural <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2">
            {top.map((s) => (
              <Link key={s.id} to={`/resolve/t/${s.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-indigo-300">
                <span className="flex items-center gap-1 text-sm font-semibold text-gray-700 w-12"><ThumbsUp className="w-3.5 h-3.5 text-indigo-500" /> {s.votes}</span>
                <span className="text-xs font-mono text-indigo-600">{formatTicketCode(s.code)}</span>
                <span className="text-sm text-gray-900 truncate">{s.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {me && !me.isTeam && <p className="mt-8 text-xs text-gray-400">Precisa de ajuda? Abra uma demanda que a equipe recebe na hora.</p>}
    </div>
  );
}
