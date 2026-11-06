import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useServices, useDeleteService } from '../hooks/useServices';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { ServiceUnit, AppPage } from '@ejr/shared-types';

export function ServicesPage() {
  const { formatPrice } = useFormatPrice();
  const permissionCheck = useRequirePermission({
    page: AppPage.PRODUCTS,
    message: 'Você não tem permissão para acessar a página de serviços.'
  });
  if (permissionCheck) return permissionCheck;

  const navigate = useNavigate();
  const { hasActionPermission } = usePagePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

  // Check permissions
  const canCreate = hasActionPermission('products', 'create');
  const canEdit = hasActionPermission('products', 'edit');
  const canDelete = hasActionPermission('products', 'delete');

  // Show actions column only if user has any action permission
  const showActions = canEdit || canDelete;

  const { data, isLoading, error } = useServices({
    page,
    limit: 10,
    search: search || undefined,
    category: category || undefined,
    isActive,
  });

  const deleteService = useDeleteService();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o serviço "${name}"?`)) {
      try {
        await deleteService.mutateAsync(id);
      } catch (error) {
        console.error('Erro ao excluir serviço:', error);
      }
    }
  };

  const getUnitLabel = (unit: ServiceUnit) => {
    const labels = {
      [ServiceUnit.HORA]: 'Hora',
      [ServiceUnit.DIA]: 'Dia',
      [ServiceUnit.SERVICO]: 'Serviço',
      [ServiceUnit.PROJETO]: 'Projeto',
    };
    return labels[unit] || unit;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Erro ao carregar serviços</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Serviços</h1>
        {canCreate && (
          <button
            onClick={() => navigate('/services/new')}
            className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Novo Serviço
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-xl shadow-sm border mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Pesquisar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, código ou descrição..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Categoria
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Filtrar por categoria..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              value={isActive === undefined ? '' : isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela — compacta, 1 linha por serviço */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-[13px]">
          <colgroup>
            <col className="w-[96px]" />
            <col />
            <col className="hidden lg:table-column w-[150px]" />
            <col className="w-[120px]" />
            <col className="hidden xl:table-column w-[90px]" />
            <col className="hidden xl:table-column w-[90px]" />
            <col className="w-[84px]" />
            {showActions && <col className="w-[72px]" />}
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="hidden lg:table-cell px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-right">Preço Padrão</th>
              <th className="hidden xl:table-cell px-3 py-2 text-left">Unidade</th>
              <th className="hidden xl:table-cell px-3 py-2 text-left">Duração</th>
              <th className="px-3 py-2 text-left">Status</th>
              {showActions && <th className="px-3 py-2 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((service) => (
              <tr key={service.id} className="hover:bg-indigo-50/40 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 truncate tabular-nums" title={service.code}>
                  {service.code}
                </td>
                <td className="px-3 py-2 text-gray-800 font-medium truncate" title={[service.name, service.category, getUnitLabel(service.unit), formatDuration(service.durationMinutes)].filter(Boolean).join(' · ')}>
                  {service.name}
                </td>
                <td className="hidden lg:table-cell px-3 py-2 text-gray-500 truncate" title={service.category || undefined}>
                  {service.category || '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-gray-900 tabular-nums">
                  {formatPrice(service.defaultPrice)}
                </td>
                <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 truncate">
                  {getUnitLabel(service.unit)}
                </td>
                <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 truncate">
                  {formatDuration(service.durationMinutes)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${
                      service.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                {showActions && (
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/services/${service.id}/edit`)}
                          className="p-1 rounded-md transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          className="p-1 rounded-md transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Paginação */}
      {data?.pagination && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Mostrando página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} serviços)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
