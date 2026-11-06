/**
 * Tabela de preço do cliente (customers.price_tier).
 *
 *  RETAIL    → Varejo: products.sale_price
 *  WHOLESALE → Atacado: products.wholesale_price (sem atacado → varejo, com aviso)
 *  SPECIAL   → Especial: varejo ± priceAdjustmentPct %, arredondado
 *              (PYG para Gs. 100; moedas com centavos para o centavo)
 *
 * A mesma regra é aplicada no servidor do PDV (apps/api/src/services/pos.service.ts).
 */
export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'SPECIAL';

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  RETAIL: 'Varejo',
  WHOLESALE: 'Atacado',
  SPECIAL: 'Especial',
};

export interface PriceTierCustomer {
  priceTier?: PriceTier | string | null;
  priceAdjustmentPct?: number | string | null;
}

export interface PricedProduct {
  salePrice?: number | null;
  wholesalePrice?: number | null;
  salePriceCurrency?: string | null;
}

export interface ResolvedPrice {
  price: number;
  tier: PriceTier;
  /** Atacado pedido, mas o produto não tem preço de atacado → usou varejo. */
  fallbackToRetail: boolean;
}

export function roundTierPrice(value: number, currency?: string | null): number {
  if ((currency || 'PYG') === 'PYG') return Math.round(value / 100) * 100;
  return Math.round(value);
}

export function resolveCustomerPrice(product: PricedProduct, customer?: PriceTierCustomer | null): ResolvedPrice {
  const retail = Number(product.salePrice || 0);
  const tier = ((customer?.priceTier as PriceTier) || 'RETAIL') as PriceTier;

  if (tier === 'WHOLESALE') {
    const w = Number(product.wholesalePrice || 0);
    return w > 0 ? { price: w, tier, fallbackToRetail: false } : { price: retail, tier, fallbackToRetail: true };
  }
  if (tier === 'SPECIAL') {
    const pct = Number(customer?.priceAdjustmentPct || 0);
    if (!pct || !retail) return { price: retail, tier, fallbackToRetail: false };
    const price = Math.max(0, roundTierPrice(retail * (1 + pct / 100), product.salePriceCurrency));
    return { price, tier, fallbackToRetail: false };
  }
  return { price: retail, tier: 'RETAIL', fallbackToRetail: false };
}

/** Rótulo curto: "Varejo", "Atacado", "Especial −10%", "Especial +5%". */
export function priceTierLabel(customer?: PriceTierCustomer | null): string {
  const tier = ((customer?.priceTier as PriceTier) || 'RETAIL') as PriceTier;
  if (tier !== 'SPECIAL') return PRICE_TIER_LABELS[tier] || 'Varejo';
  const pct = Number(customer?.priceAdjustmentPct || 0);
  if (!pct) return 'Especial';
  return `Especial ${pct > 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('pt-BR')}%`;
}
