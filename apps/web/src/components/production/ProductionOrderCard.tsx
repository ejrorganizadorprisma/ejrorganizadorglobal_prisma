import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Factory,
} from 'lucide-react';
import type { ProductionOrder } from '../../hooks/useProductionOrders';
import { ProductionOrderStatusBadge } from './ProductionOrderStatusBadge';

interface ProductionOrderCardProps {
  order: ProductionOrder;
  onRelease?: (id: string) => void;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function ProductionOrderCard({
  order,
  onRelease,
  onStart,
  onPause,
  onResume,
  onComplete,
  onCancel,
}: ProductionOrderCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getProgressPercentage = (produced: number, planned: number) => {
    if (planned === 0) return 0;
    return Math.min(Math.round((produced / planned) * 100), 100);
  };

  const getPriorityColor = () => {
    switch (order.priority) {
      case 'URGENT':
        return 'text-red-600 bg-red-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'NORMAL':
        return 'text-blue-600 bg-blue-50';
      case 'LOW':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const progress = getProgressPercentage(order.quantityProduced, order.quantityPlanned);
  const isOverdue =
    order.dueDate &&
    new Date(order.dueDate) < new Date() &&
    order.status !== 'COMPLETED';

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
              <p className="text-sm text-gray-600">{order.product?.name || '-'}</p>
            </div>
          </div>
          <ProductionOrderStatusBadge status={order.status} />
        </div>

        {/* Priority */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityColor()}`}
          >
            {order.priority === 'URGENT'
              ? 'Urgente'
              : order.priority === 'HIGH'
              ? 'Alta'
              : order.priority === 'NORMAL'
              ? 'Normal'
              : 'Baixa'}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progresso</span>
            <span className="text-sm font-semibold text-gray-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
          <div>
            <p className="text-gray-600">Planejado</p>
            <p className="font-semibold text-gray-900">{order.quantityPlanned}</p>
          </div>
          <div>
            <p className="text-gray-600">Produzido</p>
            <p className="font-semibold text-green-600">{order.quantityProduced}</p>
          </div>
          <div>
            <p className="text-gray-600">Pendente</p>
            <p className="font-semibold text-gray-900">{order.quantityPending}</p>
          </div>
        </div>

        {/* Due Date */}
        {order.dueDate && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500" />}
            <Clock className="w-4 h-4 text-gray-400" />
            <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
              Entrega: {formatDate(order.dueDate)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate(`/production-orders/${order.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <Eye className="w-4 h-4" />
            Ver
          </button>

          {order.status === 'PLANNED' && onRelease && (
            <button
              onClick={() => onRelease(order.id)}
              className="px-3 py-2 text-sm font-medium text-cyan-700 bg-cyan-50 rounded-md hover:bg-cyan-100"
              title="Liberar"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}

          {order.status === 'RELEASED' && onStart && (
            <button
              onClick={() => onStart(order.id)}
              className="px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
              title="Iniciar"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {order.status === 'IN_PROGRESS' && (
            <>
              {onPause && (
                <button
                  onClick={() => onPause(order.id)}
                  className="px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100"
                  title="Pausar"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              {onComplete && (
                <button
                  onClick={() => onComplete(order.id)}
                  className="px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                  title="Concluir"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {order.status === 'PAUSED' && onResume && (
            <button
              onClick={() => onResume(order.id)}
              className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100"
              title="Retomar"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {(order.status === 'DRAFT' ||
            order.status === 'PLANNED' ||
            order.status === 'RELEASED') &&
            onCancel && (
              <button
                onClick={() => onCancel(order.id)}
                className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                title="Cancelar"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
