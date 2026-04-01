import { useState } from 'react';
import { X, Package, ShoppingCart, Wrench, ArrowDownCircle, ArrowUpCircle, RotateCcw, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInventoryMovements } from '../hooks/useInventoryMovements';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productCode?: string;
}

const MOVEMENT_TYPES: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  PURCHASE: { label: 'Compra', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300', icon: Package },
  IN: { label: 'Entrada', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300', icon: ArrowDownCircle },
  SALE: { label: 'Venda', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', icon: ShoppingCart },
  OUT: { label: 'Saída', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', icon: ArrowUpCircle },
  ADJUSTMENT: { label: 'Ajuste', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', icon: Wrench },
  RETURN: { label: 'Devolução', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', icon: RotateCcw },
};

const FILTER_TABS = [
  { key: '', label: 'Todos' },
  { key: 'PURCHASE', label: 'Compras' },
  { key: 'SALE', label: 'Vendas' },
  { key: 'ADJUSTMENT', label: 'Ajustes' },
];

export default function InventoryMovementHistoryModal({ isOpen, onClose, productId, productName, productCode }: Props) {
  const [activeFilter, setActiveFilter] = useState('');

  const { data: movements, isLoading } = useInventoryMovements(productId, {
    enabled: isOpen,
    type: activeFilter || undefined,
  });

  if (!isOpen) return null;

  const getTypeConfig = (type: string) => MOVEMENT_TYPES[type] || MOVEMENT_TYPES.ADJUSTMENT;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Histórico de Movimentações</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {productCode && <span className="font-mono text-gray-600">{productCode}</span>}
              {productCode && ' — '}
              {productName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-3 border-b border-gray-100 bg-gray-50/50">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !movements || movements.length === 0 ? (
            <div className="text-center py-12">
              <Filter size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            movements.map((mov) => {
              const config = getTypeConfig(mov.type);
              const Icon = config.icon;
              const isPositive = mov.quantity > 0;

              return (
                <div
                  key={mov.id}
                  className={`rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} p-4 transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-md bg-white/80 ${config.color}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <span className={`text-sm font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(mov.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? '+' : ''}{mov.quantity}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {mov.previous_stock} → {mov.new_stock}
                      </p>
                    </div>
                  </div>

                  {mov.reason && (
                    <p className="text-sm text-gray-600 mt-2 pl-9">
                      {mov.reason}
                    </p>
                  )}

                  {mov.user?.name && (
                    <p className="text-xs text-gray-400 mt-1.5 pl-9">
                      por {mov.user.name}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50/50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {movements?.length || 0} movimentação(ões)
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
