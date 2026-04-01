import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Factory,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductionOrders,
  useReleaseProductionOrder,
  useStartProductionOrder,
  usePauseProductionOrder,
  useResumeProductionOrder,
  useCompleteProductionOrder,
  useCancelProductionOrder,
  type ProductionOrderStatus,
  type ProductionOrderPriority,
} from '../hooks/useProductionOrders';

export function ProductionOrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ProductionOrderPriority | ''>('');

  const { data, isLoading } = useProductionOrders({
    page,
    limit: 20,
    ...(statusFilter && { status: statusFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
  });

  const releaseOrderMutation = useReleaseProductionOrder();
  const startOrderMutation = useStartProductionOrder();
  const pauseOrderMutation = usePauseProductionOrder();
  const resumeOrderMutation = useResumeProductionOrder();
  const completeOrderMutation = useCompleteProductionOrder();
  const cancelOrderMutation = useCancelProductionOrder();

  const handleRelease = async (id: string) => {
    if (!confirm('Deseja liberar esta ordem de produção?')) return;
    try {
      await releaseOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção liberada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao liberar ordem');
    }
  };

  const handleStart = async (id: string) => {
    if (!confirm('Deseja iniciar esta ordem de produção?')) return;
    try {
      await startOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção iniciada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao iniciar ordem');
    }
  };

  const handlePause = async (id: string) => {
    if (!confirm('Deseja pausar esta ordem de produção?')) return;
    try {
      await pauseOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção pausada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao pausar ordem');
    }
  };

  const handleResume = async (id: string) => {
    if (!confirm('Deseja retomar esta ordem de produção?')) return;
    try {
      await resumeOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção retomada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao retomar ordem');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Deseja concluir esta ordem de produção?')) return;
    try {
      await completeOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção concluída com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao concluir ordem');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Deseja cancelar esta ordem de produção? Esta ação não pode ser desfeita.')) return;
    try {
      await cancelOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção cancelada');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar ordem');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: ProductionOrderStatus) => {
    const configs: Record<ProductionOrderStatus, { label: string; className: string }> = {
      DRAFT: {
        label: 'Rascunho',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
      },
      PLANNED: {
        label: 'Planejada',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      RELEASED: {
        label: 'Liberada',
        className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      },
      IN_PROGRESS: {
        label: 'Em Produção',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      PAUSED: {
        label: 'Pausada',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      COMPLETED: {
        label: 'Concluída',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      CANCELLED: {
        label: 'Cancelada',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
      CLOSED: {
        label: 'Fechada',
        className: 'bg-slate-100 text-slate-800 border-slate-200',
      },
    };

    const config = configs[status];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: ProductionOrderPriority) => {
    const configs: Record<ProductionOrderPriority, { label: string; className: string }> = {
      LOW: {
        label: 'Baixa',
        className: 'bg-slate-100 text-slate-700',
      },
      NORMAL: {
        label: 'Normal',
        className: 'bg-blue-100 text-blue-700',
      },
      HIGH: {
        label: 'Alta',
        className: 'bg-orange-100 text-orange-700',
      },
      URGENT: {
        label: 'Urgente',
        className: 'bg-red-100 text-red-700',
      },
    };

    const config = configs[priority];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getProgressPercentage = (produced: number, planned: number) => {
    if (planned === 0) return 0;
    return Math.min(Math.round((produced / planned) * 100), 100);
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Ordens de Produção</h1>
          <button
            onClick={() => navigate('/production-orders/new')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova OP
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.pagination?.total || 0}
                </p>
              </div>
              <Factory className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Produção</p>
                <p className="text-2xl font-bold text-purple-600">
                  {data?.data?.filter((o) => o.status === 'IN_PROGRESS').length || 0}
                </p>
              </div>
              <Play className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {data?.data?.filter((o) => o.status === 'PAUSED').length || 0}
                </p>
              </div>
              <Pause className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {data?.data?.filter((o) => o.status === 'COMPLETED').length || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductionOrderStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PLANNED">Planejada</option>
                <option value="RELEASED">Liberada</option>
                <option value="IN_PROGRESS">Em Produção</option>
                <option value="PAUSED">Pausada</option>
                <option value="COMPLETED">Concluída</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as ProductionOrderPriority | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Production Orders Table */}
        {!data?.data || data.data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma ordem de produção encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              Comece criando uma nova ordem de produção
            </p>
            <button
              onClick={() => navigate('/production-orders/new')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nova OP
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
                        N° OP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progresso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prioridade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prazo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data.map((order) => {
                      const progress = getProgressPercentage(
                        order.quantityProduced,
                        order.quantityPlanned
                      );
                      const isOverdue = order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'COMPLETED';

                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {order.orderNumber}
                              </span>
                              {isOverdue && (
                                <AlertTriangle className="w-4 h-4 text-red-500" title="Atrasada" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{order.product?.name || '-'}</div>
                            <div className="text-sm text-gray-500">{order.product?.code || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              Planejado: {order.quantityPlanned}
                            </div>
                            <div className="text-sm text-green-600">
                              Produzido: {order.quantityProduced}
                            </div>
                            {order.quantityScrapped > 0 && (
                              <div className="text-sm text-red-600">
                                Refugo: {order.quantityScrapped}
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              Pendente: {order.quantityPending}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{progress}%</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPriorityBadge(order.priority)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-900">
                              {isOverdue && <Clock className="w-4 h-4 text-red-500" />}
                              {formatDate(order.dueDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/production-orders/${order.id}`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {order.status === 'PLANNED' && (
                                <button
                                  onClick={() => handleRelease(order.id)}
                                  className="text-cyan-600 hover:text-cyan-900"
                                  title="Liberar"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}

                              {order.status === 'RELEASED' && (
                                <button
                                  onClick={() => handleStart(order.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Iniciar"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}

                              {order.status === 'IN_PROGRESS' && (
                                <>
                                  <button
                                    onClick={() => handlePause(order.id)}
                                    className="text-yellow-600 hover:text-yellow-900"
                                    title="Pausar"
                                  >
                                    <Pause className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleComplete(order.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Concluir"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {order.status === 'PAUSED' && (
                                <button
                                  onClick={() => handleResume(order.id)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Retomar"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}

                              {(order.status === 'DRAFT' || order.status === 'PLANNED' || order.status === 'RELEASED') && (
                                <button
                                  onClick={() => handleCancel(order.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Cancelar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
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
