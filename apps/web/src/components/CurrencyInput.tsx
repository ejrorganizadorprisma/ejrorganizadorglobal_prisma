import { InputHTMLAttributes, useState, useEffect } from 'react';
import { useSystemSettings } from '../hooks/useSystemSettings';
import type { Currency } from '@ejr/shared-types';
import { CURRENCY_CONFIG } from '@ejr/shared-types';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // Valor numérico na moeda especificada
  currency: Currency; // Moeda deste preço
  onChange: (value: number, currency: Currency) => void;
  label?: string;
  error?: string;
}

/**
 * Componente de input para valores monetários SEM conversão bidirecional
 *
 * - Armazena o valor EXATAMENTE como digitado, na moeda especificada
 * - Não faz conversões que alterem o valor
 * - Mostra conversões para outras moedas apenas para referência visual
 * - PYG: sem decimais (valor inteiro)
 * - BRL/USD: com 2 decimais (centavos)
 *
 * @example
 * <CurrencyInput
 *   value={salePrice} // valor numérico (ex: 3000 para PYG, 15000 para BRL em centavos)
 *   currency={salePriceCurrency} // 'PYG', 'BRL', ou 'USD'
 *   onChange={(value, currency) => {
 *     setFormData({ ...formData, salePrice: value, salePriceCurrency: currency })
 *   }}
 *   label="Preço de Venda"
 *   required
 * />
 */
export function CurrencyInput({
  value,
  currency,
  onChange,
  label,
  error,
  className = '',
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { data: systemSettings } = useSystemSettings();

  const config = CURRENCY_CONFIG[currency];

  // Converter valor numérico para valor real (divide por 100 se tiver decimais)
  const toRealValue = (numericValue: number): number => {
    if (config.decimals === 0) {
      return numericValue; // PYG: valor é direto
    }
    return numericValue / 100; // BRL/USD: centavos para reais/dólares
  };

  // Converter valor real para valor numérico (multiplica por 100 se tiver decimais)
  const toNumericValue = (realValue: number): number => {
    if (config.decimals === 0) {
      return Math.round(realValue); // PYG: arredondar para inteiro
    }
    return Math.round(realValue * 100); // BRL/USD: reais/dólares para centavos
  };

  // Formatar valor para exibição
  const formatValue = (numericValue: number): string => {
    const realValue = toRealValue(numericValue);
    return realValue.toLocaleString('pt-BR', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  };

  // Converter preço de uma moeda para outra (apenas para exibição)
  // Usa taxas diretas quando disponíveis para evitar erro de triangulação
  const convertPrice = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
    if (!systemSettings || fromCurrency === toCurrency) return amount;

    const amountReal = toRealValue(amount);

    // Conversões diretas usando as taxas configuradas
    // exchangeRateBrlToUsd: 1 BRL = X USD
    // exchangeRateBrlToPyg: 1 BRL = X PYG
    // exchangeRateUsdToPyg: 1 USD = X PYG

    if (fromCurrency === 'PYG' && toCurrency === 'USD') {
      // PYG → USD direto
      return systemSettings.exchangeRateUsdToPyg > 0
        ? amountReal / systemSettings.exchangeRateUsdToPyg : 0;
    }
    if (fromCurrency === 'USD' && toCurrency === 'PYG') {
      // USD → PYG direto
      return amountReal * systemSettings.exchangeRateUsdToPyg;
    }
    if (fromCurrency === 'PYG' && toCurrency === 'BRL') {
      // PYG → BRL direto
      return systemSettings.exchangeRateBrlToPyg > 0
        ? amountReal / systemSettings.exchangeRateBrlToPyg : 0;
    }
    if (fromCurrency === 'BRL' && toCurrency === 'PYG') {
      // BRL → PYG direto
      return amountReal * systemSettings.exchangeRateBrlToPyg;
    }
    if (fromCurrency === 'BRL' && toCurrency === 'USD') {
      // BRL → USD direto
      return amountReal * systemSettings.exchangeRateBrlToUsd;
    }
    if (fromCurrency === 'USD' && toCurrency === 'BRL') {
      // USD → BRL direto
      return systemSettings.exchangeRateBrlToUsd > 0
        ? amountReal / systemSettings.exchangeRateBrlToUsd : 0;
    }

    return amountReal;
  };

  // Formatar valor em uma moeda específica para exibição
  const formatCurrencyValue = (amount: number, curr: Currency): string => {
    const cfg = CURRENCY_CONFIG[curr];
    const formatted = amount.toLocaleString('pt-BR', {
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    });
    return `${cfg.symbol} ${formatted}`;
  };

  // Atualizar display quando o valor externo mudar (somente quando não está focado)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatValue(value));
    }
  }, [value, isFocused, currency]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    const realValue = toRealValue(value);
    setDisplayValue(realValue.toFixed(config.decimals));
    setTimeout(() => e.target.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue(formatValue(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    let cleaned: string;
    if (config.decimals === 0) {
      // PYG: apenas dígitos
      cleaned = input.replace(/[^\d]/g, '');
    } else {
      // BRL/USD: permitir vírgula e ponto
      cleaned = input.replace(/[^\d.,]/g, '');
    }

    setDisplayValue(cleaned);

    // Substituir vírgula por ponto para parsing
    const normalized = cleaned.replace(',', '.');
    const realValue = parseFloat(normalized) || 0;
    const numericValue = toNumericValue(realValue);

    // Retornar o valor numérico E a moeda (sem conversão!)
    onChange(numericValue, currency);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'];

    if (config.decimals > 0) {
      allowedKeys.push('.', ',');
    }

    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }

    if (e.key.startsWith('Arrow')) {
      return;
    }

    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  // Obter moedas ativas para exibir conversões
  const getOtherCurrencies = (): Currency[] => {
    if (!systemSettings) return [];

    const others: Currency[] = [];
    systemSettings.enabledCurrencies?.forEach(curr => {
      if (curr !== currency) {
        others.push(curr);
      }
    });
    return others;
  };

  const otherCurrencies = getOtherCurrencies();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none font-medium">
          {config.symbol}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full pl-12 pr-3 py-2 border rounded ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          placeholder={config.decimals === 0 ? '0' : '0,00'}
          {...props}
        />
      </div>

      {/* Exibir conversões para outras moedas (apenas informativo) */}
      {!isFocused && systemSettings && otherCurrencies.length > 0 && value > 0 && (
        <div className="mt-1 flex gap-2 text-xs text-gray-500">
          {otherCurrencies.map((curr) => {
            const convertedValue = convertPrice(value, currency, curr);
            const formattedValue = formatCurrencyValue(convertedValue, curr);
            return (
              <span key={curr} className="text-gray-500">
                {formattedValue}
              </span>
            );
          })}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
