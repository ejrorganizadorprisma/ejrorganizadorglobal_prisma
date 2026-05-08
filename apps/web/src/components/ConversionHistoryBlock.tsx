import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowRightCircle, Loader2, AlertCircle } from 'lucide-react';
import { useSalesOrderConversions } from '../hooks/useSalesOrders';
import { useUsers } from '../hooks/useUsers';
import { useFormatPrice } from '../hooks/useFormatPrice';

interface ConversionHistoryBlockProps {
  orderId: string;
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
 * Bloco "Histórico de faturamentos" exibido na edição de um pedido
 * com status PARTIALLY_CONVERTED ou CONVERTED. Lista cada conversão
 * (uma fatura/venda gerada a partir do pedido) com o subset de itens
 * convertidos, data/usuário e link clicável para a venda.
 *
 * Estilo alinhado ao SalesOrderAuditBlock: bg-slate-50, border, padded.
 */
export function ConversionHistoryBlock({ orderId }: ConversionHistoryBlockProps) {
  const { data: conversions, isLoading, isError } = useSalesOrderConversions(orderId);
  const { data: usersData } = useUsers({ page: 1, limit: 500 });
  const { formatPrice } = useFormatPrice();

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    usersData?.data?.forEach((u) => {
      if (u?.id) map.set(u.id, u.name || u.email || u.id);
    });
    return map;
  }, [usersData]);

  const resolveUserName = (id?: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    if (!id) return null;
    return userMap.get(id) || `${id.slice(0, 8)}…`;
  };

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 lg:p-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3 text-sm">
          <History className="w-4 h-4 text-slate-500" />
          Histórico de faturamentos
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando histórico...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 lg:p-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3 text-sm">
          <History className="w-4 h-4 text-slate-500" />
          Histórico de faturamentos
        </h2>
        <div className="flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4" />
          Não foi possível carregar o histórico de faturamentos.
        </div>
      </div>
    );
  }

  const list = conversions || [];

  if (list.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 lg:p-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3 text-sm">
          <History className="w-4 h-4 text-slate-500" />
          Histórico de faturamentos
        </h2>
        <p className="text-sm text-slate-500 italic">Nenhum faturamento registrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 lg:p-5">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3 text-sm">
        <History className="w-4 h-4 text-slate-500" />
        Histórico de faturamentos
        <span className="text-xs font-normal text-slate-500">
          ({list.length} fatura{list.length === 1 ? '' : 's'})
        </span>
      </h2>

      <ol className="space-y-2">
        {list.map((conv, idx) => {
          const itemCount = Array.isArray(conv.itemsSnapshot) ? conv.itemsSnapshot.length : 0;
          const userName = resolveUserName(conv.convertedBy, conv.convertedByName);

          return (
            <li
              key={conv.id || `${conv.saleId}-${idx}`}
              className="bg-white border border-slate-200 rounded-md px-3 py-2.5 text-sm flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <ArrowRightCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="font-medium text-slate-800">Fatura {idx + 1}</span>
              <span className="text-slate-400">—</span>
              {conv.saleNumber ? (
                <Link
                  to={`/sales/${conv.saleId}`}
                  className="font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  {conv.saleNumber}
                </Link>
              ) : (
                <Link
                  to={`/sales/${conv.saleId}`}
                  className="font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Ver venda
                </Link>
              )}
              <span className="text-slate-400">—</span>
              <span className="text-slate-600">{formatDateTime(conv.convertedAt)}</span>
              {userName && (
                <>
                  <span className="text-slate-400">por</span>
                  <span className="text-slate-700">{userName}</span>
                </>
              )}
              <span className="text-slate-400">—</span>
              <span className="text-slate-600">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </span>
              {typeof conv.total === 'number' && (
                <>
                  <span className="text-slate-400">—</span>
                  <span className="font-semibold text-slate-800">{formatPrice(conv.total)}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
