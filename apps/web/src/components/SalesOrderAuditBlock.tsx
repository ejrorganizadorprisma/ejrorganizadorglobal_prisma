import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, ArrowRightCircle, XCircle, History } from 'lucide-react';
import type { SalesOrder } from '@ejr/shared-types';
import { useUsers } from '../hooks/useUsers';

interface SalesOrderAuditBlockProps {
  order: SalesOrder;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
}

/**
 * Bloco de auditoria/histórico de um pedido de venda.
 * Exibe quem criou, quando criou, vendedor, e — quando aplicável — quem
 * faturou ou cancelou o pedido.
 *
 * Como o backend devolve `createdBy`, `convertedBy` e `cancelledBy` como IDs
 * crus (sem JOIN com `users`), este componente busca a lista de usuários via
 * `useUsers` (limit=500) para resolver os nomes em runtime. Caso o usuário
 * logado não tenha permissão para listar usuários, o componente cai pra
 * exibição do ID em fonte mono pequena (com tooltip indicando que é interno).
 */
export function SalesOrderAuditBlock({ order }: SalesOrderAuditBlockProps) {
  // Coletamos os IDs realmente referenciados — se nenhum estiver presente,
  // nem sequer disparamos a query de usuários.
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    if (order.createdBy) ids.add(order.createdBy);
    if (order.convertedBy) ids.add(order.convertedBy);
    if (order.cancelledBy) ids.add(order.cancelledBy);
    return Array.from(ids);
  }, [order.createdBy, order.convertedBy, order.cancelledBy]);

  // Lookup global: traz até 500 usuários ativos+inativos (cobertura ampla).
  // useUsers já é cacheado pelo React Query, então outras telas reaproveitam.
  const { data: usersData, isError: usersError } = useUsers({ page: 1, limit: 500 });

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    usersData?.data?.forEach((u) => {
      if (u?.id) map.set(u.id, u.name || u.email || u.id);
    });
    return map;
  }, [usersData]);

  const resolveUser = (id?: string) => {
    if (!id) return null;
    const name = userMap.get(id);
    if (name) {
      return <span className="font-medium text-slate-800">{name}</span>;
    }
    // Fallback: ID interno em mono pequeno
    return (
      <span
        className="font-mono text-xs text-slate-500"
        title={usersError ? 'Sem permissão para resolver nome' : 'ID interno do usuário'}
      >
        {id.slice(0, 8)}…
      </span>
    );
  };

  const showConverted = order.status === 'CONVERTED';
  const showCancelled = order.status === 'CANCELLED';

  // Não exibimos nada se não houver dado relevante (pedido recém-criado sem auditoria)
  const hasAnyData =
    order.createdAt ||
    order.createdBy ||
    order.seller?.name ||
    showConverted ||
    showCancelled;

  if (!hasAnyData && userIds.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 lg:p-5">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3 text-sm">
        <History className="w-4 h-4 text-slate-500" />
        Histórico do Pedido
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {/* Criado por */}
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-500">Criado por: </span>
            {order.createdBy ? resolveUser(order.createdBy) : (
              <span className="text-slate-400 italic">não registrado</span>
            )}
          </div>
        </div>

        {/* Criado em */}
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-500">Criado em: </span>
            <span className="font-medium text-slate-800">{formatDateTime(order.createdAt)}</span>
          </div>
        </div>

        {/* Vendedor */}
        <div className="flex items-start gap-2 md:col-span-2">
          <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-500">Vendedor responsável: </span>
            <span className="font-medium text-slate-800">
              {order.seller?.name || (
                <span className="text-slate-400 italic">não atribuído</span>
              )}
            </span>
          </div>
        </div>

        {/* Faturamento */}
        {showConverted && (
          <div className="flex items-start gap-2 md:col-span-2 pt-2 border-t border-slate-200">
            <ArrowRightCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 text-emerald-700">
              Faturado em{' '}
              <span className="font-medium">{formatDateTime(order.convertedAt)}</span>
              {order.convertedBy && (
                <>
                  {' '}por {resolveUser(order.convertedBy)}
                </>
              )}
              {order.sale?.saleNumber && (
                <>
                  {' '}→{' '}
                  <Link
                    to={`/sales/${order.sale.id}`}
                    className="font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Venda #{order.sale.saleNumber}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Cancelamento */}
        {showCancelled && (
          <div className="flex items-start gap-2 md:col-span-2 pt-2 border-t border-slate-200">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 text-red-700">
              Cancelado em{' '}
              <span className="font-medium">{formatDateTime(order.cancelledAt)}</span>
              {order.cancelledBy && (
                <>
                  {' '}por {resolveUser(order.cancelledBy)}
                </>
              )}
              {order.cancelReason && (
                <div className="mt-1 text-red-600">
                  <span className="text-red-500">Motivo:</span>{' '}
                  <span className="italic">{order.cancelReason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
