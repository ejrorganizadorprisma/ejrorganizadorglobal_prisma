import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface MaterialAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  quantity: number;
  onSuggestPurchases?: () => void;
}

interface MaterialItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantityRequired: number;
  quantityAvailable: number;
  quantityMissing: number;
  isAvailable: boolean;
}

interface AvailabilityResponse {
  canProduce: boolean;
  materials: MaterialItem[];
  totalItems: number;
  availableItems: number;
  missingItems: number;
}

export function MaterialAvailabilityModal({
  isOpen,
  onClose,
  productId,
  productName,
  quantity,
  onSuggestPurchases,
}: MaterialAvailabilityModalProps) {
  const { data: availability, isLoading } = useQuery({
    queryKey: ['bom-analysis', 'availability', productId, quantity],
    queryFn: async () => {
      const { data } = await api.get<{ data: AvailabilityResponse }>(
        `/bom-analysis/check-availability/${productId}`,
        { params: { quantity } }
      );
      return data.data;
    },
    enabled: isOpen && !!productId,
  });

  if (!isOpen) return null;

  const hasMissingMaterials = availability && !availability.canProduce;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Verificação de Materiais
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">{productName}</span>
              {' '}&middot;{' '}
              <span>{quantity} unidade{quantity !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-gray-600">Verificando disponibilidade de materiais...</p>
            </div>
          )}

          {!isLoading && availability && (
            <>
              {/* Overall Status */}
              {availability.canProduce ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">
                        Pode Produzir
                      </h3>
                      <p className="text-green-800 mt-1">
                        Todos os materiais necessários estão disponíveis em estoque para
                        produzir {quantity} unidade{quantity !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-900">
                        Materiais Insuficientes
                      </h3>
                      <p className="text-yellow-800 mt-1">
                        Alguns materiais não estão disponíveis em quantidade suficiente.
                        {' '}
                        <span className="font-medium">
                          {availability.missingItems} de {availability.totalItems} materiais
                        </span>
                        {' '}precisam ser reabastecidos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Materials Table */}
              {availability.materials.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Material
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Necessário
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Disponível
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Faltante
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availability.materials.map((material) => (
                          <tr
                            key={material.materialId}
                            className={
                              material.isAvailable
                                ? 'hover:bg-gray-50'
                                : 'bg-yellow-50 hover:bg-yellow-100'
                            }
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {material.materialCode}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {material.materialName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {material.quantityRequired.toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <span
                                className={
                                  material.isAvailable
                                    ? 'text-green-700 font-medium'
                                    : 'text-red-700 font-medium'
                                }
                              >
                                {material.quantityAvailable.toLocaleString('pt-BR')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              {material.quantityMissing > 0 ? (
                                <span className="text-red-700 font-medium">
                                  {material.quantityMissing.toLocaleString('pt-BR')}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {material.isAvailable ? (
                                <div className="flex items-center justify-center gap-1 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">Disponível</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 text-yellow-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">Insuficiente</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary */}
              {availability.materials.length > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    Total de {availability.totalItems} material
                    {availability.totalItems !== 1 ? 'is' : ''}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">{availability.availableItems}</span>
                      <span>disponível{availability.availableItems !== 1 ? 'is' : ''}</span>
                    </div>
                    {availability.missingItems > 0 && (
                      <div className="flex items-center gap-1.5 text-yellow-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">{availability.missingItems}</span>
                        <span>faltante{availability.missingItems !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {hasMissingMaterials && onSuggestPurchases && (
            <button
              onClick={onSuggestPurchases}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Sugerir Compras
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
