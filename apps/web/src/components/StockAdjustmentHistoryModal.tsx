import { X, Clock, User, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StockAdjustmentHistory {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  oldStock: number;
  newStock: number;
  quantityChanged: number;
  operation: 'add' | 'subtract';
  reason: string;
  createdAt: string;
}

interface StockAdjustmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export function StockAdjustmentHistoryModal({
  isOpen,
  onClose,
  productId,
  productName,
}: StockAdjustmentHistoryModalProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['stock-history', productId],
    queryFn: async () => {
      const response = await api.get<{ data: StockAdjustmentHistory[] }>(
        `/products/${productId}/stock-history`
      );
      return response.data.data;
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Histórico de Ajustes de Estoque</h2>
            <p className="text-blue-100 text-sm mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando histórico...
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhum ajuste de estoque registrado para este produto.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Data e Hora */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(item.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>

                      {/* Usuário */}
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{item.userName}</span>
                        <span className="text-gray-500">({item.userEmail})</span>
                      </div>

                      {/* Motivo */}
                      <div className="bg-gray-100 rounded-md p-3 mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Motivo:</p>
                        <p className="text-sm text-gray-900">{item.reason}</p>
                      </div>
                    </div>

                    {/* Mudança de Estoque */}
                    <div className="ml-4 text-right">
                      <div className="flex items-center justify-end gap-2 mb-2">
                        {item.operation === 'add' ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                        <span
                          className={`text-lg font-bold ${
                            item.operation === 'add' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {item.operation === 'add' ? '+' : '-'}
                          {item.quantityChanged}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">De</span>{' '}
                        <span className="font-semibold">{item.oldStock}</span>{' '}
                        <span className="text-gray-500">para</span>{' '}
                        <span className="font-semibold">{item.newStock}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
