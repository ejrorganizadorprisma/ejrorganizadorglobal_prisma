import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Mail, Shield, Clock, Check, X, Edit2, Trash2 } from 'lucide-react';
import { useUsers, useToggleUserStatus, useDeleteUser } from '../hooks/useUsers';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage, PageAction, UserRole } from '@ejr/shared-types';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  DIRECTOR: 'Diretor',
  MANAGER: 'Admin TI',
  COORDINATOR: 'Coordenador(a)',
  SALESPERSON: 'Vendedor',
  STOCK: 'Estoque',
  EXPEDITION: 'Expedidor',
  CASHIER: 'Operador de Caixa',
  PRODUCTION: 'Produção',
  TECHNICIAN: 'Técnico',
  MONITOR: 'Monitor',
};

const roleColors: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  DIRECTOR: 'bg-blue-100 text-blue-800',
  MANAGER: 'bg-green-100 text-green-800',
  COORDINATOR: 'bg-teal-100 text-teal-800',
  SALESPERSON: 'bg-yellow-100 text-yellow-800',
  STOCK: 'bg-orange-100 text-orange-800',
  EXPEDITION: 'bg-sky-100 text-sky-800',
  CASHIER: 'bg-emerald-100 text-emerald-800',
  PRODUCTION: 'bg-indigo-100 text-indigo-800',
  TECHNICIAN: 'bg-gray-100 text-gray-800',
  MONITOR: 'bg-cyan-100 text-cyan-800',
};

const dayLabels: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

const formatDays = (days?: number[]): string => {
  if (!days || days.length === 0) return 'Todos os dias';
  if (days.length === 7) return 'Todos os dias';

  // Check for weekdays pattern (Monday to Friday)
  const weekdays = [1, 2, 3, 4, 5];
  if (days.length === 5 && weekdays.every(d => days.includes(d))) {
    return 'Seg-Sex';
  }

  // Check for weekend pattern
  const weekend = [0, 6];
  if (days.length === 2 && weekend.every(d => days.includes(d))) {
    return 'Fim de semana';
  }

  return days.map(d => dayLabels[d]).join(', ');
};

export function UsersPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.USERS,
    message: 'Você não tem permissão para acessar o gerenciamento de usuários.'
  });
  if (permissionCheck) return permissionCheck;

  const navigate = useNavigate();
  const [_page, _setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { hasActionPermission } = usePagePermissions();

  const { data, isLoading, error } = useUsers({
    page: _page,
    limit: 10,
    search: search || undefined,
    role: (roleFilter || undefined) as UserRole | undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  });

  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  const canCreate = hasActionPermission(AppPage.USERS, PageAction.CREATE);
  const canEdit = hasActionPermission(AppPage.USERS, PageAction.EDIT);
  const canDelete = hasActionPermission(AppPage.USERS, PageAction.DELETE);

  // Show actions column only if user has any action permission
  const showActions = canEdit || canDelete;

  const handleToggleStatus = async (userId: string) => {
    try {
      await toggleStatus.mutateAsync(userId);
    } catch (error) {
      console.error('Erro ao alternar status:', error);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteUser.mutateAsync(userId);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando usuários...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Erro ao carregar usuários</div>
      </div>
    );
  }

  const users = data?.data || [];
  const filteredUsers = users;

  // Horário permitido em uma linha (faixas + dias)
  const hoursText = (u: any): string | null => {
    if (!u.allowedHours) return null;
    const ranges = u.allowedHours.timeRanges
      ? u.allowedHours.timeRanges.map((r: { start: string; end: string }) => `${r.start}-${r.end}`).join(', ')
      : `${(u.allowedHours as any).start}-${(u.allowedHours as any).end}`;
    return `${ranges} · ${formatDays(u.allowedHours.days)}`;
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
            <UserCog className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Gerenciamento de Usuários</h1>
            <p className="hidden sm:block text-xs text-gray-500">Controle de acesso e permissões</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/users/new')}
            className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-1.5"
          >
            <UserCog className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Usuário</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border mb-4 p-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nome ou e-mail..."
            aria-label="Pesquisar"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Função"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Todas as funções</option>
            <option value="OWNER">Proprietário</option>
            <option value="DIRECTOR">Diretor</option>
            <option value="MANAGER">Gerente</option>
            <option value="COORDINATOR">Coordenador(a)</option>
            <option value="SALESPERSON">Vendedor</option>
            <option value="STOCK">Estoque</option>
            <option value="EXPEDITION">Expedidor</option>
            <option value="CASHIER">Operador de Caixa</option>
            <option value="PRODUCTION">Produção</option>
            <option value="TECHNICIAN">Técnico</option>
            <option value="MONITOR">Monitor</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Status"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Todos status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela — compacta, 1 linha por usuário */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-[13px]">
          <colgroup>
            <col />
            <col className="w-[150px]" />
            <col className="hidden xl:table-column w-[220px]" />
            <col className="w-[96px]" />
            {showActions && <col className="w-[190px]" />}
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Função</th>
              <th className="hidden xl:table-cell px-3 py-2 text-left">Horário Permitido</th>
              <th className="px-3 py-2 text-left">Status</th>
              {showActions && <th className="px-3 py-2 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user: any) => {
              const hours = hoursText(user);
              return (
                <tr key={user.id} className={`transition-colors hover:bg-blue-50/40 ${!user.isActive ? 'bg-gray-50/70' : ''}`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="shrink-0 h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCog className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex items-baseline gap-2">
                        <span className="font-medium text-gray-900 truncate" title={user.name}>{user.name}</span>
                        <span className="text-gray-400 truncate hidden lg:inline-flex items-center gap-1" title={user.email}>
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${roleColors[user.role]}`}>
                      <Shield className="w-3 h-3 shrink-0" />
                      <span className="truncate">{roleLabels[user.role]}</span>
                    </span>
                  </td>
                  <td className="hidden xl:table-cell px-3 py-2 text-gray-600 truncate" title={hours || 'Sem restrição'}>
                    {hours ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {hours}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sem restrição</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                        <X className="w-3 h-3" />
                        Inativo
                      </span>
                    )}
                  </td>
                  {showActions && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                        {canEdit && user.role !== 'OWNER' && (
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            disabled={toggleStatus.isPending}
                            className={`mr-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                              user.isActive
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {toggleStatus.isPending ? '...' : user.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                        {user.role === 'OWNER' && (
                          <span className="mr-1 text-[11px] text-gray-400 italic">Sempre ativo</span>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/users/${user.id}/edit`)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={deleteUser.isPending}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCog className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente ajustar os filtros ou criar um novo usuário.
            </p>
          </div>
        )}
      </div>

      {/* Informações adicionais */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Sobre o controle de usuários:</h3>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>• Usuários inativos não podem fazer login no sistema</li>
          <li>• O horário permitido restringe o acesso apenas aos horários especificados</li>
          <li>• Diferentes funções têm diferentes níveis de permissão no sistema</li>
        </ul>
      </div>
    </div>
  );
}
