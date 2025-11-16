import { useState } from 'react';
import { X, ShoppingCart, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';

interface PurchaseSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  quantity: number;
}

interface PurchaseSuggestion {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantityToPurchase: number;
  suggestedSupplier: {
    id: string;
    name: string;
    contactName?: string;
  } | null;
  unitPrice: number;
  totalPrice: number;
  currentStock: number;
  requiredQuantity: number;
}

interface PurchaseSuggestionsResponse {
  data: {
    suggestions: PurchaseSuggestion[];
    totalEstimated: number;
  };
}

export function PurchaseSuggestionsModal({
  isOpen,
  onClose,
  productId,
  quantity,
}: PurchaseSuggestionsModalProps) {
  const navigate = useNavigate();
  const [creatingPurchaseOrders, setCreatingPurchaseOrders] = useState<Set<string>>(
    new Set()
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-suggestions', productId, quantity],
    queryFn: async () => {
      const { data } = await api.get<PurchaseSuggestionsResponse>(
        `/bom-analysis/suggest-purchases/${productId}`,
        {
          params: { quantity },
        }
      );
      return data.data;
    },
    enabled: isOpen && !!productId && quantity > 0,
  });

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCreateSinglePO = (suggestion: PurchaseSuggestion) => {
    if (!suggestion.suggestedSupplier) {
      toast.error('Nenhum fornecedor sugerido para este material');
      return;
    }

    setCreatingPurchaseOrders((prev) => new Set(prev).add(suggestion.materialId));

    const items = [
      {
        productId: suggestion.materialId,
        quantity: suggestion.quantityToPurchase,
        unitPrice: suggestion.unitPrice,
      },
    ];

    const queryParams = new URLSearchParams({
      supplierId: suggestion.suggestedSupplier.id,
      items: JSON.stringify(items),
    });

    navigate(`/purchase-orders/new?${queryParams.toString()}`);
  };

  const handleCreateAllPOs = () => {
    if (!data?.suggestions || data.suggestions.length === 0) {
      toast.error('Nenhuma sugestão de compra disponível');
      return;
    }

    // Agrupar sugestões por fornecedor
    const suggestionsBySupplier = data.suggestions.reduce((acc, suggestion) => {
      if (!suggestion.suggestedSupplier) {
        toast.warning(
          `Material ${suggestion.materialName} não possui fornecedor sugerido`
        );
        return acc;
      }

      const supplierId = suggestion.suggestedSupplier.id;
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier: suggestion.suggestedSupplier,
          items: [],
        };
      }

      acc[supplierId].items.push({
        productId: suggestion.materialId,
        quantity: suggestion.quantityToPurchase,
        unitPrice: suggestion.unitPrice,
      });

      return acc;
    }, {} as Record<string, { supplier: { id: string; name: string }; items: any[] }>);

    const supplierIds = Object.keys(suggestionsBySupplier);

    if (supplierIds.length === 0) {
      toast.error('Nenhum fornecedor disponível para as sugestões');
      return;
    }

    if (supplierIds.length === 1) {
      // Se houver apenas um fornecedor, redirecionar direto
      const supplierId = supplierIds[0];
      const items = suggestionsBySupplier[supplierId].items;

      const queryParams = new URLSearchParams({
        supplierId,
        items: JSON.stringify(items),
      });

      navigate(`/purchase-orders/new?${queryParams.toString()}`);
    } else {
      // Se houver múltiplos fornecedores, criar a primeira OC
      toast.info(
        `Serão necessárias ${supplierIds.length} ordens de compra (uma por fornecedor). Criando a primeira...`
      );

      const firstSupplierId = supplierIds[0];
      const items = suggestionsBySupplier[firstSupplierId].items;

      const queryParams = new URLSearchParams({
        supplierId: firstSupplierId,
        items: JSON.stringify(items),
      });

      navigate(`/purchase-orders/new?${queryParams.toString()}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sugestões de Compras
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Materiais faltantes para produção de {quantity} unidade(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Analisando necessidades de compra...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">
                  Erro ao carregar sugestões
                </h3>
              </div>
              <p className="text-red-800">
                Não foi possível carregar as sugestões de compra. Tente novamente.
              </p>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {data.suggestions.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <Package className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Todos os materiais estão disponíveis!
                  </h3>
                  <p className="text-green-800">
                    Não há necessidade de realizar compras para esta produção.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Material
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                              Necessário
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                              Estoque
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                              A Comprar
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                              Fornecedor
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                              Preço Unit.
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                              Total
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.suggestions.map((suggestion) => (
                            <tr
                              key={suggestion.materialId}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {suggestion.materialName}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {suggestion.materialCode}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right text-gray-900">
                                {suggestion.requiredQuantity}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-orange-600 font-medium">
                                  {suggestion.currentStock}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-blue-600 font-semibold">
                                  {suggestion.quantityToPurchase}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {suggestion.suggestedSupplier ? (
                                  <div>
                                    <p className="text-gray-900">
                                      {suggestion.suggestedSupplier.name}
                                    </p>
                                    {suggestion.suggestedSupplier.contactName && (
                                      <p className="text-xs text-gray-500">
                                        {suggestion.suggestedSupplier.contactName}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500 italic">
                                    Sem fornecedor
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-900">
                                {formatCurrency(suggestion.unitPrice)}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                {formatCurrency(suggestion.totalPrice)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleCreateSinglePO(suggestion)}
                                  disabled={
                                    !suggestion.suggestedSupplier ||
                                    creatingPurchaseOrders.has(suggestion.materialId)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Criar Ordem de Compra"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  Criar OC
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-900 font-medium">
                          Total Estimado
                        </p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {formatCurrency(data.totalEstimated)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-blue-800">
                        <p>
                          {data.suggestions.length} material(is) para comprar
                        </p>
                      </div>
                    </div>
                  </div>

                  {data.suggestions.some((s) => !s.suggestedSupplier) && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">
                            Atenção
                          </p>
                          <p className="text-sm text-yellow-800 mt-1">
                            Alguns materiais não possuem fornecedor sugerido. Configure
                            fornecedores para estes produtos para facilitar a criação de
                            ordens de compra.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isLoading}
          >
            Fechar
          </button>

          {!isLoading && !error && data && data.suggestions.length > 0 && (
            <button
              onClick={handleCreateAllPOs}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={data.suggestions.every((s) => !s.suggestedSupplier)}
            >
              <ShoppingCart className="w-4 h-4" />
              Criar Todas as OCs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
