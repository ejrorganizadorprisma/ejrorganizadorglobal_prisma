import type { ProductionOrderStatus } from '../../hooks/useProductionOrders';

interface ProductionOrderStatusBadgeProps {
  status: ProductionOrderStatus;
  className?: string;
}

const statusConfig: Record<
  ProductionOrderStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Rascunho',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  PLANNED: {
    label: 'Planejada',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  RELEASED: {
    label: 'Liberada',
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  IN_PROGRESS: {
    label: 'Em Produção',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  PAUSED: {
    label: 'Pausada',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  COMPLETED: {
    label: 'Concluída',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  CLOSED: {
    label: 'Fechada',
    className: 'bg-slate-100 text-slate-800 border-slate-200',
  },
};

export function ProductionOrderStatusBadge({
  status,
  className = '',
}: ProductionOrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
