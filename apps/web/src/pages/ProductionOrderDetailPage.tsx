import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Factory,
  Package,
  ClipboardList,
  FileText,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductionOrder,
  useProductionOrderMaterials,
  useProductionOrderOperations,
  useProductionOrderReports,
  useReleaseProductionOrder,
  useStartProductionOrder,
  usePauseProductionOrder,
  useResumeProductionOrder,
  useCompleteProductionOrder,
  useCancelProductionOrder,
  type ProductionOrderStatus,
} from '../hooks/useProductionOrders';
import { ProductionReportingForm } from '../components/production/ProductionReportingForm';

type TabType = 'overview' | 'materials' | 'operations' | 'reports';

export function ProductionOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showReportingForm, setShowReportingForm] = useState(false);

  const { data: order, isLoading } = useProductionOrder(id);
  const { data: materials } = useProductionOrderMaterials(id);
  const { data: operations } = useProductionOrderOperations(id);
  const { data: reports } = useProductionOrderReports(id);

  const releaseOrderMutation = useReleaseProductionOrder();
  const startOrderMutation = useStartProductionOrder();
  const pauseOrderMutation = usePauseProductionOrder();
  const resumeOrderMutation = useResumeProductionOrder();
  const completeOrderMutation = useCompleteProductionOrder();
  const cancelOrderMutation = useCancelProductionOrder();

  const handleRelease = async () => {
    if (!id || !confirm('Deseja liberar esta ordem de produção?')) return;
    try {
      await releaseOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção liberada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao liberar ordem');
    }
  };

  const handleStart = async () => {
    if (!id || !confirm('Deseja iniciar esta ordem de produção?')) return;
    try {
      await startOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção iniciada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao iniciar ordem');
    }
  };

  const handlePause = async () => {
    if (!id || !confirm('Deseja pausar esta ordem de produção?')) return;
    try {
      await pauseOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção pausada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao pausar ordem');
    }
  };

  const handleResume = async () => {
    if (!id || !confirm('Deseja retomar esta ordem de produção?')) return;
    try {
      await resumeOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção retomada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao retomar ordem');
    }
  };

  const handleComplete = async () => {
    if (!id || !confirm('Deseja concluir esta ordem de produção?')) return;
    try {
      await completeOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção concluída com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao concluir ordem');
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm('Deseja cancelar esta ordem de produção? Esta ação não pode ser desfeita.')) return;
    try {
      await cancelOrderMutation.mutateAsync(id);
      toast.success('Ordem de produção cancelada');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar ordem');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getStatusBadge = (status: ProductionOrderStatus) => {
    const configs: Record<ProductionOrderStatus, { label: string; className: string }> = {
      DRAFT: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 border-gray-200' },
      PLANNED: { label: 'Planejada', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      RELEASED: { label: 'Liberada', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
      IN_PROGRESS: { label: 'Em Produção', className: 'bg-purple-100 text-purple-800 border-purple-200' },
      PAUSED: { label: 'Pausada', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      COMPLETED: { label: 'Concluída', className: 'bg-green-100 text-green-800 border-green-200' },
      CANCELLED: { label: 'Cancelada', className: 'bg-red-100 text-red-800 border-red-200' },
      CLOSED: { label: 'Fechada', className: 'bg-slate-100 text-slate-800 border-slate-200' },
    };

    const config = configs[status];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}>
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

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Ordem de produção não encontrada</div>
      </div>
    );
  }

  const progress = getProgressPercentage(order.quantityProduced, order.quantityPlanned);
  const isOverdue = order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'COMPLETED';
  const canEdit = order.status === 'DRAFT' || order.status === 'PLANNED';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/production-orders')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Ordens de Produção
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  OP #{order.orderNumber}
                </h1>
                {isOverdue && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-medium">Atrasada</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                Produto: {order.product?.name || '-'}
              </p>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Progresso de Produção</h3>
            <span className="text-sm font-semibold text-gray-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Produzido: {order.quantityProduced} / {order.quantityPlanned}</span>
            <span>Pendente: {order.quantityPending}</span>
            {order.quantityScrapped > 0 && (
              <span className="text-red-600">Refugo: {order.quantityScrapped}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Factory className="w-4 h-4" />
                    Visão Geral
                  </button>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                      activeTab === 'materials'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Materiais
                  </button>
                  <button
                    onClick={() => setActiveTab('operations')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                      activeTab === 'operations'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Operações
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                      activeTab === 'reports'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Apontamentos
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Produto</h3>
                        <p className="text-base font-semibold text-gray-900">
                          {order.product?.name || '-'}
                        </p>
                        <p className="text-sm text-gray-600">{order.product?.code || '-'}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Prioridade</h3>
                        <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${
                          order.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          order.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          order.priority === 'NORMAL' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {order.priority === 'URGENT' ? 'Urgente' :
                           order.priority === 'HIGH' ? 'Alta' :
                           order.priority === 'NORMAL' ? 'Normal' : 'Baixa'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Responsável</h3>
                        <p className="text-base text-gray-900">{order.assignedTo || '-'}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Entrega</h3>
                        <div className="flex items-center gap-2">
                          {isOverdue && <Clock className="w-4 h-4 text-red-500" />}
                          <p className={`text-base ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                            {formatDate(order.dueDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Linha do Tempo</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium text-gray-600 w-32">Início Planejado:</span>
                          <span className="text-gray-900">{formatDate(order.plannedStartDate)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium text-gray-600 w-32">Fim Planejado:</span>
                          <span className="text-gray-900">{formatDate(order.plannedEndDate)}</span>
                        </div>
                        {order.actualStartDate && (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-gray-600 w-32">Início Real:</span>
                            <span className="text-gray-900">{formatDateTime(order.actualStartDate)}</span>
                          </div>
                        )}
                        {order.actualEndDate && (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-gray-600 w-32">Fim Real:</span>
                            <span className="text-gray-900">{formatDateTime(order.actualEndDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Observações</h3>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {order.internalNotes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Notas Internas</h3>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap bg-yellow-50 p-3 rounded-md">
                          {order.internalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Materials Tab */}
                {activeTab === 'materials' && (
                  <div>
                    {!materials || materials.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum material registrado
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Material
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Planejado
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Consumido
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Refugo
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Estoque Atual
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {materials.map((material) => {
                              const remaining = material.quantityPlanned - material.quantityConsumed;
                              const hasStock = material.product && material.product.currentStock >= remaining;

                              return (
                                <tr key={material.id}>
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {material.product?.name || '-'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {material.product?.code || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {material.quantityPlanned}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-green-600 font-medium">
                                    {material.quantityConsumed}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-red-600">
                                    {material.quantityScrapped}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {material.product?.currentStock || 0}
                                  </td>
                                  <td className="px-4 py-3">
                                    {hasStock ? (
                                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                        <CheckCircle className="w-4 h-4" />
                                        OK
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                        Baixo
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Operations Tab */}
                {activeTab === 'operations' && (
                  <div>
                    {!operations || operations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhuma operação registrada
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {operations.map((operation) => (
                          <div
                            key={operation.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {operation.operationNumber}. {operation.name}
                                </h4>
                                {operation.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {operation.description}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  operation.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-700'
                                    : operation.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-700'
                                    : operation.status === 'FAILED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {operation.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {operation.assignedTo && (
                                <div>
                                  <span className="text-gray-600">Responsável: </span>
                                  <span className="text-gray-900">{operation.assignedTo}</span>
                                </div>
                              )}
                              {operation.workstation && (
                                <div>
                                  <span className="text-gray-600">Estação: </span>
                                  <span className="text-gray-900">{operation.workstation}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Apontamentos de Produção
                      </h3>
                      {order.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => setShowReportingForm(true)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          <FileText className="w-4 h-4" />
                          Novo Apontamento
                        </button>
                      )}
                    </div>

                    {!reports || reports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum apontamento registrado
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reports.map((report) => (
                          <div
                            key={report.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {formatDateTime(report.reportingDate)}
                                </p>
                                {report.reportedBy && (
                                  <p className="text-sm text-gray-600">
                                    Por: {report.reportedBy}
                                  </p>
                                )}
                              </div>
                              {report.shift && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                  Turno: {report.shift}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Produzido: </span>
                                <span className="text-green-600 font-semibold">
                                  {report.quantityProduced}
                                </span>
                              </div>
                              {report.quantityScrapped > 0 && (
                                <div>
                                  <span className="text-gray-600">Refugo: </span>
                                  <span className="text-red-600 font-semibold">
                                    {report.quantityScrapped}
                                  </span>
                                </div>
                              )}
                            </div>
                            {report.scrapReason && (
                              <p className="text-sm text-gray-700 mt-2">
                                <span className="font-medium">Motivo do refugo: </span>
                                {report.scrapReason}
                              </p>
                            )}
                            {report.notes && (
                              <p className="text-sm text-gray-700 mt-2">
                                <span className="font-medium">Obs: </span>
                                {report.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Costs */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Custos</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Materiais:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.materialCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mão de Obra:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.laborCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overhead:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.overheadCost)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(order.totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações</h2>
              <div className="space-y-3">
                {canEdit && (
                  <button
                    onClick={() => navigate(`/production-orders/${id}/edit`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                )}

                {order.status === 'PLANNED' && (
                  <button
                    onClick={handleRelease}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100"
                  >
                    <FileText className="w-4 h-4" />
                    Liberar
                  </button>
                )}

                {order.status === 'RELEASED' && (
                  <button
                    onClick={handleStart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar
                  </button>
                )}

                {order.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={handlePause}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                    <button
                      onClick={handleComplete}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Concluir
                    </button>
                  </>
                )}

                {order.status === 'PAUSED' && (
                  <button
                    onClick={handleResume}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100"
                  >
                    <Play className="w-4 h-4" />
                    Retomar
                  </button>
                )}

                {(order.status === 'DRAFT' ||
                  order.status === 'PLANNED' ||
                  order.status === 'RELEASED') && (
                  <button
                    onClick={handleCancel}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Reporting Modal */}
      {showReportingForm && id && (
        <ProductionReportingForm
          productionOrderId={id}
          onClose={() => setShowReportingForm(false)}
        />
      )}
    </div>
  );
}
