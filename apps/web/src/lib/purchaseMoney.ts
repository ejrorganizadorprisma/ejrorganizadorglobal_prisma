import { CURRENCY_CONFIG, type Currency } from '@ejr/shared-types';
import { formatPriceValue } from '../hooks/useFormatPrice';

/**
 * Moeda do fluxo de COMPRAS (orçamento → pedido → recebimento).
 *
 * REGRA CANÔNICA DE ARMAZENAMENTO:
 * todo valor monetário de compras (cotação, item do pedido, totais, NF, parcelas)
 * é gravado no banco em **centavos de BRL** — inclusive quando o orçamento é
 * digitado em Guaraní ou Dólar. A moeda do orçamento (`currency`) + as taxas
 * (`exchangeRate1/2/3`) servem apenas para ENTRADA e EXIBIÇÃO.
 *
 * Ver `PurchaseBudgetFormPage.inputToBrlCents` (grava) e
 * `purchaseBudgetPdf.brlCentsToDisplay` (exibe) — este helper centraliza a mesma
 * conversão para as demais telas (detalhe do orçamento, conferência, recebimento).
 *
 * Taxas (semântica interna, igual ao formulário do orçamento):
 *   exchangeRate1 = 1 BRL → X PYG
 *   exchangeRate2 = 1 USD → X PYG
 *   exchangeRate3 = 1 USD → X BRL
 */
export interface BudgetMoneySource {
  currency?: string | null;
  exchangeRate1?: number | string | null;
  exchangeRate2?: number | string | null;
  exchangeRate3?: number | string | null;
}

const OTHERS: Record<Currency, [Currency, Currency]> = {
  BRL: ['USD', 'PYG'],
  USD: ['BRL', 'PYG'],
  PYG: ['BRL', 'USD'],
};

export interface PurchaseMoney {
  /** Moeda de exibição/entrada (a do orçamento; BRL quando não há taxas) */
  currency: Currency;
  symbol: string;
  decimals: number;
  /** true quando o orçamento tem as 3 taxas preenchidas */
  hasRates: boolean;
  /** centavos BRL → valor numérico na moeda de exibição */
  toDisplay(centsBRL: number): number;
  /** centavos BRL → texto formatado ("Gs. 707.000" / "R$ 586,81") */
  fmt(centsBRL: number): string;
  /** centavos BRL → as duas outras moedas ("R$ 586,81 · US$ 104,42") ou null */
  fmtSecondary(centsBRL: number): string | null;
  /** centavos BRL → string para preencher um input na moeda de exibição */
  toInput(centsBRL: number): string;
  /** texto digitado na moeda de exibição → centavos BRL (precisão de 4 casas) */
  fromInput(value: string): number;
}

export function buildPurchaseMoney(source?: BudgetMoneySource | null): PurchaseMoney {
  const num = (v: unknown) => (typeof v === 'string' ? parseFloat(v) : (v as number)) || 0;
  const r1 = num(source?.exchangeRate1); // 1 BRL = X PYG
  const r2 = num(source?.exchangeRate2); // 1 USD = X PYG
  const r3 = num(source?.exchangeRate3); // 1 USD = X BRL
  const hasRates = r1 > 0 && r2 > 0 && r3 > 0;

  const requested = (source?.currency || 'BRL') as Currency;
  // Sem taxas cadastradas não há como converter — cai para BRL (moeda de armazenamento)
  const currency: Currency = hasRates && CURRENCY_CONFIG[requested] ? requested : 'BRL';
  const decimals = CURRENCY_CONFIG[currency].decimals;

  const rates: Record<string, number> | null = hasRates
    ? {
        BRL_PYG: r1,
        PYG_BRL: 1 / r1,
        USD_PYG: r2,
        PYG_USD: 1 / r2,
        USD_BRL: r3,
        BRL_USD: 1 / r3,
        BRL_BRL: 1,
        PYG_PYG: 1,
        USD_USD: 1,
      }
    : null;

  const convert = (amount: number, from: Currency, to: Currency) => {
    if (from === to || !rates) return amount;
    return amount * (rates[`${from}_${to}`] ?? 1);
  };

  const roundFor = (amount: number, cur: Currency) =>
    CURRENCY_CONFIG[cur].decimals === 0 ? Math.round(amount) : Math.round(amount * 100) / 100;

  /** valor numérico na moeda `cur` → formato de armazenamento do formatPriceValue */
  const toStored = (amount: number, cur: Currency) =>
    CURRENCY_CONFIG[cur].decimals === 0 ? Math.round(amount) : Math.round(amount * 100);

  const toDisplay = (centsBRL: number) => roundFor(convert((centsBRL || 0) / 100, 'BRL', currency), currency);

  return {
    currency,
    symbol: CURRENCY_CONFIG[currency].symbol,
    decimals,
    hasRates,
    toDisplay,
    fmt: (centsBRL: number) => formatPriceValue(toStored(toDisplay(centsBRL), currency), currency),
    fmtSecondary: (centsBRL: number) => {
      if (!hasRates) return null;
      const brl = (centsBRL || 0) / 100;
      const [a, b] = OTHERS[currency];
      const fmtIn = (cur: Currency) => formatPriceValue(toStored(convert(brl, 'BRL', cur), cur), cur);
      return `${fmtIn(a)} · ${fmtIn(b)}`;
    },
    toInput: (centsBRL: number) => {
      const v = toDisplay(centsBRL);
      return decimals === 0 ? String(Math.round(v)) : v.toFixed(2);
    },
    fromInput: (value: string) => {
      const n = parseFloat(String(value ?? '').replace(',', '.')) || 0;
      if (!n) return 0;
      if (currency === 'BRL') return Math.round(n * 100);
      // numeric(15,4) no banco — preserva 4 casas para o câmbio fechar de volta
      return Math.round(convert(n, currency, 'BRL') * 1000000) / 10000;
    },
  };
}
