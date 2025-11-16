import { Eye, Pencil, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ServiceOrderWithRelations } from '@ejr/shared-types';
import { ServiceOrderStatusBadge } from './ServiceOrderStatusBadge';

interface ServiceOrderCardProps {
  serviceOrder: ServiceOrderWithRelations;
  onComplete?: (id: string) => void;
}

export function ServiceOrderCard({
  serviceOrder,
  onComplete,
}: ServiceOrderCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const canComplete =
    serviceOrder.status !== 'COMPLETED' && serviceOrder.status !== 'CANCELLED';

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            OS #{serviceOrder.orderNumber}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {serviceOrder.customer.name}
          </p>
        </div>
        <ServiceOrderStatusBadge status={serviceOrder.status} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Produto:</span>
          <span className="font-medium text-gray-900">
            {serviceOrder.product.name}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Entrada:</span>
          <span className="text-gray-900">{formatDate(serviceOrder.entryDate)}</span>
        </div>
        {serviceOrder.technician && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Técnico:</span>
            <span className="text-gray-900">{serviceOrder.technician.name}</span>
          </div>
        )}
        {serviceOrder.isWarranty && (
          <div className="text-sm">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
              Garantia
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => navigate(`/service-orders/${serviceOrder.id}`)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Ver
        </button>
        <button
          onClick={() => navigate(`/service-orders/${serviceOrder.id}/edit`)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
        {canComplete && onComplete && (
          <button
            onClick={() => onComplete(serviceOrder.id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Concluir
          </button>
        )}
      </div>
    </div>
  );
}
