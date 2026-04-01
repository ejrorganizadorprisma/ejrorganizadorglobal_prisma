import { useState } from 'react';
import {
  Wrench,
  CheckCircle,
  Clock,
  Package,
  TestTube,
  AlertTriangle,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyProductionUnits,
  useMyProductionSummary,
  useMountComponent,
  useMountAllComponents,
  useFinishMounting,
  useCreateTest,
} from '../hooks/useProductionBatches';
import type { ProductionUnitStatus, UnitComponentStatus, TestType, TestResult } from '@ejr/shared-types';

export function MyProductionPage() {
  const { data: units, isLoading: unitsLoading } = useMyProductionUnits();
  const { data: summary, isLoading: summaryLoading } = useMyProductionSummary();
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
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

  const mountComponentMutation = useMountComponent();
  const mountAllMutation = useMountAllComponents();
  const finishMountingMutation = useFinishMounting();
  const createTestMutation = useCreateTest();

  const getUnitStatusBadge = (status: ProductionUnitStatus) => {
    const configs: Record<ProductionUnitStatus, { label: string; className: string; icon: any }> = {
      PENDING: { label: 'Pendente', className: 'bg-gray-100 text-gray-800', icon: Clock },
      IN_PRODUCTION: { label: 'Em Montagem', className: 'bg-purple-100 text-purple-800', icon: Wrench },
      AWAITING_TEST: { label: 'Aguard. Teste', className: 'bg-blue-100 text-blue-800', icon: TestTube },
      IN_TESTING: { label: 'Em Teste', className: 'bg-indigo-100 text-indigo-800', icon: TestTube },
      TEST_PASSED: { label: 'Teste OK', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      TEST_FAILED: { label: 'Teste Falhou', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
      REWORK: { label: 'Retrabalho', className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      COMPLETED: { label: 'Concluída', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      SCRAPPED: { label: 'Refugo', className: 'bg-red-100 text-red-800', icon: AlertTriangle },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        <Icon className="w-4 h-4" />
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

  const handleMountComponent = async (batchId: string, unitId: string, componentId: string) => {
    try {
      await mountComponentMutation.mutateAsync({ batchId, unitId, componentId });
      toast.success('Componente montado!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao marcar componente');
    }
  };

  const handleMountAll = async (batchId: string, unitId: string) => {
    try {
      await mountAllMutation.mutateAsync({ batchId, unitId });
      toast.success('Todos os componentes montados!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao marcar componentes');
    }
  };

  const handleFinishMounting = async (batchId: string, unitId: string) => {
    try {
      await finishMountingMutation.mutateAsync({ batchId, unitId });
      toast.success('Montagem finalizada! Aguardando teste.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao finalizar montagem');
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

  const handleCreateTest = async () => {
    try {
      await createTestMutation.mutateAsync(testData);
      toast.success('Teste registrado com sucesso!');
      setShowTestModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registrar teste');
    }
  };

  if (unitsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Minha Produção</h1>
          <p className="text-gray-600">Unidades atribuídas para montagem</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Atribuídas</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.assignedUnits || 0}</p>
              </div>
              <Wrench className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Em Montagem</p>
                <p className="text-2xl font-bold text-purple-600">{summary?.inProgress || 0}</p>
              </div>
              <Play className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aguard. Teste</p>
                <p className="text-2xl font-bold text-blue-600">{summary?.awaitingTest || 0}</p>
              </div>
              <TestTube className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Concluídas Hoje</p>
                <p className="text-2xl font-bold text-green-600">{summary?.completedToday || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Units List */}
        {!units || units.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma unidade atribuída
            </h3>
            <p className="text-gray-600">
              Você não possui unidades de produção atribuídas no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {units.map((unit) => {
              const isExpanded = expandedUnitId === unit.id;
              const componentsTotal = unit.components?.length || 0;
              const componentsMounted = unit.components?.filter((c) => c.status === 'MOUNTED').length || 0;
              const allMounted = componentsTotal > 0 && componentsMounted === componentsTotal;
              const hasPendingComponents = unit.components?.some((c) => c.status === 'PENDING');

              return (
                <div key={unit.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Unit Header */}
                  <div
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {unit.batch?.product?.name || '-'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Lote: {unit.batch?.batchNumber} | Unidade #{unit.unitNumber}
                            {unit.serialNumber && (
                              <span className="ml-2 font-semibold text-blue-600">
                                ({unit.serialNumber})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      {getUnitStatusBadge(unit.status)}
                      <div className="text-sm text-gray-600">
                        {componentsMounted}/{componentsTotal} componentes
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* Progress Bar */}
                      <div className="px-4 py-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Progresso da Montagem</span>
                          <span className="text-sm text-gray-600">
                            {componentsTotal > 0 ? Math.round((componentsMounted / componentsTotal) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${componentsTotal > 0 ? (componentsMounted / componentsTotal) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Components List */}
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-900">Componentes</h4>
                          {unit.components?.some((c) => c.status === 'PENDING' && (c.isReleased || (c.releasedQuantity && c.releasedQuantity > 0))) && unit.status === 'IN_PRODUCTION' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMountAll(unit.batchId, unit.id);
                              }}
                              className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                              title="Marca apenas os componentes liberados do estoque"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Marcar Todos
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {unit.components?.map((comp) => {
                            const isMounted = comp.status === 'MOUNTED';
                            const isReleased = comp.isReleased || (comp.releasedQuantity && comp.releasedQuantity > 0);
                            const canMark = !isMounted && isReleased;
                            const isDisabled = isMounted || !isReleased;

                            return (
                              <div
                                key={comp.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  !isReleased && !isMounted ? 'bg-gray-100 opacity-50' : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {unit.status === 'IN_PRODUCTION' ? (
                                    <label className={`flex items-center ${canMark ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                      <input
                                        type="checkbox"
                                        checked={isMounted}
                                        disabled={isDisabled}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          if (canMark) {
                                            handleMountComponent(unit.batchId, unit.id, comp.id);
                                          }
                                        }}
                                        className={`w-5 h-5 rounded border-gray-300 focus:ring-green-500 ${
                                          canMark
                                            ? 'text-green-600 cursor-pointer'
                                            : 'text-gray-300 cursor-not-allowed'
                                        }`}
                                      />
                                    </label>
                                  ) : (
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                      isMounted ? 'bg-green-500 border-green-500' : 'border-gray-300'
                                    }`}>
                                      {isMounted && (
                                        <CheckCircle className="w-4 h-4 text-white" />
                                      )}
                                    </div>
                                  )}
                                  <div>
                                    <p className={`font-medium ${!isReleased && !isMounted ? 'text-gray-400' : 'text-gray-900'}`}>
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
                                <div className="flex items-center gap-2">
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
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-4 border-t bg-gray-50">
                        <div className="flex flex-wrap gap-3">
                          {allMounted && unit.status === 'IN_PRODUCTION' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFinishMounting(unit.batchId, unit.id);
                              }}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              Finalizar Montagem
                            </button>
                          )}
                          {unit.status === 'AWAITING_TEST' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTestModal(unit.id, 'ASSEMBLY');
                              }}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Realizar Teste de Montagem
                            </button>
                          )}
                          {unit.status === 'TEST_PASSED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTestModal(unit.id, 'FINAL');
                              }}
                              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                              Realizar Teste Final
                            </button>
                          )}
                          {(unit.status === 'TEST_FAILED' || unit.status === 'REWORK') && (
                            <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-yellow-800 text-sm">
                                <AlertTriangle className="w-4 h-4 inline mr-1" />
                                Esta unidade precisa de retrabalho. Verifique os componentes e realize um novo teste.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tests History */}
                      {unit.tests && unit.tests.length > 0 && (
                        <div className="p-4 border-t">
                          <h4 className="font-medium text-gray-900 mb-3">Histórico de Testes</h4>
                          <div className="space-y-2">
                            {unit.tests.map((test) => (
                              <div
                                key={test.id}
                                className={`p-3 rounded-lg ${
                                  test.result === 'PASSED' ? 'bg-green-50' :
                                  test.result === 'FAILED' ? 'bg-red-50' :
                                  'bg-gray-50'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {test.testType === 'ASSEMBLY' ? 'Teste de Montagem' : 'Teste Final'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(test.testedAt).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    test.result === 'PASSED' ? 'bg-green-100 text-green-800' :
                                    test.result === 'FAILED' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {test.result === 'PASSED' ? 'Aprovado' :
                                     test.result === 'FAILED' ? 'Reprovado' : 'Condicional'}
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
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Test Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
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
                    placeholder="Observações sobre o teste..."
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
                      placeholder="Descreva os defeitos encontrados..."
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
                  disabled={createTestMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createTestMutation.isPending ? 'Registrando...' : 'Registrar Teste'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
