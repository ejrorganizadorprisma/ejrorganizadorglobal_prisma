import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Printer,
  Scissors,
  ArrowLeft,
  Play,
  Pause,
  Check,
  X,
  Plus,
  Trash2,
  Package,
  Clock,
  Scale,
  History,
  Edit,
  Save,
} from 'lucide-react';
import {
  useDigitalFabricationBatch,
  useFabricationItems,
  useFabricationConsumption,
  useFabricationHistory,
  useStartBatch,
  usePauseBatch,
  useResumeBatch,
  useCompleteBatch,
  useCancelBatch,
  useFailBatch,
  useCreateFabricationItem,
  useCompleteFabricationItem,
  useDeleteFabricationItem,
  useRegisterConsumption,
} from '../hooks/useDigitalFabrication';
import { useProducts } from '../hooks/useProducts';
import {
  FabricationJobStatus,
  FabricationJobStatusLabels,
  FabricationMachineTypeLabels,
  MaterialTypeLabels,
  MaterialUnitLabels,
  MaterialType,
  MaterialUnit,
  CreateDigitalFabricationItemDTO,
  CompleteFabricationItemDTO,
  RegisterMaterialConsumptionDTO,
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

export function DigitalFabricationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'items' | 'consumption' | 'history'>('items');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCompleteItem, setShowCompleteItem] = useState<string | null>(null);
  const [showConsumeModal, setShowConsumeModal] = useState(false);

  const { data: batch, isLoading: loadingBatch } = useDigitalFabricationBatch(id);
  const { data: items, isLoading: loadingItems } = useFabricationItems(id);
  const { data: consumption } = useFabricationConsumption(id);
  const { data: history } = useFabricationHistory(id);
  const { data: productsData } = useProducts({ limit: 500 });

  const startBatch = useStartBatch();
  const pauseBatch = usePauseBatch();
  const resumeBatch = useResumeBatch();
  const completeBatch = useCompleteBatch();
  const cancelBatch = useCancelBatch();
  const failBatch = useFailBatch();
  const createItem = useCreateFabricationItem();
  const completeItem = useCompleteFabricationItem();
  const deleteItem = useDeleteFabricationItem();
  const registerConsumption = useRegisterConsumption();

  const products = productsData?.data || [];
  const materialProducts = products.filter(p =>
    p.name.toLowerCase().includes('filament') ||
    p.name.toLowerCase().includes('pla') ||
    p.name.toLowerCase().includes('mdf') ||
    p.type === 'RAW_MATERIAL'
  );

  // Form states
  const [newItem, setNewItem] = useState({
    itemName: '',
    quantityPlanned: 1,
    materialType: batch?.machineType === 'PRINTER_3D' ? MaterialType.PLA : MaterialType.MDF_3MM,
    materialPlanned: 0,
    materialUnit: batch?.machineType === 'PRINTER_3D' ? MaterialUnit.GRAMS : MaterialUnit.CM_SQ,
    cutWidth: 0,
    cutHeight: 0,
  });

  const [completeData, setCompleteData] = useState({
    quantityProduced: 0,
    quantityFailed: 0,
    materialUsed: 0,
    actualPrintTimeMinutes: 0,
  });

  const [consumeData, setConsumeData] = useState({
    materialProductId: '',
    quantityConsumed: 0,
    quantityWasted: 0,
    unit: batch?.materialUnit || MaterialUnit.GRAMS,
    notes: '',
  });

  if (loadingBatch) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lote não encontrado</p>
        <Link to="/digital-fabrication" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    );
  }

  const handleStartBatch = async () => {
    try {
      await startBatch.mutateAsync(batch.id);
      toast.success('Lote iniciado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao iniciar');
    }
  };

  const handlePauseBatch = async () => {
    try {
      await pauseBatch.mutateAsync(batch.id);
      toast.success('Lote pausado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao pausar');
    }
  };

  const handleResumeBatch = async () => {
    try {
      await resumeBatch.mutateAsync(batch.id);
      toast.success('Lote retomado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao retomar');
    }
  };

  const handleCompleteBatch = async () => {
    if (!confirm('Tem certeza que deseja concluir este lote?')) return;
    try {
      await completeBatch.mutateAsync(batch.id);
      toast.success('Lote concluído!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao concluir');
    }
  };

  const handleCancelBatch = async () => {
    if (!confirm('Tem certeza que deseja cancelar este lote?')) return;
    try {
      await cancelBatch.mutateAsync(batch.id);
      toast.success('Lote cancelado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
    }
  };

  const handleFailBatch = async () => {
    if (!confirm('Marcar este lote como falhou?')) return;
    try {
      await failBatch.mutateAsync(batch.id);
      toast.success('Lote marcado como falhou');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.itemName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const dto: CreateDigitalFabricationItemDTO = {
        batchId: batch.id,
        itemName: newItem.itemName,
        quantityPlanned: newItem.quantityPlanned,
        materialType: newItem.materialType,
        materialPlanned: newItem.materialPlanned,
        materialUnit: newItem.materialUnit,
        cutWidth: newItem.cutWidth || undefined,
        cutHeight: newItem.cutHeight || undefined,
      };

      await createItem.mutateAsync(dto);
      toast.success('Item adicionado!');
      setShowAddItem(false);
      setNewItem({
        itemName: '',
        quantityPlanned: 1,
        materialType: batch.machineType === 'PRINTER_3D' ? MaterialType.PLA : MaterialType.MDF_3MM,
        materialPlanned: 0,
        materialUnit: batch.machineType === 'PRINTER_3D' ? MaterialUnit.GRAMS : MaterialUnit.CM_SQ,
        cutWidth: 0,
        cutHeight: 0,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao adicionar item');
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      const dto: CompleteFabricationItemDTO = {
        quantityProduced: completeData.quantityProduced,
        quantityFailed: completeData.quantityFailed,
        materialUsed: completeData.materialUsed,
        actualPrintTimeMinutes: completeData.actualPrintTimeMinutes || undefined,
      };

      await completeItem.mutateAsync({ itemId, dto });
      toast.success('Item completado!');
      setShowCompleteItem(null);
      setCompleteData({ quantityProduced: 0, quantityFailed: 0, materialUsed: 0, actualPrintTimeMinutes: 0 });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao completar item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await deleteItem.mutateAsync(itemId);
      toast.success('Item excluído!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir item');
    }
  };

  const handleRegisterConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumeData.materialProductId) {
      toast.error('Selecione um material');
      return;
    }

    try {
      const dto: RegisterMaterialConsumptionDTO = {
        batchId: batch.id,
        materialProductId: consumeData.materialProductId,
        quantityConsumed: consumeData.quantityConsumed,
        quantityWasted: consumeData.quantityWasted,
        unit: consumeData.unit,
        notes: consumeData.notes || undefined,
      };

      await registerConsumption.mutateAsync(dto);
      toast.success('Consumo registrado!');
      setShowConsumeModal(false);
      setConsumeData({
        materialProductId: '',
        quantityConsumed: 0,
        quantityWasted: 0,
        unit: batch.materialUnit,
        notes: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao registrar consumo');
    }
  };

  const progressPercent = batch.totalItemsPlanned > 0
    ? Math.round((batch.totalItemsProduced / batch.totalItemsPlanned) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {batch.machineType === 'PRINTER_3D' ? (
              <div className="p-2 bg-purple-100 rounded-lg">
                <Printer className="w-6 h-6 text-purple-600" />
              </div>
            ) : (
              <div className="p-2 bg-orange-100 rounded-lg">
                <Scissors className="w-6 h-6 text-orange-600" />
              </div>
            )}
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{batch.batchNumber}</h1>
              <p className="text-gray-600">{FabricationMachineTypeLabels[batch.machineType]}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {(batch.status === 'DRAFT' || batch.status === 'QUEUED') && (
            <button
              onClick={handleStartBatch}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {batch.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={handlePauseBatch}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <Pause className="w-4 h-4" />
                Pausar
              </button>
              <button
                onClick={handleCompleteBatch}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Concluir
              </button>
              <button
                onClick={handleFailBatch}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <X className="w-4 h-4" />
                Falhou
              </button>
            </>
          )}
          {batch.status === 'PAUSED' && (
            <button
              onClick={handleResumeBatch}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              Retomar
            </button>
          )}
          {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(batch.status) && (
            <button
              onClick={handleCancelBatch}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Status</p>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-1 ${statusColors[batch.status]}`}>
            {FabricationJobStatusLabels[batch.status]}
          </span>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Progresso</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {batch.totalItemsProduced}/{batch.totalItemsPlanned} itens
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Material Usado</p>
          <p className="text-xl font-bold mt-1">
            {batch.totalMaterialUsed.toFixed(1)} {MaterialUnitLabels[batch.materialUnit]}
          </p>
          <p className="text-xs text-gray-400">
            Planejado: {batch.totalMaterialPlanned.toFixed(1)} | Desperdício: {batch.totalMaterialWasted.toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Operador</p>
          <p className="font-medium mt-1">{batch.operator?.name || 'Não definido'}</p>
          {batch.machine && (
            <p className="text-xs text-gray-400">{batch.machine.name}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex flex-wrap gap-4 px-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('items')}
              className={`py-3 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Itens ({items?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('consumption')}
              className={`py-3 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'consumption'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Scale className="w-4 h-4 inline mr-2" />
              Consumo ({consumption?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="w-4 h-4 inline mr-2" />
              Histórico
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(batch.status) && (
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Itens do Lote</h3>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Item
                  </button>
                </div>
              )}

              {loadingItems ? (
                <p className="text-gray-500">Carregando...</p>
              ) : items?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum item neste lote</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produzido</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            {item.fileName && <p className="text-xs text-gray-400">{item.fileName}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{MaterialTypeLabels[item.materialType]}</span>
                          <p className="text-xs text-gray-400">
                            {item.materialPlanned.toFixed(1)} {MaterialUnitLabels[item.materialUnit]}/un
                          </p>
                        </td>
                        <td className="px-4 py-3">{item.quantityPlanned}</td>
                        <td className="px-4 py-3">
                          <span className="text-green-600">{item.quantityProduced}</span>
                          {item.quantityFailed > 0 && (
                            <span className="text-red-600 ml-2">({item.quantityFailed} falhas)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {batch.status === 'IN_PROGRESS' && item.quantityProduced < item.quantityPlanned && (
                              <button
                                onClick={() => {
                                  setShowCompleteItem(item.id);
                                  setCompleteData({
                                    quantityProduced: item.quantityPlanned - item.quantityProduced - item.quantityFailed,
                                    quantityFailed: 0,
                                    materialUsed: item.materialPlanned * (item.quantityPlanned - item.quantityProduced - item.quantityFailed),
                                    actualPrintTimeMinutes: 0,
                                  });
                                }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Registrar produção"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {batch.status === 'DRAFT' && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
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
            </div>
          )}

          {/* Consumption Tab */}
          {activeTab === 'consumption' && (
            <div className="space-y-4">
              {batch.status === 'IN_PROGRESS' && (
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Consumo de Material</h3>
                  <button
                    onClick={() => setShowConsumeModal(true)}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Consumo
                  </button>
                </div>
              )}

              {consumption?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum consumo registrado</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Consumido</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desperdiçado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Por</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {consumption?.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3">{c.materialProduct?.name || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {c.quantityConsumed} {MaterialUnitLabels[c.unit]}
                        </td>
                        <td className="px-4 py-3 text-red-600">
                          {c.quantityWasted} {MaterialUnitLabels[c.unit]}
                        </td>
                        <td className="px-4 py-3">{c.consumedByUser?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(new Date(c.consumedAt), 'dd/MM HH:mm', { locale: ptBR })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {history?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum histórico</p>
              ) : (
                history?.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-blue-100 rounded">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{h.action}</p>
                      {h.newStatus && <p className="text-xs text-gray-500">Novo status: {h.newStatus}</p>}
                      <p className="text-xs text-gray-400">
                        Por {h.performedByUser?.name} em {format(new Date(h.performedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Adicionar Item</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    value={newItem.quantityPlanned}
                    onChange={(e) => setNewItem({ ...newItem, quantityPlanned: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material ({batch.machineType === 'PRINTER_3D' ? 'g' : 'cm²'})
                  </label>
                  <input
                    type="number"
                    value={newItem.materialPlanned}
                    onChange={(e) => setNewItem({ ...newItem, materialPlanned: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step={0.1}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Item Modal */}
      {showCompleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Registrar Producao</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCompleteItem(showCompleteItem); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produzido</label>
                  <input
                    type="number"
                    value={completeData.quantityProduced}
                    onChange={(e) => setCompleteData({ ...completeData, quantityProduced: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Falhas</label>
                  <input
                    type="number"
                    value={completeData.quantityFailed}
                    onChange={(e) => setCompleteData({ ...completeData, quantityFailed: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Usado</label>
                <input
                  type="number"
                  value={completeData.materialUsed}
                  onChange={(e) => setCompleteData({ ...completeData, materialUsed: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.1}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteItem(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consume Modal */}
      {showConsumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Registrar Consumo de Material</h2>
            <form onSubmit={handleRegisterConsumption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                <select
                  value={consumeData.materialProductId}
                  onChange={(e) => setConsumeData({ ...consumeData, materialProductId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Selecione</option>
                  {materialProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Est: {p.currentStock})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumido</label>
                  <input
                    type="number"
                    value={consumeData.quantityConsumed}
                    onChange={(e) => setConsumeData({ ...consumeData, quantityConsumed: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step={0.1}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desperdiçado</label>
                  <input
                    type="number"
                    value={consumeData.quantityWasted}
                    onChange={(e) => setConsumeData({ ...consumeData, quantityWasted: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step={0.1}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={consumeData.notes}
                  onChange={(e) => setConsumeData({ ...consumeData, notes: e.target.value })}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConsumeModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
