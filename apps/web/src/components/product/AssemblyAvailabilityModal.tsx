import { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCanAssemble } from '../../hooks/useProductParts';

interface AssemblyAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
}

export function AssemblyAvailabilityModal({
  isOpen,
  onClose,
  productId,
}: AssemblyAvailabilityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { data: availability, isLoading } = useCanAssemble(
    isOpen ? productId : undefined,
    isOpen ? quantity : undefined
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Verificar Disponibilidade de Montagem
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade a montar
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="text-gray-600">Verificando disponibilidade...</div>
            </div>
          )}

          {!isLoading && availability && (
            <div>
              {availability.canAssemble ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">
                      Pode montar!
                    </h3>
                  </div>
                  <p className="text-green-800">
                    Todas as peças necessárias estão disponíveis em estoque para
                    montar {quantity} unidade(s).
                  </p>
                </div>
              ) : (
                <div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <h3 className="text-lg font-semibold text-red-900">
                        Não pode montar
                      </h3>
                    </div>
                    <p className="text-red-800">
                      Algumas peças não estão disponíveis em quantidade suficiente.
                    </p>
                  </div>

                  {availability.missingParts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Peças faltantes:
                      </h4>
                      <div className="space-y-2">
                        {availability.missingParts.map((part) => (
                          <div
                            key={part.partId}
                            className="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-gray-900">
                                {part.partName}
                              </h5>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Necessário:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {part.required}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Disponível:</span>
                                <span className="ml-2 font-medium text-orange-600">
                                  {part.available}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Faltam:</span>
                                <span className="ml-2 font-medium text-red-600">
                                  {part.missing}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
