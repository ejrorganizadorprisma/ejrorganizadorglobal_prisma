import { Trash2 } from 'lucide-react';
import type { ServiceOrderWithRelations } from '@ejr/shared-types';

interface ServicePartsTableProps {
  serviceOrder: ServiceOrderWithRelations;
  onRemovePart?: (partId: string) => void;
  readOnly?: boolean;
}

export function ServicePartsTable({
  serviceOrder,
  onRemovePart,
  readOnly = false,
}: ServicePartsTableProps) {
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (!serviceOrder.partsUsed || serviceOrder.partsUsed.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma peça adicionada
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nome
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantidade
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Custo Unit.
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            {!readOnly && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {serviceOrder.partsUsed.map((part) => (
            <tr key={part.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {part.product.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {part.product.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {part.quantity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(part.unitCost)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {formatCurrency(part.totalCost)}
              </td>
              {!readOnly && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onRemovePart?.(part.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Remover peça"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td
              colSpan={readOnly ? 4 : 5}
              className="px-6 py-4 text-sm font-medium text-gray-900 text-right"
            >
              Total de Peças:
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
              {formatCurrency(serviceOrder.partsCost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
