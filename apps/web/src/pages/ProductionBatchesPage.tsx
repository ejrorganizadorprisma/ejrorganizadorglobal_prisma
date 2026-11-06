import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Layers,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Package,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductionBatches,
  useReleaseBatch,
  useStartBatch,
  usePauseBatch,
  useResumeBatch,
  useCompleteBatch,
  useCancelBatch,
} from '../hooks/useProductionBatches';
import type { ProductionBatchStatus } from '@ejr/shared-types';

export function ProductionBatchesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProductionBatchStatus | ''>('');

  const { data, isLoading } = useProductionBatches({
    page,
    limit: 20,
    ...(statusFilter && { status: statusFilter as ProductionBatchStatus }),
  });

  const releaseMutation = useReleaseBatch();
  const startMutation = useStartBatch();
  const pauseMutation = usePauseBatch();
  const resumeMutation = useResumeBatch();
  const completeMutation = useCompleteBatch();
  const cancelMutation = useCancelBatch();

  const handleRelease = async (id: string) => {
    if (!confirm('Deseja liberar este lote para produção? O estoque dos componentes será baixado.')) return;
    try {
      await releaseMutation.mutateAsync(id);
      toast.success('Lote liberado para produção');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao liberar lote');
    }
  };

  const handleStart = async (id: string) => {
    if (!confirm('Deseja iniciar a produção deste lote?')) return;
    try {
      await startMutation.mutateAsync(id);
      toast.success('Produção iniciada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao iniciar produção');
    }
  };

  const handlePause = async (id: string) => {
    if (!confirm('Deseja pausar a produção deste lote?')) return;
    try {
      await pauseMutation.mutateAsync(id);
      toast.success('Produção pausada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao pausar produção');
    }
  };

  const handleResume = async (id: string) => {
    if (!confirm('Deseja retomar a produção deste lote?')) return;
    try {
      await resumeMutation.mutateAsync(id);
      toast.success('Produção retomada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao retomar produção');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Deseja completar este lote? Os produtos acabados serão adicionados ao estoque.')) return;
    try {
      await completeMutation.mutateAsync(id);
      toast.success('Lote completado com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao completar lote');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Deseja cancelar este lote? Esta ação não pode ser desfeita.')) return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Lote cancelado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar lote');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: ProductionBatchStatus) => {
    const configs: Record<ProductionBatchStatus, { label: string; className: string }> = {
      DRAFT: {
        label: 'Rascunho',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
      },
      PLANNED: {
        label: 'Planejado',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      RELEASED: {
        label: 'Liberado',
        className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      },
      IN_PROGRESS: {
        label: 'Em Produção',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      PAUSED: {
        label: 'Pausado',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      TESTING: {
        label: 'Em Teste',
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      },
      COMPLETED: {
        label: 'Concluído',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      CANCELLED: {
        label: 'Cancelado',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
    };

    const config = configs[status];
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${config.className}`}
      >
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
      <div className="container mx-auto px-3 sm:px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Lotes de Produção</h1>
          <button
            onClick={() => navigate('/production-batches/new')}
            className="shrink-0 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Lote
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total</p>
                <p className="text-xl font-bold tabular-nums text-gray-900">
                  {data?.pagination?.total || 0}
                </p>
              </div>
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Em Produção</p>
                <p className="text-xl font-bold tabular-nums text-purple-600">
                  {data?.data?.filter((b) => b.status === 'IN_PROGRESS').length || 0}
                </p>
              </div>
              <Play className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Em Teste</p>
                <p className="text-xl font-bold tabular-nums text-indigo-600">
                  {data?.data?.filter((b) => b.status === 'TESTING').length || 0}
                </p>
              </div>
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Concluídos</p>
                <p className="text-xl font-bold tabular-nums text-green-600">
                  {data?.data?.filter((b) => b.status === 'COMPLETED').length || 0}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductionBatchStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PLANNED">Planejado</option>
                <option value="RELEASED">Liberado</option>
                <option value="IN_PROGRESS">Em Produção</option>
                <option value="PAUSED">Pausado</option>
                <option value="TESTING">Em Teste</option>
                <option value="COMPLETED">Concluído</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Production Batches Table */}
        {!data?.data || data.data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum lote de produção encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Comece criando um novo lote de produção
            </p>
            <button
              onClick={() => navigate('/production-batches/new')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Novo Lote
            </button>
          </div>
        ) : (
          <>
            {/* Tabela compacta — 1 linha por lote */}
            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
              <table className="w-full min-w-[740px] table-fixed text-[13px]">
                <colgroup>
                  <col className="w-[130px]" />
                  <col />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                  <col className="w-[120px]" />
                  <col className="hidden xl:table-column w-[100px]" />
                  <col className="w-[132px]" />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">N° Lote</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Produzido / Plan.</th>
                    <th className="px-3 py-2 text-left">Progresso</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Data Início</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((batch) => {
                    const progress = getProgressPercentage(
                      batch.quantityProduced,
                      batch.quantityPlanned
                    );
                    const qtyTitle =
                      `Planejado: ${batch.quantityPlanned} · Produzido: ${batch.quantityProduced}` +
                      (batch.quantityScrapped > 0 ? ` · Refugo: ${batch.quantityScrapped}` : '') +
                      ` · Em Progresso: ${batch.quantityInProgress}`;
                    const startDate = formatDate(batch.actualStartDate || batch.plannedStartDate);

                    return (
                      <tr key={batch.id} className="transition-colors hover:bg-blue-50/40">
                        <td className="px-3 py-2">
                          <span className="font-semibold text-gray-900 whitespace-nowrap tabular-nums" title={`Início: ${startDate}`}>
                            {batch.batchNumber}
                          </span>
                        </td>
                        <td className="px-3 py-2 truncate" title={`${batch.product?.name || '-'}${batch.product?.code ? ` · ${batch.product.code}` : ''}`}>
                          <Package className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-gray-400" />
                          <span className="font-medium text-gray-800">{batch.product?.name || '-'}</span>
                          {batch.product?.code && <span className="ml-1.5 text-gray-400 text-[11px]">{batch.product.code}</span>}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums" title={qtyTitle}>
                          <span className="font-semibold text-green-700">{batch.quantityProduced}</span>
                          <span className="text-gray-400"> / {batch.quantityPlanned}</span>
                          {batch.quantityScrapped > 0 && <span className="ml-1 text-red-600 text-[11px]">−{batch.quantityScrapped}</span>}
                          {batch.quantityInProgress > 0 && <span className="ml-1 text-blue-600 text-[11px]">+{batch.quantityInProgress}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5" title={`${progress}%`}>
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-600 tabular-nums w-8 text-right">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{getStatusBadge(batch.status)}</td>
                        <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap tabular-nums text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {startDate}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                            <button
                              onClick={() => navigate(`/production-batches/${batch.id}`)}
                              className="p-1 rounded-md text-blue-600 hover:bg-blue-50"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {(batch.status === 'DRAFT' || batch.status === 'PLANNED') && (
                              <button
                                onClick={() => handleRelease(batch.id)}
                                className="p-1 rounded-md text-cyan-600 hover:bg-cyan-50"
                                title="Liberar"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {batch.status === 'RELEASED' && (
                              <button
                                onClick={() => handleStart(batch.id)}
                                className="p-1 rounded-md text-green-600 hover:bg-green-50"
                                title="Iniciar"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {batch.status === 'IN_PROGRESS' && (
                              <>
                                <button
                                  onClick={() => handlePause(batch.id)}
                                  className="p-1 rounded-md text-yellow-600 hover:bg-yellow-50"
                                  title="Pausar"
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleComplete(batch.id)}
                                  className="p-1 rounded-md text-green-600 hover:bg-green-50"
                                  title="Completar"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {batch.status === 'PAUSED' && (
                              <button
                                onClick={() => handleResume(batch.id)}
                                className="p-1 rounded-md text-purple-600 hover:bg-purple-50"
                                title="Retomar"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {(batch.status === 'DRAFT' || batch.status === 'PLANNED') && (
                              <button
                                onClick={() => handleCancel(batch.id)}
                                className="p-1 rounded-md text-red-600 hover:bg-red-50"
                                title="Cancelar"
                              >
                                <XCircle className="w-3.5 h-3.5" />
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
