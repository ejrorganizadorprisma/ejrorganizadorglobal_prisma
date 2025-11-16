import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Factory, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductionOrder,
  useCreateProductionOrder,
  useUpdateProductionOrder,
  type ProductionOrderPriority,
} from '../hooks/useProductionOrders';
import { useProducts } from '../hooks/useProducts';
import { useProductBOM, useCanAssemble } from '../hooks/useProductParts';
import { MaterialAvailabilityModal, PurchaseSuggestionsModal } from '../components/production';

export function ProductionOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: productionOrder, isLoading: isLoadingOrder } = useProductionOrder(id);
  const { data: productsData } = useProducts({ limit: 1000 });
  const createOrderMutation = useCreateProductionOrder();
  const updateOrderMutation = useUpdateProductionOrder();

  const [formData, setFormData] = useState({
    productId: '',
    quantityPlanned: 1,
    priority: 'NORMAL' as ProductionOrderPriority,
    plannedStartDate: '',
    plannedEndDate: '',
    dueDate: '',
    assignedTo: '',
    notes: '',
    internalNotes: '',
  });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showBOM, setShowBOM] = useState(false);
  const [showMaterialAvailability, setShowMaterialAvailability] = useState(false);
  const [showPurchaseSuggestions, setShowPurchaseSuggestions] = useState(false);

  const { data: bomData } = useProductBOM(selectedProductId || undefined);
  const { data: availabilityData } = useCanAssemble(
    selectedProductId || undefined,
    formData.quantityPlanned
  );

  // Filter products to show only ASSEMBLED or FINAL_GOOD types
  const assemblyProducts = productsData?.data?.filter(
    (p) => p.type === 'ASSEMBLED' || p.type === 'FINAL_GOOD'
  ) || [];

  useEffect(() => {
    if (productionOrder && isEditing) {
      setFormData({
        productId: productionOrder.productId,
        quantityPlanned: productionOrder.quantityPlanned,
        priority: productionOrder.priority,
        plannedStartDate: productionOrder.plannedStartDate
          ? productionOrder.plannedStartDate.split('T')[0]
          : '',
        plannedEndDate: productionOrder.plannedEndDate
          ? productionOrder.plannedEndDate.split('T')[0]
          : '',
        dueDate: productionOrder.dueDate
          ? productionOrder.dueDate.split('T')[0]
          : '',
        assignedTo: productionOrder.assignedTo || '',
        notes: productionOrder.notes || '',
        internalNotes: productionOrder.internalNotes || '',
      });
      setSelectedProductId(productionOrder.productId);
      setShowBOM(true);
    }
  }, [productionOrder, isEditing]);

  useEffect(() => {
    if (formData.productId) {
      setSelectedProductId(formData.productId);
      setShowBOM(true);
    }
  }, [formData.productId]);

  const handleSubmit = async (e: React.FormEvent, saveDraft: boolean = false) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error('Selecione um produto');
      return;
    }

    if (formData.quantityPlanned <= 0) {
      toast.error('Quantidade planejada deve ser maior que zero');
      return;
    }

    try {
      const submitData = {
        ...formData,
        plannedStartDate: formData.plannedStartDate || undefined,
        plannedEndDate: formData.plannedEndDate || undefined,
        dueDate: formData.dueDate || undefined,
        assignedTo: formData.assignedTo || undefined,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
      };

      if (isEditing && id) {
        await updateOrderMutation.mutateAsync({ id, data: submitData });
        toast.success('Ordem de produção atualizada com sucesso');
      } else {
        const newOrder = await createOrderMutation.mutateAsync(submitData);
        toast.success('Ordem de produção criada com sucesso');

        // If not saving as draft, navigate to the detail page
        if (!saveDraft && newOrder) {
          navigate(`/production-orders/${newOrder.id}`);
          return;
        }
      }

      navigate('/production-orders');
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || 'Erro ao salvar ordem de produção'
      );
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (isLoadingOrder && isEditing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  const totalBOMCost = bomData?.reduce((sum, item) => sum + item.totalCost, 0) || 0;
  const estimatedMaterialCost = totalBOMCost * formData.quantityPlanned;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/production-orders')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Ordens de Produção
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção'}
          </h1>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Product Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Produto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) =>
                    setFormData({ ...formData, productId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isEditing}
                >
                  <option value="">Selecione um produto para montar</option>
                  {assemblyProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name} (Tipo: {product.type})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Apenas produtos do tipo ASSEMBLED ou FINAL_GOOD podem ser produzidos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade Planejada <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantityPlanned}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityPlanned: parseInt(e.target.value) || 0,
                    })
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as ProductionOrderPriority,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Baixa</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início Planejado
                </label>
                <input
                  type="date"
                  value={formData.plannedStartDate}
                  onChange={(e) =>
                    setFormData({ ...formData, plannedStartDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim Planejado
                </label>
                <input
                  type="date"
                  value={formData.plannedEndDate}
                  onChange={(e) =>
                    setFormData({ ...formData, plannedEndDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Entrega
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* BOM Display */}
          {showBOM && bomData && bomData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Materiais Necessários (BOM)
                </h2>
                <div className="flex items-center gap-3">
                  {availabilityData && (
                    <div className="flex items-center gap-2">
                      {availabilityData.canAssemble ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            Materiais disponíveis
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            Materiais insuficientes
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMaterialAvailability(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    <Package className="w-4 h-4" />
                    Verificar Materiais
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Peça
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Qtd. Unit.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Qtd. Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estoque
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Custo Unit.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Custo Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bomData.map((item) => {
                      const totalQty = item.quantity * formData.quantityPlanned;
                      const availability = availabilityData?.parts?.find(
                        (p) => p.partId === item.partId
                      );
                      const hasStock = availability
                        ? availability.available >= availability.required
                        : false;

                      return (
                        <tr key={item.partId}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.partName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.partCode}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {totalQty}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {availability?.available || 0}
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
                                Falta
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(item.totalCost * formData.quantityPlanned)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-3 text-sm font-semibold text-gray-900 text-right"
                      >
                        Custo Total Estimado de Materiais:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {formatCurrency(estimatedMaterialCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações Adicionais
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsável
                </label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do responsável pela produção"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações gerais sobre a ordem de produção"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Internas
                </label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, internalNotes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas internas (não visíveis em relatórios externos)"
                />
              </div>
            </div>
          </div>

          {/* Material Availability Warning */}
          {availabilityData && !availabilityData.canAssemble && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Materiais Insuficientes
                  </h3>
                  <p className="text-sm text-red-700 mb-2">
                    Não há estoque suficiente para produzir {formData.quantityPlanned}{' '}
                    unidade(s). Verifique os materiais em falta acima.
                  </p>
                  <p className="text-sm text-red-700 mb-3">
                    Você ainda pode salvar esta ordem como rascunho e aguardar a
                    reposição de estoque.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPurchaseSuggestions(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-800 bg-white border border-red-300 rounded-md hover:bg-red-50"
                  >
                    <Package className="w-4 h-4" />
                    Sugerir Compras
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/production-orders')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              disabled={
                createOrderMutation.isPending || updateOrderMutation.isPending
              }
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Atualizar' : 'Criar'} Ordem
            </button>
          </div>
        </form>

        {/* Material Availability Modal */}
        {formData.productId && (
          <MaterialAvailabilityModal
            isOpen={showMaterialAvailability}
            onClose={() => setShowMaterialAvailability(false)}
            productId={formData.productId}
            productName={
              assemblyProducts.find((p) => p.id === formData.productId)?.name || ''
            }
            quantity={formData.quantityPlanned}
            onSuggestPurchases={() => {
              setShowMaterialAvailability(false);
              setShowPurchaseSuggestions(true);
            }}
          />
        )}

        {/* Purchase Suggestions Modal */}
        {formData.productId && (
          <PurchaseSuggestionsModal
            isOpen={showPurchaseSuggestions}
            onClose={() => setShowPurchaseSuggestions(false)}
            productId={formData.productId}
            quantity={formData.quantityPlanned}
          />
        )}
      </div>
    </div>
  );
}
