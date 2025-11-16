import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, X, Filter, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useStockReservations,
  useConsumeStockReservation,
  useCancelStockReservation,
  useDeleteStockReservation,
  useCancelExpiredReservations,
  type ReservationStatus,
  type ReservationType,
} from '../hooks/useStockReservations';
import { StockReservationForm } from '../components/StockReservationForm';

const statusLabels: Record<ReservationStatus, string> = {
  ACTIVE: 'Ativa',
  CONSUMED: 'Consumida',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

const statusColors: Record<ReservationStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CONSUMED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

const typeLabels: Record<ReservationType, string> = {
  PRODUCTION_ORDER: 'Ordem de Produção',
  SERVICE_ORDER: 'Ordem de Serviço',
  QUOTE: 'Orçamento',
  MANUAL: 'Manual',
};

const typeColors: Record<ReservationType, string> = {
  PRODUCTION_ORDER: 'bg-purple-100 text-purple-800',
  SERVICE_ORDER: 'bg-blue-100 text-blue-800',
  QUOTE: 'bg-yellow-100 text-yellow-800',
  MANUAL: 'bg-gray-100 text-gray-800',
};

export function StockReservationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [reservedForType, setReservedForType] = useState<ReservationType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading, error } = useStockReservations({
    page,
    limit: 50,
    productId: productId || undefined,
    status: status || undefined,
    reservedForType: reservedForType || undefined,
  });

  const consumeMutation = useConsumeStockReservation();
  const cancelMutation = useCancelStockReservation();
  const deleteMutation = useDeleteStockReservation();
  const cancelExpiredMutation = useCancelExpiredReservations();

  const handleConsume = async (id: string) => {
    if (!confirm('Deseja consumir esta reserva? Esta ação não pode ser desfeita.')) return;

    try {
      await consumeMutation.mutateAsync(id);
      toast.success('Reserva consumida com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao consumir reserva');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Deseja cancelar esta reserva?')) return;

    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Reserva cancelada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar reserva');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta reserva? Esta ação não pode ser desfeita.')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Reserva excluída com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir reserva');
    }
  };

  const handleCancelExpired = async () => {
    if (!confirm('Deseja cancelar todas as reservas expiradas?')) return;

    try {
      const result = await cancelExpiredMutation.mutateAsync();
      toast.success(`${result.cancelledCount} reserva(s) expirada(s) cancelada(s)`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar reservas expiradas');
    }
  };

  const clearFilters = () => {
    setProductId('');
    setStatus('');
    setReservedForType('');
  };

  const hasActiveFilters = productId || status || reservedForType;

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursDiff = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 0 && hoursDiff <= 24;
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
        <div className="text-xl text-red-600">Erro ao carregar reservas de estoque</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reservas de Estoque</h1>
          <div className="flex gap-2">
            <button
              onClick={handleCancelExpired}
              disabled={cancelExpiredMutation.isPending}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              <AlertCircle className="w-5 h-5" />
              Cancelar Expiradas
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Reserva
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                <Filter className="w-5 h-5" />
                Filtros
                {hasActiveFilters && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Ativos
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                  Limpar
                </button>
              )}
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID do Produto
                  </label>
                  <input
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="ID do produto..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReservationStatus | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="ACTIVE">Ativa</option>
                    <option value="CONSUMED">Consumida</option>
                    <option value="CANCELLED">Cancelada</option>
                    <option value="EXPIRED">Expirada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={reservedForType}
                    onChange={(e) => setReservedForType(e.target.value as ReservationType | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="PRODUCTION_ORDER">Ordem de Produção</option>
                    <option value="SERVICE_ORDER">Ordem de Serviço</option>
                    <option value="QUOTE">Orçamento</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Reservas */}
        {!data?.data || data.data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma reserva encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              Comece criando uma nova reserva de estoque
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nova Reserva
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reservado Para
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expira Em
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criada Em
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data.map((reservation) => (
                      <tr key={reservation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {reservation.product?.name || 'Produto não encontrado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reservation.product?.code}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reservation.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              typeColors[reservation.reservedForType]
                            }`}
                          >
                            {typeLabels[reservation.reservedForType]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              statusColors[reservation.status]
                            }`}
                          >
                            {statusLabels[reservation.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {reservation.reservedForId || '-'}
                          </div>
                          {reservation.reservedBy && (
                            <div className="text-sm text-gray-500">
                              Por: {reservation.reservedBy}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`text-sm ${
                              isExpiringSoon(reservation.expiresAt)
                                ? 'text-orange-600 font-semibold'
                                : 'text-gray-900'
                            }`}
                          >
                            {formatDate(reservation.expiresAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(reservation.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {reservation.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => handleConsume(reservation.id)}
                                  disabled={consumeMutation.isPending}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  Consumir
                                </button>
                                <button
                                  onClick={() => handleCancel(reservation.id)}
                                  disabled={cancelMutation.isPending}
                                  className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(reservation.id)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginação */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando página {data.pagination.page} de {data.pagination.totalPages} (
                  {data.pagination.total} reservas)
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
          </>
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Nova Reserva de Estoque</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <StockReservationForm
                onSuccess={() => {
                  setShowCreateForm(false);
                  toast.success('Reserva criada com sucesso');
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
