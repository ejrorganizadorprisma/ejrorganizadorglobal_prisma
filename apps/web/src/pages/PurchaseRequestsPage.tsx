import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseRequests, useDeletePurchaseRequest } from '../hooks/usePurchaseRequests';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

const STATUS_LABELS = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CONVERTED: 'Convertido',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CONVERTED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const PRIORITY_LABELS = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-700',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export function PurchaseRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading } = usePurchaseRequests({
    page,
    limit: 10,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const deletePR = useDeletePurchaseRequest();
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta requisição?')) {
      try {
        await deletePR.mutateAsync(id);
        toast.success('Requisição excluída!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:px-4">
        <div className="px-3 sm:px-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">Requisições de Compra</h1>
            <button
              onClick={() => navigate('/purchase-requests/new')}
              className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Nova Requisição
            </button>
          </div>

          <div className="bg-white shadow-sm border rounded-xl p-2.5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendente</option>
                  <option value="APPROVED">Aprovado</option>
                  <option value="REJECTED">Rejeitado</option>
                  <option value="CONVERTED">Convertido</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  <option value="LOW">Baixa</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>

            {(statusFilter || priorityFilter) && (
              <div className="mt-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-[13px]">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col />
                    <col className="hidden xl:table-column w-[150px]" />
                    <col className="w-[84px]" />
                    <col className="w-[96px]" />
                    <col className="w-[110px]" />
                    <col className="w-[140px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Número</th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="hidden xl:table-cell px-3 py-2 text-left">Solicitante</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Prioridade</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.data.map((request: any) => (
                      <tr key={request.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 tabular-nums truncate" title={request.requestNumber}>
                          {request.requestNumber}
                        </td>
                        <td
                          className="px-3 py-2 text-gray-900 truncate"
                          title={`${request.title}${request.requestedByUser?.name ? ` · Solicitante: ${request.requestedByUser.name}` : ''}`}
                        >
                          {request.title}
                        </td>
                        <td className="hidden xl:table-cell px-3 py-2 text-gray-700 truncate" title={request.requestedByUser?.name || undefined}>
                          {request.requestedByUser?.name || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500 tabular-nums">
                          {formatDate(request.requestedDate)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${
                              PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]
                            }`}
                          >
                            {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex max-w-full px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${
                              STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]
                            }`}
                          >
                            <span className="truncate">{STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2 whitespace-nowrap text-[12px] font-medium">
                            <button
                              onClick={() => navigate(`/purchase-requests/${request.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalhes"
                            >
                              Ver
                            </button>

                            {request.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => navigate(`/purchase-requests/${request.id}/edit`)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Editar"
                                >
                                  Editar
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDelete(request.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Excluir"
                                  >
                                    Excluir
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {data?.data.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma requisição encontrada.
                  </div>
                )}
              </div>

              {data && data.pagination && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.pagination.total)} de {data.pagination.total} requisições
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={!data.pagination.hasMore}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
