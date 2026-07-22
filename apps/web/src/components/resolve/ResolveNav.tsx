import { NavLink } from 'react-router-dom';
import { useResolveMe } from '../../hooks/useResolve';
import { LifeBuoy } from 'lucide-react';

export function ResolveNav() {
  const { data: me } = useResolveMe();
  const isTeam = me?.isTeam;
  const isAdmin = me?.isAdmin;
  const tabs: Array<{ to: string; label: string; end?: boolean }> = [
    { to: '/resolve', label: 'Início', end: true },
    { to: '/resolve/novo', label: 'Nova demanda' },
    { to: '/resolve/meus', label: 'Minhas' },
    { to: '/resolve/mural', label: 'Mural' },
  ];
  if (isTeam) { tabs.push({ to: '/resolve/equipe', label: 'Fila da equipe' }, { to: '/resolve/historico', label: 'Histórico' }); }
  if (isAdmin) tabs.push({ to: '/resolve/admin', label: 'Administração' });

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Resolve</h1>
          <p className="text-xs text-gray-500">Central de Demandas — bugs e sugestões</p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
