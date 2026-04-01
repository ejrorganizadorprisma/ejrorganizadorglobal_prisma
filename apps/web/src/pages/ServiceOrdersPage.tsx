import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Clock, Wrench, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  useServiceOrders,
  useServiceOrderStats,
  useCompleteServiceOrder,
} from '../hooks/useServiceOrders';
import { ServiceOrderCard } from '../components/service-orders/ServiceOrderCard';
import {
  ServiceOrderFilters,
  type ServiceOrderFiltersState,
} from '../components/service-orders/ServiceOrderFilters';

export function ServiceOrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ServiceOrderFiltersState>({});

  const { data, isLoading } = useServiceOrders({
    page,
    limit: 12,
    ...filters,
  });

  const { data: stats } = useServiceOrderStats();
  const completeOrderMutation = useCompleteServiceOrder();

  const handleComplete = async (id: string) => {
    if (!confirm('Deseja marcar esta ordem de serviço como concluída?')) return;

    try {
      await completeOrderMutation.mutateAsync(id);
      toast.success('Ordem de serviço concluída com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao concluir ordem de serviço');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Ordens de Serviço</h1>
          <button
            onClick={() => navigate('/service-orders/new')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova OS
          </button>
        </div>

        {/* Cards de Resumo */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de OSs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Abertas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Atendimento</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.inService}
                  </p>
                </div>
                <Wrench className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aguardando Peças</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.awaitingParts}
                  </p>
                </div>
                <Package className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6">
          <ServiceOrderFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Lista de Ordens de Serviço */}
        {!data?.data || data.data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma ordem de serviço encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              Comece criando uma nova ordem de serviço
            </p>
            <button
              onClick={() => navigate('/service-orders/new')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nova OS
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.data.map((serviceOrder) => (
                <ServiceOrderCard
                  key={serviceOrder.id}
                  serviceOrder={serviceOrder}
                  onComplete={handleComplete}
                />
              ))}
            </div>

            {/* Paginação */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Página {page} de {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
