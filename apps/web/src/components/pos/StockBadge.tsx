import { Package, AlertTriangle } from 'lucide-react';

/**
 * Estoque do produto no PDV — sempre visível.
 * Vermelho quando está no estoque mínimo ou abaixo (ou zerado);
 * também vermelho quando a quantidade da venda passa do estoque.
 */
export function stockState(stock?: number | null, minimum?: number | null, inCart = 0) {
  if (stock == null) return 'unknown' as const;
  if (stock <= 0 || (inCart > 0 && inCart > stock)) return 'out' as const;
  if (minimum != null && minimum > 0 && stock <= minimum) return 'low' as const;
  return 'ok' as const;
}

export function StockBadge({
  stock, minimum, inCart = 0, size = 'sm', className = '',
}: {
  stock?: number | null;
  minimum?: number | null;
  inCart?: number;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const st = stockState(stock, minimum, inCart);
  const red = st === 'out' || st === 'low';
  const label =
    st === 'unknown' ? 'estoque —'
      : st === 'out' && (stock ?? 0) <= 0 ? `sem estoque (${stock})`
      : `estoque ${stock}`;
  const title =
    st === 'low' ? `Estoque no mínimo ou abaixo (mínimo ${minimum})`
      : st === 'out' && inCart > (stock ?? 0) && (stock ?? 0) > 0 ? `Quantidade da venda (${inCart}) maior que o estoque (${stock})`
      : st === 'out' ? 'Sem estoque'
      : minimum ? `Estoque mínimo: ${minimum}` : undefined;
  const Icon = red ? AlertTriangle : Package;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full font-semibold tabular-nums whitespace-nowrap ${
        size === 'xs' ? 'px-1.5 py-px text-[10.5px]' : 'px-2 py-0.5 text-[11px]'
      } ${red ? 'bg-red-100 text-red-700' : st === 'unknown' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'} ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {label}
      {st === 'low' && minimum ? <span className="font-normal opacity-80">· mín {minimum}</span> : null}
    </span>
  );
}
