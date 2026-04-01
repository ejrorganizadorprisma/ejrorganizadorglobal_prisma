import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  Scissors,
  Plus,
  Play,
  Pause,
  Check,
  X,
  Eye,
  Trash2,
  Filter,
  RefreshCw,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  useDigitalFabricationBatches,
  useDigitalFabricationDashboard,
  useStartBatch,
  usePauseBatch,
  useCompleteBatch,
  useCancelBatch,
  useDeleteDigitalFabricationBatch,
} from '../hooks/useDigitalFabrication';
import {
  FabricationMachineType,
  FabricationJobStatus,
  FabricationJobStatusLabels,
  FabricationMachineTypeLabels,
  MaterialUnitLabels,
} from '@ejr/shared-types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<FabricationJobStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  QUEUED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export function DigitalFabricationPage() {
  const [machineTypeFilter, setMachineTypeFilter] = useState<FabricationMachineType | ''>('');
  const [statusFilter, setStatusFilter] = useState<FabricationJobStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data: dashboardData, isLoading: loadingDashboard } = useDigitalFabricationDashboard();
  const { data: batchesData, isLoading: loadingBatches, refetch } = useDigitalFabricationBatches({
    page,
    limit: 20,
    machineType: machineTypeFilter || undefined,
    status: statusFilter || undefined,
  });

  const startBatch = useStartBatch();
  const pauseBatch = usePauseBatch();
  const completeBatch = useCompleteBatch();
  const cancelBatch = useCancelBatch();
  const deleteBatch = useDeleteDigitalFabricationBatch();

  const handleStart = async (id: string) => {
    try {
      await startBatch.mutateAsync(id);
      toast.success('Lote iniciado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao iniciar lote');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseBatch.mutateAsync(id);
      toast.success('Lote pausado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao pausar lote');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeBatch.mutateAsync(id);
      toast.success('Lote concluído com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao concluir lote');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este lote?')) return;
    try {
      await cancelBatch.mutateAsync(id);
      toast.success('Lote cancelado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar lote');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteBatch.mutateAsync(id);
      toast.success('Lote excluído com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir lote');
    }
  };

  const batches = batchesData?.data || [];
  const pagination = batchesData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Fabricacao 3D e Laser</h1>
          <p className="text-gray-600">Gerencie seus lotes de impressao 3D e corte a laser</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <button
            onClick={() => refetch()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <Link
            to="/digital-fabrication/new"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Lote
          </Link>
        </div>
      </div>

      {/* Dashboard Stats */}
      {!loadingDashboard && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Impressora 3D */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Printer className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Impressora 3D</p>
                <p className="text-xl font-bold">{dashboardData.printer3d.activeBatches} ativos</p>
                <p className="text-xs text-gray-400">
                  {dashboardData.printer3d.totalFilamentUsedToday.toFixed(0)}g usado hoje
                </p>
              </div>
            </div>
          </div>

          {/* Laser */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Scissors className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cortadora Laser</p>
                <p className="text-xl font-bold">{dashboardData.laserCutter.activeBatches} ativos</p>
                <p className="text-xs text-gray-400">
                  {dashboardData.laserCutter.totalMaterialUsedToday.toFixed(0)}cm² usado hoje
                </p>
              </div>
            </div>
          </div>

          {/* Na Fila */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Na Fila</p>
                <p className="text-xl font-bold">{dashboardData.pendingBatches}</p>
                <p className="text-xs text-gray-400">lotes aguardando</p>
              </div>
            </div>
          </div>

          {/* Taxa de Falha */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Taxa de Falha</p>
                <p className="text-xl font-bold">{dashboardData.failureRate}%</p>
                <p className="text-xs text-gray-400">{dashboardData.completedThisWeek} concluídos esta semana</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
          <select
            value={machineTypeFilter}
            onChange={(e) => {
              setMachineTypeFilter(e.target.value as FabricationMachineType | '');
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="PRINTER_3D">Impressora 3D</option>
            <option value="LASER_CUTTER">Cortadora Laser</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as FabricationJobStatus | '');
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            {Object.entries(FabricationJobStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Batches List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loadingBatches ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum lote encontrado</p>
            <Link
              to="/digital-fabrication/new"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro lote
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {batch.machineType === 'PRINTER_3D' ? (
                        <Printer className="w-5 h-5 text-purple-500" />
                      ) : (
                        <Scissors className="w-5 h-5 text-orange-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{batch.batchNumber}</div>
                        {batch.machine && (
                          <div className="text-sm text-gray-500">{batch.machine.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {FabricationMachineTypeLabels[batch.machineType]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[batch.status]}`}>
                      {FabricationJobStatusLabels[batch.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${batch.totalItemsPlanned > 0
                              ? Math.round((batch.totalItemsProduced / batch.totalItemsPlanned) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {batch.totalItemsProduced}/{batch.totalItemsPlanned}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <span className="text-gray-600">
                        {batch.totalMaterialUsed.toFixed(1)}/{batch.totalMaterialPlanned.toFixed(1)}
                      </span>
                      <span className="text-gray-400 ml-1">
                        {MaterialUnitLabels[batch.materialUnit]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(batch.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      {/* Actions based on status */}
                      {(batch.status === 'DRAFT' || batch.status === 'QUEUED') && (
                        <button
                          onClick={() => handleStart(batch.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Iniciar"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {batch.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => handlePause(batch.id)}
                            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Pausar"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleComplete(batch.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Concluir"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {batch.status === 'PAUSED' && (
                        <button
                          onClick={() => handleStart(batch.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Retomar"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(batch.status) && (
                        <button
                          onClick={() => handleCancel(batch.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <Link
                        to={`/digital-fabrication/${batch.id}`}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {batch.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDelete(batch.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Mostrando {((page - 1) * pagination.limit) + 1} a {Math.min(page * pagination.limit, pagination.total)} de {pagination.total} resultados
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
