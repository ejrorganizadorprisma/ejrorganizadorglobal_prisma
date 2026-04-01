import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ArrowLeft,
  Layers,
  Package,
  PackageOpen,
  Clock,
  User,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Wrench,
  TestTube,
  History,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  BoxIcon,
  Minus,
  Plus,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductionBatch,
  useBatchUnits,
  useUnitComponents,
  useUnitTests,
  useUnitHistory,
  useReleaseBatch,
  useStartBatch,
  usePauseBatch,
  useResumeBatch,
  useCompleteBatch,
  useAssignUnit,
  useStartUnit,
  useFinishMounting,
  useMountComponent,
  useMountAllComponents,
  useCreateTest,
  useReleaseComponent,
  useReleaseHistory,
} from '../hooks/useProductionBatches';
import { useUsers } from '../hooks/useUsers';
import type {
  ProductionBatchStatus,
  ProductionUnitStatus,
  UnitComponentStatus,
  TestType,
  TestResult,
} from '@ejr/shared-types';

export function ProductionBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseUnitId, setReleaseUnitId] = useState<string | null>(null);
  const [selectedComponentsForRelease, setSelectedComponentsForRelease] = useState<Set<string>>(new Set());
  const [releaseQuantities, setReleaseQuantities] = useState<Record<string, number>>({});
  const [selectedUnitsForAssign, setSelectedUnitsForAssign] = useState<Set<string>>(new Set());
  const [assignToUserId, setAssignToUserId] = useState<string>('');

  // Estados para clonagem de liberação
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [selectedUnitsForClone, setSelectedUnitsForClone] = useState<Set<string>>(new Set());
  const [cloneInProgress, setCloneInProgress] = useState(false);
  const [cloneResults, setCloneResults] = useState<{
    unitId: string;
    unitNumber: number;
    status: 'pending' | 'success' | 'partial' | 'no_stock';
    released: number;
    skipped: number;
  }[]>([]);
  const [testData, setTestData] = useState<{
    unitId: string;
    testType: TestType;
    result: TestResult;
    observations: string;
    defectsFound: string;
  }>({
    unitId: '',
    testType: 'ASSEMBLY',
    result: 'PASSED',
    observations: '',
    defectsFound: '',
  });

  const { data: batch, isLoading: batchLoading } = useProductionBatch(id);
  const { data: units, isLoading: unitsLoading } = useBatchUnits(id);
  const { data: components } = useUnitComponents(id, selectedUnitId || undefined);
  const { data: tests } = useUnitTests(id, selectedUnitId || undefined);
  const { data: unitHistory } = useUnitHistory(id, selectedUnitId || undefined);
  const { data: usersData } = useUsers({ page: 1, limit: 100 });

  // Component release hooks
  const { data: releaseHistory } = useReleaseHistory(id);
  const releaseComponentMutation = useReleaseComponent();

  // Buscar componentes da unidade selecionada para liberação
  const { data: releaseUnitComponents } = useUnitComponents(id, releaseUnitId || undefined);

  const releaseMutation = useReleaseBatch();
  const startMutation = useStartBatch();
  const pauseMutation = usePauseBatch();
  const resumeMutation = useResumeBatch();
  const completeMutation = useCompleteBatch();
  const assignUnitMutation = useAssignUnit();
  const startUnitMutation = useStartUnit();
  const finishMountingMutation = useFinishMounting();
  const mountComponentMutation = useMountComponent();
  const mountAllMutation = useMountAllComponents();
  const createTestMutation = useCreateTest();

  const productionUsers = usersData?.data?.filter((u) =>
    ['PRODUCTION', 'COORDINATOR', 'MANAGER'].includes(u.role)
  ) || [];

  // Unidades que podem ser atribuídas (PENDING e sem responsável)
  const unassignedUnits = useMemo(() =>
    units?.filter((u) => u.status === 'PENDING' && !u.assignedTo) || [],
    [units]
  );

  // Abrir modal de liberação para uma unidade específica
  const openReleaseModal = (unitId: string) => {
    setReleaseUnitId(unitId);
    setSelectedComponentsForRelease(new Set());
    setReleaseQuantities({});
    setShowReleaseModal(true);
  };

  // Toggle seleção de componente para liberação
  const toggleComponentForRelease = (componentId: string, quantityRequired: number, stockAvailable: number) => {
    setSelectedComponentsForRelease((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(componentId)) {
        newSet.delete(componentId);
        // Remover quantidade
        const newQuantities = { ...releaseQuantities };
        delete newQuantities[componentId];
        setReleaseQuantities(newQuantities);
      } else {
        newSet.add(componentId);
        // Definir quantidade padrão como a necessária, limitada pelo estoque
        const defaultQty = Math.min(quantityRequired, stockAvailable);
        setReleaseQuantities((prev) => ({ ...prev, [componentId]: defaultQty }));
      }
      return newSet;
    });
  };

  // Selecionar/Desselecionar todos os componentes
  const toggleSelectAllComponents = () => {
    if (!releaseUnitComponents) return;

    // Filtrar componentes pendentes E que tenham estoque disponível
    const pendingComponents = releaseUnitComponents.filter(
      (c: any) => {
        const isFullyReleased = c.isReleased || c.quantityRequired <= (c.releasedQuantity || 0);
        const stockAvailable = c.part?.currentStock || 0;
        const hasStock = stockAvailable > 0;
        return !isFullyReleased && hasStock;
      }
    );

    // Componentes selecionáveis (excluindo os sem estoque)
    const selectableIds = new Set(pendingComponents.map((c: any) => c.id));
    const currentSelectableSelected = [...selectedComponentsForRelease].filter(id => selectableIds.has(id));

    if (currentSelectableSelected.length === pendingComponents.length && pendingComponents.length > 0) {
      // Desmarcar todos
      setSelectedComponentsForRelease(new Set());
      setReleaseQuantities({});
    } else {
      // Marcar todos os que têm estoque
      const quantities: Record<string, number> = {};
      pendingComponents.forEach((c: any) => {
        const needed = c.quantityRequired - (c.releasedQuantity || 0);
        const stockAvailable = c.part?.currentStock || 0;
        // Limitar pela quantidade em estoque
        quantities[c.id] = Math.min(needed, stockAvailable);
      });
      setSelectedComponentsForRelease(selectableIds);
      setReleaseQuantities(quantities);
    }
  };

  // Liberar componentes selecionados
  const handleReleaseComponents = async () => {
    if (selectedComponentsForRelease.size === 0) {
      toast.error('Selecione ao menos um componente para liberar');
      return;
    }

    const releases: Array<{ componentId: string; quantity: number }> = [];
    selectedComponentsForRelease.forEach((componentId) => {
      const qty = releaseQuantities[componentId] || 0;
      if (qty > 0) {
        releases.push({ componentId, quantity: qty });
      }
    });

    if (releases.length === 0) {
      toast.error('Informe a quantidade a liberar');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const release of releases) {
        try {
          await releaseComponentMutation.mutateAsync({
            componentId: release.componentId,
            quantity: release.quantity,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} componente(s) liberado(s) do estoque`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} componente(s) falharam ao ser liberados`);
      }

      setShowReleaseModal(false);
      setReleaseUnitId(null);
      setSelectedComponentsForRelease(new Set());
      setReleaseQuantities({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao liberar componentes');
    }
  };

  // Abrir modal de clonagem
  const openCloneModal = () => {
    if (selectedComponentsForRelease.size === 0) {
      toast.error('Selecione ao menos um componente antes de clonar');
      return;
    }
    // Inicializar resultados para as unidades (exceto a atual)
    const otherUnits = units?.filter(u => u.id !== releaseUnitId) || [];
    setCloneResults(otherUnits.map(u => ({
      unitId: u.id,
      unitNumber: u.unitNumber,
      status: 'pending' as const,
      released: 0,
      skipped: 0,
    })));
    setSelectedUnitsForClone(new Set());
    setShowCloneModal(true);
  };

  // Toggle seleção de unidade para clonagem
  const toggleUnitForClone = (unitId: string) => {
    setSelectedUnitsForClone(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  // Selecionar todas as unidades para clonagem
  const toggleSelectAllForClone = () => {
    const otherUnits = units?.filter(u => u.id !== releaseUnitId) || [];
    if (selectedUnitsForClone.size === otherUnits.length) {
      setSelectedUnitsForClone(new Set());
    } else {
      setSelectedUnitsForClone(new Set(otherUnits.map(u => u.id)));
    }
  };

  // Executar clonagem para as unidades selecionadas
  const handleCloneRelease = async () => {
    if (selectedUnitsForClone.size === 0) {
      toast.error('Selecione ao menos uma unidade para aplicar');
      return;
    }

    setCloneInProgress(true);

    // Pegar os componentes selecionados e suas quantidades
    const selectedComponents = releaseUnitComponents?.filter((c: any) =>
      selectedComponentsForRelease.has(c.id)
    ) || [];

    // Mapear part_id para quantidade desejada
    const partQuantities: Record<string, { partId: string; partName: string; quantity: number }> = {};
    selectedComponents.forEach((comp: any) => {
      const qty = releaseQuantities[comp.id] || 0;
      if (qty > 0 && comp.part?.id) {
        partQuantities[comp.part.id] = {
          partId: comp.part.id,
          partName: comp.part.name || 'Componente',
          quantity: qty,
        };
      }
    });

    // Calcular estoque total necessário para cada peça
    const unitsToProcess = Array.from(selectedUnitsForClone);
    const totalNeeded: Record<string, number> = {};
    Object.entries(partQuantities).forEach(([partId, { quantity }]) => {
      totalNeeded[partId] = quantity * unitsToProcess.length;
    });

    // Verificar estoque atual de cada peça (pegar do componente original)
    const stockByPart: Record<string, number> = {};
    selectedComponents.forEach((comp: any) => {
      if (comp.part?.id) {
        stockByPart[comp.part.id] = comp.part.currentStock || 0;
      }
    });

    // Processar cada unidade
    const newResults = [...cloneResults];

    for (const unitId of unitsToProcess) {
      const unitIndex = newResults.findIndex(r => r.unitId === unitId);
      if (unitIndex === -1) continue;

      // Buscar componentes desta unidade
      try {
        // Vamos fazer a liberação para cada componente que tem o mesmo part_id
        // Primeiro precisamos buscar os componentes desta unidade
        const { data: response } = await api.get(`/production-batches/${id}/units/${unitId}/components`);
        const unitComponents = response.data || response;

        let released = 0;
        let skipped = 0;

        // Para cada peça que queremos liberar
        for (const [partId, { quantity }] of Object.entries(partQuantities)) {
          // Encontrar o componente correspondente nesta unidade
          const matchingComp = unitComponents.find((uc: any) => uc.part?.id === partId || uc.partId === partId);

          if (!matchingComp) {
            skipped++;
            continue;
          }

          // Verificar estoque disponível
          const currentStock = stockByPart[partId] || 0;
          if (currentStock <= 0) {
            skipped++;
            continue;
          }

          // Calcular quantidade a liberar (limitada pelo estoque)
          const qtyToRelease = Math.min(quantity, currentStock);

          if (qtyToRelease <= 0) {
            skipped++;
            continue;
          }

          try {
            await releaseComponentMutation.mutateAsync({
              componentId: matchingComp.id,
              quantity: qtyToRelease,
            });

            // Atualizar estoque local para próximas iterações
            stockByPart[partId] = currentStock - qtyToRelease;
            released++;
          } catch {
            skipped++;
          }
        }

        // Atualizar resultado
        let status: 'success' | 'partial' | 'no_stock' = 'success';
        if (released === 0) {
          status = 'no_stock';
        } else if (skipped > 0) {
          status = 'partial';
        }

        newResults[unitIndex] = { ...newResults[unitIndex], status, released, skipped };
        setCloneResults([...newResults]);

      } catch {
        newResults[unitIndex] = { ...newResults[unitIndex], status: 'no_stock', skipped: Object.keys(partQuantities).length };
        setCloneResults([...newResults]);
      }
    }

    setCloneInProgress(false);

    // Resumo
    const successCount = newResults.filter(r => r.status === 'success' && selectedUnitsForClone.has(r.unitId)).length;
    const partialCount = newResults.filter(r => r.status === 'partial' && selectedUnitsForClone.has(r.unitId)).length;
    const failCount = newResults.filter(r => r.status === 'no_stock' && selectedUnitsForClone.has(r.unitId)).length;

    if (successCount > 0) {
      toast.success(`${successCount} unidade(s) com liberação completa`);
    }
    if (partialCount > 0) {
      toast.warning(`${partialCount} unidade(s) com liberação parcial (estoque insuficiente)`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} unidade(s) não puderam ser liberadas`);
    }
  };

  // Toggle seleção de uma unidade
  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitsForAssign((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  // Selecionar/Desselecionar todas
  const toggleSelectAll = () => {
    if (selectedUnitsForAssign.size === unassignedUnits.length) {
      setSelectedUnitsForAssign(new Set());
    } else {
      setSelectedUnitsForAssign(new Set(unassignedUnits.map((u) => u.id)));
    }
  };

  // Atribuir unidades selecionadas em massa
  const handleBulkAssign = async () => {
    if (!assignToUserId || selectedUnitsForAssign.size === 0) {
      toast.error('Selecione um usuário e ao menos uma unidade');
      return;
    }

    try {
      const unitIds = Array.from(selectedUnitsForAssign);
      let successCount = 0;
      let errorCount = 0;

      for (const unitId of unitIds) {
        try {
          await assignUnitMutation.mutateAsync({ batchId: id!, unitId, userId: assignToUserId });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} unidade(s) atribuída(s) com sucesso`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} unidade(s) falharam ao ser atribuídas`);
      }

      setSelectedUnitsForAssign(new Set());
      setAssignToUserId('');
      setShowAssignModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atribuir unidades');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Traduzir ações do histórico para PT-BR
  const translateHistoryAction = (action: string): string => {
    const translations: Record<string, string> = {
      'CREATED': 'Lote criado',
      'STATUS_CHANGED': 'Status alterado',
      'ASSIGNED': 'Unidade atribuída',
      'REASSIGNED': 'Responsável alterado',
      'ALL_COMPONENTS_MOUNTED': 'Todos componentes montados',
      'TEST_ASSEMBLY': 'Teste de montagem',
      'TEST_FINAL': 'Teste final',
      'STOCK_CONSUMED': 'Estoque consumido',
      'STOCK_ADDED': 'Estoque adicionado',
      'COMPONENT_RELEASED': 'Componente liberado',
      'RELEASED': 'Liberado do estoque',
      'MOUNTED': 'Componente montado',
      'UNIT_STARTED': 'Unidade iniciada',
      'UNIT_COMPLETED': 'Unidade concluída',
      'BATCH_RELEASED': 'Lote liberado',
      'BATCH_STARTED': 'Lote iniciado',
      'BATCH_PAUSED': 'Lote pausado',
      'BATCH_RESUMED': 'Lote retomado',
      'BATCH_COMPLETED': 'Lote concluído',
    };
    return translations[action] || action;
  };

  // Traduzir valores de status para PT-BR
  const translateStatusValue = (value: string | null): string => {
    if (!value) return '';
    const translations: Record<string, string> = {
      'DRAFT': 'Rascunho',
      'PLANNED': 'Planejado',
      'RELEASED': 'Liberado',
      'IN_PROGRESS': 'Em Produção',
      'PAUSED': 'Pausado',
      'TESTING': 'Em Teste',
      'COMPLETED': 'Concluído',
      'CANCELLED': 'Cancelado',
      'PENDING': 'Pendente',
      'IN_PRODUCTION': 'Em Montagem',
      'AWAITING_TEST': 'Aguard. Teste',
      'IN_TESTING': 'Em Teste',
      'TEST_PASSED': 'Teste OK',
      'TEST_FAILED': 'Teste Falhou',
      'REWORK': 'Retrabalho',
      'SCRAPPED': 'Refugo',
      'PASSED': 'Aprovado',
      'FAILED': 'Reprovado',
      'PENDING_RETEST': 'Aguard. Reteste',
      // Status de componentes
      'MOUNTED': 'Montado',
      'DEFECTIVE': 'Defeituoso',
      'REPLACED': 'Substituído',
    };
    return translations[value] || value;
  };

  const getStatusBadge = (status: ProductionBatchStatus) => {
    const configs: Record<ProductionBatchStatus, { label: string; className: string }> = {
      DRAFT: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800' },
      PLANNED: { label: 'Planejado', className: 'bg-blue-100 text-blue-800' },
      RELEASED: { label: 'Liberado', className: 'bg-cyan-100 text-cyan-800' },
      IN_PROGRESS: { label: 'Em Produção', className: 'bg-purple-100 text-purple-800' },
      PAUSED: { label: 'Pausado', className: 'bg-yellow-100 text-yellow-800' },
      TESTING: { label: 'Em Teste', className: 'bg-indigo-100 text-indigo-800' },
      COMPLETED: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    const config = configs[status];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getUnitStatusBadge = (status: ProductionUnitStatus) => {
    const configs: Record<ProductionUnitStatus, { label: string; className: string; icon: any }> = {
      PENDING: { label: 'Pendente', className: 'bg-gray-100 text-gray-800', icon: Clock },
      IN_PRODUCTION: { label: 'Em Montagem', className: 'bg-purple-100 text-purple-800', icon: Wrench },
      AWAITING_TEST: { label: 'Aguard. Teste', className: 'bg-blue-100 text-blue-800', icon: TestTube },
      IN_TESTING: { label: 'Em Teste', className: 'bg-indigo-100 text-indigo-800', icon: TestTube },
      TEST_PASSED: { label: 'Teste OK', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      TEST_FAILED: { label: 'Teste Falhou', className: 'bg-red-100 text-red-800', icon: XCircle },
      REWORK: { label: 'Retrabalho', className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      COMPLETED: { label: 'Concluída', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      SCRAPPED: { label: 'Refugo', className: 'bg-red-100 text-red-800', icon: XCircle },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getComponentStatusBadge = (status: UnitComponentStatus) => {
    const configs: Record<UnitComponentStatus, { label: string; className: string }> = {
      PENDING: { label: 'Pendente', className: 'bg-gray-100 text-gray-700' },
      MOUNTED: { label: 'Montado', className: 'bg-green-100 text-green-700' },
      DEFECTIVE: { label: 'Defeituoso', className: 'bg-red-100 text-red-700' },
      REPLACED: { label: 'Substituído', className: 'bg-blue-100 text-blue-700' },
    };
    const config = configs[status];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const handleAssignUnit = async (unitId: string, userId: string) => {
    try {
      await assignUnitMutation.mutateAsync({ batchId: id!, unitId, userId });
      toast.success('Unidade atribuída');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atribuir unidade');
    }
  };

  const handleStartUnit = async (unitId: string) => {
    try {
      await startUnitMutation.mutateAsync({ batchId: id!, unitId });
      toast.success('Montagem iniciada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao iniciar montagem');
    }
  };

  const handleFinishMounting = async (unitId: string) => {
    try {
      await finishMountingMutation.mutateAsync({ batchId: id!, unitId });
      toast.success('Montagem finalizada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao finalizar montagem');
    }
  };

  const handleMountComponent = async (componentId: string) => {
    try {
      await mountComponentMutation.mutateAsync({
        batchId: id!,
        unitId: selectedUnitId!,
        componentId,
      });
      toast.success('Componente marcado como montado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao marcar componente');
    }
  };

  const handleMountAll = async () => {
    try {
      await mountAllMutation.mutateAsync({ batchId: id!, unitId: selectedUnitId! });
      toast.success('Todos os componentes marcados como montados');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao marcar componentes');
    }
  };

  const handleCreateTest = async () => {
    try {
      await createTestMutation.mutateAsync(testData);
      toast.success('Teste registrado');
      setShowTestModal(false);
      setTestData({
        unitId: '',
        testType: 'ASSEMBLY',
        result: 'PASSED',
        observations: '',
        defectsFound: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registrar teste');
    }
  };

  const openTestModal = (unitId: string, testType: TestType) => {
    setTestData({
      ...testData,
      unitId,
      testType,
    });
    setShowTestModal(true);
  };

  if (batchLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-bold mb-4">Lote não encontrado</h2>
        <button
          onClick={() => navigate('/production-batches')}
          className="text-blue-600 hover:underline"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  const progress = batch.quantityPlanned > 0
    ? Math.round((batch.quantityProduced / batch.quantityPlanned) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/production-batches')}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <Layers className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{batch.batchNumber}</h1>
                <p className="text-gray-600">{batch.product?.name || '-'}</p>
              </div>
            </div>
          </div>
          {getStatusBadge(batch.status)}
        </div>

        {/* Batch Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Info */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 lg:p-6">
            <h2 className="text-lg font-semibold mb-4">Informações do Lote</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Produto</p>
                <p className="font-medium">{batch.product?.code} - {batch.product?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantidade Planejada</p>
                <p className="font-medium">{batch.quantityPlanned}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data Início Prevista</p>
                <p className="font-medium">{formatDate(batch.plannedStartDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data Início Real</p>
                <p className="font-medium">{formatDate(batch.actualStartDate)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>Produzido: {batch.quantityProduced}</span>
                <span>Em Progresso: {batch.quantityInProgress}</span>
                <span className="text-red-600">Refugo: {batch.quantityScrapped}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-6">
              {(batch.status === 'DRAFT' || batch.status === 'PLANNED') && (
                <button
                  onClick={async () => {
                    try {
                      await releaseMutation.mutateAsync(id!);
                      toast.success('Lote liberado para produção');
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || error.response?.data?.error?.message || 'Erro ao liberar lote');
                    }
                  }}
                  disabled={releaseMutation.isPending}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
                >
                  {releaseMutation.isPending ? 'Liberando...' : 'Liberar Lote'}
                </button>
              )}
              {batch.status === 'RELEASED' && (
                <button
                  onClick={async () => {
                    try {
                      await startMutation.mutateAsync(id!);
                      toast.success('Produção iniciada');
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Erro ao iniciar produção');
                    }
                  }}
                  disabled={startMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {startMutation.isPending ? 'Iniciando...' : 'Iniciar Produção'}
                </button>
              )}
              {batch.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        await pauseMutation.mutateAsync(id!);
                        toast.success('Produção pausada');
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || 'Erro ao pausar produção');
                      }
                    }}
                    disabled={pauseMutation.isPending}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {pauseMutation.isPending ? 'Pausando...' : 'Pausar'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await completeMutation.mutateAsync(id!);
                        toast.success('Lote completado');
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || 'Erro ao completar lote');
                      }
                    }}
                    disabled={completeMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {completeMutation.isPending ? 'Completando...' : 'Completar'}
                  </button>
                </>
              )}
              {batch.status === 'PAUSED' && (
                <button
                  onClick={async () => {
                    try {
                      await resumeMutation.mutateAsync(id!);
                      toast.success('Produção retomada');
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Erro ao retomar produção');
                    }
                  }}
                  disabled={resumeMutation.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {resumeMutation.isPending ? 'Retomando...' : 'Retomar'}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <h2 className="text-lg font-semibold mb-4">Resumo das Unidades</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-lg">{units?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pendentes</span>
                <span className="text-gray-900">{units?.filter((u) => u.status === 'PENDING').length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Em Montagem</span>
                <span className="text-purple-600">{units?.filter((u) => u.status === 'IN_PRODUCTION').length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Aguard. Teste</span>
                <span className="text-blue-600">{units?.filter((u) => u.status === 'AWAITING_TEST').length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Concluídas</span>
                <span className="text-green-600">{units?.filter((u) => u.status === 'COMPLETED').length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Refugo</span>
                <span className="text-red-600">{units?.filter((u) => u.status === 'SCRAPPED').length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Component Release Section - Only show when batch is RELEASED or IN_PROGRESS */}
        {['RELEASED', 'IN_PROGRESS'].includes(batch.status) && units && units.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 border-l-4 border-orange-500">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <PackageOpen className="w-6 h-6 text-orange-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Liberação de Componentes do Estoque</h2>
                  <p className="text-sm text-gray-600">
                    Selecione uma unidade para liberar seus componentes do estoque
                  </p>
                </div>
              </div>

              {/* Units Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {units.map((unit) => {
                  // Calcular status de liberação da unidade
                  const unitComponents = components && selectedUnitId === unit.id ? components : [];
                  const hasComponentsReleased = unit.status !== 'PENDING';

                  return (
                    <button
                      key={unit.id}
                      onClick={() => openReleaseModal(unit.id)}
                      className={`
                        p-3 rounded-lg border-2 text-left transition-all hover:shadow-md
                        ${hasComponentsReleased
                          ? 'border-green-300 bg-green-50'
                          : 'border-orange-200 bg-orange-50 hover:border-orange-400'
                        }
                      `}
                    >
                      <div className="font-medium text-gray-900">#{unit.unitNumber}</div>
                      {unit.serialNumber && (
                        <div className="text-xs text-blue-600 font-mono">{unit.serialNumber}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {hasComponentsReleased ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Liberado
                          </span>
                        ) : (
                          <span className="text-orange-600">Pendente</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Release History (recent entries) */}
              {releaseHistory && releaseHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Liberações Recentes</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {releaseHistory.slice(0, 5).map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{h.part?.name || h.partId}</span>
                          <span className="text-green-600 font-medium">+{h.quantityReleased}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <span>{h.releasedByUser?.name || '-'}</span>
                          <span>{new Date(h.releasedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignment Section - Only show when batch is RELEASED or IN_PROGRESS and has unassigned units */}
        {['RELEASED', 'IN_PROGRESS'].includes(batch.status) && unassignedUnits.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 border-l-4 border-cyan-500">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-cyan-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Liberar Unidades para Produção</h2>
                    <p className="text-sm text-gray-600">
                      {unassignedUnits.length} unidade(s) disponível(is) para atribuição
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Atribuir Unidades
                </button>
              </div>

              {/* Quick preview of unassigned units */}
              <div className="flex flex-wrap gap-2">
                {unassignedUnits.slice(0, 10).map((unit) => (
                  <span
                    key={unit.id}
                    className="inline-flex flex-col items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                  >
                    <span>#{unit.unitNumber}</span>
                    {unit.serialNumber && (
                      <span className="text-xs text-blue-600 font-mono">{unit.serialNumber}</span>
                    )}
                  </span>
                ))}
                {unassignedUnits.length > 10 && (
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm">
                    +{unassignedUnits.length - 10} mais
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Units List */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Unidades de Produção</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Única</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {units?.map((unit) => (
                  <tr
                    key={unit.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedUnitId === unit.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium">#{unit.unitNumber}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {unit.serialNumber ? (
                        <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">{unit.serialNumber}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getUnitStatusBadge(unit.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {unit.status === 'COMPLETED' || unit.status === 'SCRAPPED' ? (
                        <span className="text-gray-600">{unit.assignedUser?.name || '-'}</span>
                      ) : (
                        <select
                          className="text-sm border rounded px-2 py-1"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleAssignUnit(unit.id, e.target.value)}
                          value={unit.assignedTo || ''}
                        >
                          <option value="" disabled>Atribuir</option>
                          {productionUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(unit.startedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {unit.status === 'PENDING' && unit.assignedTo && (
                          <button
                            onClick={() => handleStartUnit(unit.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Iniciar Montagem"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {unit.status === 'AWAITING_TEST' && (
                          <button
                            onClick={() => openTestModal(unit.id, 'ASSEMBLY')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Teste de Montagem"
                          >
                            <TestTube className="w-4 h-4" />
                          </button>
                        )}
                        {unit.status === 'TEST_PASSED' && (
                          <button
                            onClick={() => openTestModal(unit.id, 'FINAL')}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Teste Final"
                          >
                            <TestTube className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Unit Details */}
        {selectedUnitId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Components */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-semibold">Componentes da Unidade #{units?.find((u) => u.id === selectedUnitId)?.unitNumber}</h3>
                {components?.some((c) => c.status === 'PENDING' && (c.isReleased || (c.releasedQuantity && c.releasedQuantity > 0))) && (
                  <button
                    onClick={handleMountAll}
                    className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                    title="Marca apenas os componentes liberados do estoque"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Todos
                  </button>
                )}
              </div>
              <div className="divide-y">
                {components?.map((comp) => {
                  const isMounted = comp.status === 'MOUNTED';
                  const isReleased = comp.isReleased || (comp.releasedQuantity && comp.releasedQuantity > 0);
                  const canMark = !isMounted && isReleased;
                  const isDisabled = isMounted || !isReleased;

                  return (
                    <div
                      key={comp.id}
                      className={`p-4 flex items-center justify-between ${!isReleased && !isMounted ? 'opacity-50 bg-gray-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <label className={`flex items-center ${canMark ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                          <input
                            type="checkbox"
                            checked={isMounted}
                            disabled={isDisabled}
                            onChange={() => {
                              if (canMark) {
                                handleMountComponent(comp.id);
                              }
                            }}
                            className={`w-5 h-5 rounded border-gray-300 focus:ring-green-500 ${
                              canMark
                                ? 'text-green-600 cursor-pointer'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                          />
                        </label>
                        <div>
                          <p className={`font-medium ${!isReleased && !isMounted ? 'text-gray-400' : ''}`}>
                            {comp.part?.name || '-'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Código: {comp.part?.code || '-'} | Qtd: {comp.quantityRequired}
                          </p>
                          {!isReleased && !isMounted && (
                            <p className="text-xs text-orange-500 mt-1">
                              Aguardando liberação do estoque
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded ${
                        isMounted
                          ? 'bg-green-100 text-green-700'
                          : isReleased
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isMounted ? 'Montado' : isReleased ? 'Liberado' : 'Pendente'}
                      </span>
                    </div>
                  );
                })}
                {components?.length === 0 && (
                  <p className="p-4 text-gray-500 text-center">Nenhum componente cadastrado</p>
                )}
              </div>
              {components?.every((c) => c.status === 'MOUNTED') && components?.length > 0 && (
                <div className="p-4 border-t">
                  <button
                    onClick={() => handleFinishMounting(selectedUnitId)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Finalizar Montagem
                  </button>
                </div>
              )}
            </div>

            {/* Tests */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Testes Realizados</h3>
              </div>
              <div className="divide-y">
                {tests?.map((test) => (
                  <div key={test.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {test.testType === 'ASSEMBLY' ? 'Teste de Montagem' : 'Teste Final'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Por: {test.testedByUser?.name || '-'} em {formatDate(test.testedAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        test.result === 'PASSED' ? 'bg-green-100 text-green-800' :
                        test.result === 'FAILED' ? 'bg-red-100 text-red-800' :
                        test.result === 'CONDITIONAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {test.result === 'PASSED' ? 'Aprovado' :
                         test.result === 'FAILED' ? 'Reprovado' :
                         test.result === 'CONDITIONAL' ? 'Condicional' : 'Pendente'}
                      </span>
                    </div>
                    {test.observations && (
                      <p className="mt-2 text-sm text-gray-600">{test.observations}</p>
                    )}
                    {test.defectsFound && (
                      <p className="mt-1 text-sm text-red-600">Defeitos: {test.defectsFound}</p>
                    )}
                  </div>
                ))}
                {tests?.length === 0 && (
                  <p className="p-4 text-gray-500 text-center">Nenhum teste realizado</p>
                )}
              </div>
            </div>

            {/* Unit History */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold">Histórico da Unidade</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {unitHistory?.map((h) => (
                  <div key={h.id} className="p-3">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 whitespace-nowrap text-xs">{formatDate(h.performedAt)}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium text-sm">{h.performedByUser?.name || '-'}</span>
                      <span className="text-gray-600 text-sm ml-2">{translateHistoryAction(h.action)}</span>
                    </div>
                    {(h.previousValue || h.newValue) && (
                      <div className="mt-1 text-sm">
                        {h.previousValue && (
                          <span className="text-red-500 line-through mr-2">{translateStatusValue(h.previousValue)}</span>
                        )}
                        {h.newValue && (
                          <span className="text-green-600">{translateStatusValue(h.newValue)}</span>
                        )}
                      </div>
                    )}
                    {h.notes && (
                      <p className="mt-1 text-xs text-gray-500">{h.notes}</p>
                    )}
                  </div>
                ))}
                {(!unitHistory || unitHistory.length === 0) && (
                  <p className="p-4 text-gray-500 text-center">Nenhum registro no histórico</p>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Test Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {testData.testType === 'ASSEMBLY' ? 'Teste de Montagem' : 'Teste Final'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                  <select
                    value={testData.result}
                    onChange={(e) => setTestData({ ...testData, result: e.target.value as TestResult })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="PASSED">Aprovado</option>
                    <option value="FAILED">Reprovado</option>
                    <option value="CONDITIONAL">Aprovado com Ressalvas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={testData.observations}
                    onChange={(e) => setTestData({ ...testData, observations: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>

                {testData.result === 'FAILED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Defeitos Encontrados</label>
                    <textarea
                      value={testData.defectsFound}
                      onChange={(e) => setTestData({ ...testData, defectsFound: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTest}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Registrar Teste
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-600" />
                  Atribuir Unidades para Produção
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedUnitsForAssign(new Set());
                    setAssignToUserId('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* User Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atribuir para:
                </label>
                <select
                  value={assignToUserId}
                  onChange={(e) => setAssignToUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Selecione um operador</option>
                  {productionUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'PRODUCTION' ? 'Operador' : u.role === 'COORDINATOR' ? 'Coordenador' : 'Gerente'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select All / None */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <span className="text-sm text-gray-600">
                  {selectedUnitsForAssign.size} de {unassignedUnits.length} selecionada(s)
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-cyan-600 hover:text-cyan-800 flex items-center gap-1"
                >
                  {selectedUnitsForAssign.size === unassignedUnits.length ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Desmarcar Todas
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Selecionar Todas
                    </>
                  )}
                </button>
              </div>

              {/* Units List with Checkboxes */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {unassignedUnits.map((unit) => {
                    const isSelected = selectedUnitsForAssign.has(unit.id);
                    return (
                      <label
                        key={unit.id}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUnitSelection(unit.id)}
                          className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        />
                        <div>
                          <span className="font-medium">#{unit.unitNumber}</span>
                          {unit.serialNumber && (
                            <p className="text-xs text-gray-500">{unit.serialNumber}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedUnitsForAssign(new Set());
                    setAssignToUserId('');
                  }}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!assignToUserId || selectedUnitsForAssign.size === 0 || assignUnitMutation.isPending}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {assignUnitMutation.isPending ? (
                    'Atribuindo...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Atribuir {selectedUnitsForAssign.size > 0 ? `(${selectedUnitsForAssign.size})` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Component Release Modal - Per Unit */}
        {showReleaseModal && releaseUnitId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <PackageOpen className="w-5 h-5 text-orange-600" />
                  Liberar Componentes - Unidade #{units?.find((u) => u.id === releaseUnitId)?.unitNumber}
                </h3>
                <button
                  onClick={() => {
                    setShowReleaseModal(false);
                    setReleaseUnitId(null);
                    setSelectedComponentsForRelease(new Set());
                    setReleaseQuantities({});
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Marque os componentes que deseja liberar do estoque e informe a quantidade.
              </p>

              {/* Select All / None */}
              {releaseUnitComponents && releaseUnitComponents.length > 0 && (
                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                  <span className="text-sm text-gray-600">
                    {selectedComponentsForRelease.size} de {releaseUnitComponents.filter((c: any) =>
                      c.quantityRequired > (c.releasedQuantity || 0)
                    ).length} selecionado(s)
                  </span>
                  <button
                    onClick={toggleSelectAllComponents}
                    className="text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1"
                  >
                    {selectedComponentsForRelease.size === releaseUnitComponents.filter((c: any) =>
                      c.quantityRequired > (c.releasedQuantity || 0)
                    ).length ? (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        Selecionar Todos
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Components List with Checkboxes */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                {releaseUnitComponents && releaseUnitComponents.length > 0 ? (
                  <div className="space-y-2">
                    {releaseUnitComponents.map((comp: any) => {
                      const pending = comp.quantityRequired - (comp.releasedQuantity || 0);
                      const isSelected = selectedComponentsForRelease.has(comp.id);
                      const isFullyReleased = pending <= 0;
                      const currentQty = releaseQuantities[comp.id] || 0;
                      const stockAvailable = comp.part?.currentStock || 0;
                      const hasNoStock = stockAvailable <= 0;
                      const isDisabled = isFullyReleased || hasNoStock;

                      return (
                        <div
                          key={comp.id}
                          className={`
                            p-3 rounded-lg border-2 transition-all
                            ${isFullyReleased
                              ? 'border-green-200 bg-green-50 opacity-60'
                              : hasNoStock
                                ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                : isSelected
                                  ? 'border-orange-400 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => !isDisabled && toggleComponentForRelease(comp.id, pending, stockAvailable)}
                              className={`w-5 h-5 rounded focus:ring-orange-500 ${
                                hasNoStock ? 'text-gray-300 cursor-not-allowed' : 'text-orange-600'
                              } disabled:opacity-50`}
                            />

                            {/* Component Info */}
                            <div className="flex-1">
                              <div className={`font-medium ${hasNoStock ? 'text-gray-400' : 'text-gray-900'}`}>
                                {comp.part?.name || 'Componente'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {comp.part?.code || '-'} | Necessário: {comp.quantityRequired}
                                {comp.releasedQuantity > 0 && (
                                  <span className="text-green-600 ml-2">
                                    (Já liberado: {comp.releasedQuantity})
                                  </span>
                                )}
                              </div>
                              {/* Stock indicator */}
                              <div className={`text-xs mt-1 ${
                                hasNoStock ? 'text-red-500 font-medium' : 'text-blue-600'
                              }`}>
                                Estoque: {stockAvailable}
                                {hasNoStock && ' - SEM ESTOQUE'}
                              </div>
                            </div>

                            {/* Status or Quantity Input */}
                            {isFullyReleased ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Liberado
                              </span>
                            ) : hasNoStock ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3 mr-1" />
                                Sem Estoque
                              </span>
                            ) : isSelected ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Qtd:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={Math.min(pending, stockAvailable)}
                                  value={currentQty}
                                  onChange={(e) => {
                                    const maxVal = Math.min(pending, stockAvailable);
                                    const val = Math.min(Math.max(1, parseInt(e.target.value) || 1), maxVal);
                                    setReleaseQuantities((prev) => ({ ...prev, [comp.id]: val }));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 text-center border rounded px-2 py-1 text-sm"
                                />
                                <span className="text-xs text-gray-400">/ {Math.min(pending, stockAvailable)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-orange-600">
                                Pendente: {pending}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum componente encontrado para esta unidade
                  </p>
                )}
              </div>

              {/* Summary */}
              {selectedComponentsForRelease.size > 0 && (
                <div className="bg-orange-50 rounded-lg p-3 mb-4 border border-orange-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      Componentes selecionados: <strong>{selectedComponentsForRelease.size}</strong>
                    </span>
                    <span className="font-bold text-orange-600">
                      Total: {Object.values(releaseQuantities).reduce((acc, val) => acc + val, 0)} unidades
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t">
                {/* Botão de Clonagem */}
                {units && units.length > 1 && (
                  <button
                    onClick={openCloneModal}
                    disabled={selectedComponentsForRelease.size === 0}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Aplicar para Outras Unidades ({units.length - 1})
                  </button>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReleaseModal(false);
                      setReleaseUnitId(null);
                      setSelectedComponentsForRelease(new Set());
                      setReleaseQuantities({});
                    }}
                    className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReleaseComponents}
                    disabled={selectedComponentsForRelease.size === 0 || releaseComponentMutation.isPending}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {releaseComponentMutation.isPending ? (
                      'Liberando...'
                    ) : (
                      <>
                        <PackageOpen className="w-4 h-4" />
                        Liberar do Estoque
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Clonagem de Liberação */}
        {showCloneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Copy className="w-5 h-5 text-blue-600" />
                  Aplicar para Outras Unidades
                </h3>
                <button
                  onClick={() => {
                    setShowCloneModal(false);
                    setSelectedUnitsForClone(new Set());
                    setCloneResults([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={cloneInProgress}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Selecione as unidades que receberão a mesma liberação de componentes.
                <br />
                <span className="text-orange-600 font-medium">
                  {selectedComponentsForRelease.size} componente(s) selecionado(s) |
                  Total: {Object.values(releaseQuantities).reduce((acc, val) => acc + val, 0)} unidades cada
                </span>
              </p>

              {/* Aviso de estoque */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-700">
                    O sistema verificará o estoque disponível em tempo real.
                    Se o estoque acabar durante a clonagem, as unidades restantes ficarão marcadas como parcial ou sem estoque.
                  </div>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <span className="text-sm text-gray-600">
                  {selectedUnitsForClone.size} de {units?.filter(u => u.id !== releaseUnitId).length || 0} selecionada(s)
                </span>
                <button
                  onClick={toggleSelectAllForClone}
                  disabled={cloneInProgress}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                >
                  {selectedUnitsForClone.size === (units?.filter(u => u.id !== releaseUnitId).length || 0) ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Desmarcar Todas
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Selecionar Todas
                    </>
                  )}
                </button>
              </div>

              {/* Lista de Unidades */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-4 max-h-64">
                <div className="space-y-2">
                  {cloneResults.map((result) => {
                    const isSelected = selectedUnitsForClone.has(result.unitId);
                    const showResult = result.status !== 'pending';

                    return (
                      <div
                        key={result.unitId}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${showResult
                            ? result.status === 'success'
                              ? 'border-green-300 bg-green-50'
                              : result.status === 'partial'
                                ? 'border-yellow-300 bg-yellow-50'
                                : 'border-red-300 bg-red-50'
                            : isSelected
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={cloneInProgress || showResult}
                            onChange={() => toggleUnitForClone(result.unitId)}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />

                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              Unidade #{result.unitNumber}
                            </div>
                          </div>

                          {/* Status */}
                          {showResult ? (
                            <div className="flex items-center gap-2">
                              {result.status === 'success' && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completo ({result.released})
                                </span>
                              )}
                              {result.status === 'partial' && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Parcial ({result.released}/{result.released + result.skipped})
                                </span>
                              )}
                              {result.status === 'no_stock' && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Sem Estoque
                                </span>
                              )}
                            </div>
                          ) : cloneInProgress && isSelected ? (
                            <span className="text-sm text-blue-600">Processando...</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCloneModal(false);
                    setSelectedUnitsForClone(new Set());
                    setCloneResults([]);
                  }}
                  disabled={cloneInProgress}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {cloneResults.some(r => r.status !== 'pending') ? 'Fechar' : 'Cancelar'}
                </button>
                {!cloneResults.some(r => r.status !== 'pending') && (
                  <button
                    onClick={handleCloneRelease}
                    disabled={selectedUnitsForClone.size === 0 || cloneInProgress}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cloneInProgress ? (
                      'Aplicando...'
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Aplicar ({selectedUnitsForClone.size})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
