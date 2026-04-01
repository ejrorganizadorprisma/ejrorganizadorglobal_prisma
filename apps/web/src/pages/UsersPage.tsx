import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Mail, Shield, Clock, Check, X, Edit2, Trash2 } from 'lucide-react';
import { useUsers, useToggleUserStatus, useDeleteUser } from '../hooks/useUsers';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage } from '@ejr/shared-types';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  DIRECTOR: 'Diretor',
  MANAGER: 'Admin TI',
  COORDINATOR: 'Coordenador(a)',
  SALESPERSON: 'Vendedor',
  STOCK: 'Estoque',
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { hasActionPermission } = usePagePermissions();

  const { data, isLoading, error } = useUsers({
    page,
    limit: 10,
    search: search || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  });

  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  const canCreate = hasActionPermission('users', 'create');
  const canEdit = hasActionPermission('users', 'edit');
  const canDelete = hasActionPermission('users', 'delete');

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Controle de acesso e permissões</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/users/new')}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <UserCog className="w-4 h-4" />
            Novo Usuário
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pesquisar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou e-mail..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as funções</option>
              <option value="OWNER">Proprietário</option>
              <option value="DIRECTOR">Diretor</option>
              <option value="MANAGER">Gerente</option>
              <option value="COORDINATOR">Coordenador(a)</option>
              <option value="SALESPERSON">Vendedor</option>
              <option value="STOCK">Estoque</option>
              <option value="PRODUCTION">Produção</option>
              <option value="TECHNICIAN">Técnico</option>
              <option value="MONITOR">Monitor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Função
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Horário Permitido
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {roleLabels[user.role]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.allowedHours ? (
                    <div className="text-sm text-gray-900">
                      <div className="flex items-start gap-1">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          {user.allowedHours.timeRanges ? (
                            user.allowedHours.timeRanges.map((range, idx) => (
                              <div key={idx} className="text-sm">
                                {range.start} - {range.end}
                              </div>
                            ))
                          ) : (
                            // Backward compatibility: convert old structure
                            <div className="text-sm">
                              {(user.allowedHours as any).start} - {(user.allowedHours as any).end}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDays(user.allowedHours.days)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sem restrição</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      <X className="w-3 h-3 mr-1" />
                      Inativo
                    </span>
                  )}
                </td>
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/users/${user.id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar usuário"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && user.role !== 'OWNER' && (
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          disabled={toggleStatus.isPending}
                          className={`px-3 py-1 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.isActive
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {toggleStatus.isPending ? '...' : user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      {user.role === 'OWNER' && (
                        <span className="px-3 py-1 text-xs text-gray-500 italic">
                          Sempre ativo
                        </span>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={deleteUser.isPending}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>

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
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Sobre o controle de usuários:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Usuários inativos não podem fazer login no sistema</li>
          <li>• O horário permitido restringe o acesso apenas aos horários especificados</li>
          <li>• Diferentes funções têm diferentes níveis de permissão no sistema</li>
        </ul>
      </div>
    </div>
  );
}
