import { CURRENCY_CONFIG, type Currency } from '@ejr/shared-types';

interface ExchangeSettings {
  exchangeRateBrlToUsd: number;
  exchangeRateBrlToPyg: number;
}

/**
 * Converte um valor armazenado de uma moeda para outra usando as taxas
 * de câmbio do system_settings. Mantém o formato de armazenamento de cada
 * moeda (PYG inteiro, BRL/USD em centavos).
 */
export function convertPrice(
  value: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  settings: ExchangeSettings | null | undefined
): number {
  if (!settings || fromCurrency === toCurrency) return value;

  const fromConfig = CURRENCY_CONFIG[fromCurrency];
  const toConfig = CURRENCY_CONFIG[toCurrency];

  const realValue = fromConfig.decimals === 0 ? value : value / 100;

  let valueInBRL: number;
  if (fromCurrency === 'BRL') valueInBRL = realValue;
  else if (fromCurrency === 'USD') valueInBRL = realValue / settings.exchangeRateBrlToUsd;
  else if (fromCurrency === 'PYG') valueInBRL = realValue / settings.exchangeRateBrlToPyg;
  else return value;

  let result: number;
  if (toCurrency === 'BRL') result = valueInBRL;
  else if (toCurrency === 'USD') result = valueInBRL * settings.exchangeRateBrlToUsd;
  else if (toCurrency === 'PYG') result = valueInBRL * settings.exchangeRateBrlToPyg;
  else result = valueInBRL;

  return toConfig.decimals === 0 ? Math.round(result) : Math.round(result * 100);
}

/**
 * Retorna as outras moedas disponíveis (que não são a default), na ordem
 * preferida para exibição como equivalentes.
 */
export function getOtherCurrencies(defaultCurrency: Currency): Currency[] {
  const all: Currency[] = ['BRL', 'USD', 'PYG'];
  return all.filter((c) => c !== defaultCurrency);
}
