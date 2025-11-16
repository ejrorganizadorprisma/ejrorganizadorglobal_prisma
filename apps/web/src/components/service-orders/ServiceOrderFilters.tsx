import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import type { ServiceOrderStatus } from '@ejr/shared-types';
import { useCustomers } from '../../hooks/useCustomers';

export interface ServiceOrderFiltersState {
  status?: ServiceOrderStatus;
  customerId?: string;
  technicianId?: string;
  isWarranty?: boolean;
  startDate?: string;
  endDate?: string;
}

interface ServiceOrderFiltersProps {
  filters: ServiceOrderFiltersState;
  onChange: (filters: ServiceOrderFiltersState) => void;
}

const statusOptions: { value: ServiceOrderStatus; label: string }[] = [
  { value: 'OPEN', label: 'Aberta' },
  { value: 'AWAITING_PARTS', label: 'Aguardando Peças' },
  { value: 'IN_SERVICE', label: 'Em Atendimento' },
  { value: 'AWAITING_APPROVAL', label: 'Aguardando Aprovação' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export function ServiceOrderFilters({
  filters,
  onChange,
}: ServiceOrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: customersData } = useCustomers({ limit: 1000 });

  const handleChange = (key: keyof ServiceOrderFiltersState, value: any) => {
    onChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <Filter className="w-5 h-5" />
            Filtros
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Ativos
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  handleChange('status', e.target.value as ServiceOrderStatus)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={filters.customerId || ''}
                onChange={(e) => handleChange('customerId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {customersData?.data?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isWarranty || false}
                  onChange={(e) => handleChange('isWarranty', e.target.checked ? true : undefined)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Somente garantia
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
