import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Tag } from 'lucide-react';
import { resolveCustomerPrice, priceTierLabel, type PriceTierCustomer, type PricedProduct } from '@ejr/shared-types';

/**
 * Preço pela tabela do cliente (Varejo / Atacado / Especial ±%) nas telas de
 * orçamento, pedido e venda.
 *
 * - priceOf(product): preço do produto para o cliente atual (e guarda os preços
 *   base do produto para recalcular depois).
 * - Ao TROCAR o cliente, recalcula o preço dos itens adicionados nesta tela
 *   (itens já salvos/carregados não são tocados).
 */
export function useCustomerPricing<T extends { productId?: string; unitPrice: number }>(
  customer: (PriceTierCustomer & { id?: string }) | null | undefined,
  applyToItems?: (fn: (items: T[]) => T[]) => void
) {
  const baseRef = useRef(new Map<string, PricedProduct>());
  const prevKey = useRef<string | null>(null);

  const priceOf = useCallback(
    (product: PricedProduct & { id?: string; name?: string }) => {
      if (product.id) baseRef.current.set(product.id, { salePrice: product.salePrice, wholesalePrice: product.wholesalePrice, salePriceCurrency: product.salePriceCurrency });
      const r = resolveCustomerPrice(product, customer);
      if (r.fallbackToRetail) toast.info(`${product.name || 'Produto'} sem preço de atacado — usando varejo`);
      return r.price;
    },
    [customer]
  );

  const key = customer?.id ? `${customer.id}|${customer.priceTier || 'RETAIL'}|${customer.priceAdjustmentPct ?? ''}` : null;
  useEffect(() => {
    const before = prevKey.current;
    prevKey.current = key;
    if (!applyToItems || !key || before === key || baseRef.current.size === 0) return;
    applyToItems((items) =>
      items.map((it) => {
        const base = it.productId ? baseRef.current.get(it.productId) : undefined;
        if (!base) return it;
        const price = resolveCustomerPrice(base, customer).price;
        return price !== it.unitPrice ? { ...it, unitPrice: price } : it;
      })
    );
    toast.success(`Preços dos itens recalculados — tabela ${priceTierLabel(customer)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { priceOf, label: priceTierLabel(customer) };
}

/** Selo com a tabela de preço do cliente. */
export function PriceTierBadge({ customer, className = '' }: { customer?: PriceTierCustomer | null; className?: string }) {
  if (!customer) return null;
  const tier = customer.priceTier || 'RETAIL';
  const color =
    tier === 'WHOLESALE' ? 'bg-violet-100 text-violet-700' : tier === 'SPECIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color} ${className}`} title="Tabela de preço do cliente">
      <Tag className="w-3 h-3" /> {priceTierLabel(customer)}
    </span>
  );
}
