import type { ServiceOrderStatus } from '@ejr/shared-types';

interface ServiceOrderStatusBadgeProps {
  status: ServiceOrderStatus;
  className?: string;
}

const statusConfig: Record<
  ServiceOrderStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: 'Aberta',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  AWAITING_PARTS: {
    label: 'Aguardando Peças',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  IN_SERVICE: {
    label: 'Em Atendimento',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  AWAITING_APPROVAL: {
    label: 'Aguardando Aprovação',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  COMPLETED: {
    label: 'Concluída',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export function ServiceOrderStatusBadge({
  status,
  className = '',
}: ServiceOrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
