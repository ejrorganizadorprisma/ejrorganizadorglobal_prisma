import { useCallback } from 'react';
import { useSystemSettings } from './useSystemSettings';
import { CURRENCY_CONFIG, type Currency } from '@ejr/shared-types';

/**
 * Formata um valor monetário armazenado no banco de dados para exibição.
 *
 * Regras de armazenamento (definidas pelo CurrencyInput):
 * - PYG (decimals=0): valor inteiro direto. 75000 = Gs. 75.000
 * - BRL (decimals=2): centavos. 75000 = R$ 750,00
 * - USD (decimals=2): cents. 75000 = $750.00
 *
 * @param value - Valor armazenado no banco
 * @param currency - Moeda do valor
 * @returns String formatada
 */
export function formatPriceValue(value: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency];
  const realValue = config.decimals === 0 ? value : value / 100;

  if (currency === 'PYG') {
    const formatted = new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(realValue);
    return `Gs. ${formatted}`;
  }

  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return realValue.toLocaleString(locale, {
    style: 'currency',
    currency: currency,
  });
}

/**
 * Hook que retorna uma função formatPrice já configurada
 * com a moeda padrão do sistema (de /settings/system).
 *
 * Uso:
 * ```tsx
 * const { formatPrice, defaultCurrency } = useFormatPrice();
 * formatPrice(75000) // "Gs. 75.000" se PYG, "R$ 750,00" se BRL
 * ```
 */
export function useFormatPrice() {
  const { data: systemSettings } = useSystemSettings();
  const defaultCurrency: Currency = systemSettings?.defaultCurrency || 'BRL';

  const formatPrice = useCallback(
    (value: number) => formatPriceValue(value, defaultCurrency),
    [defaultCurrency]
  );

  return { formatPrice, defaultCurrency };
}
