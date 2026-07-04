export type Country = 'BR' | 'PY';
export type Currency = 'BRL' | 'PYG' | 'USD';
export type Language = 'pt-BR' | 'es-PY';

// Método de identificação do responsável no chão de fábrica (Separação e Expedição)
export type FloorIdentificationMethod = 'LOGGED_USER' | 'EMPLOYEE_CODE';

export interface SystemSettings {
  id: string;
  country: Country;
  defaultCurrency: Currency;
  language: Language;

  // Taxas de câmbio - quanto vale 1 Real em:
  exchangeRateBrlToUsd: number; // Ex: 0.20 (1 BRL = 0.20 USD)
  exchangeRateBrlToPyg: number; // Ex: 1450.00 (1 BRL = 1450 PYG)
  exchangeRateUsdToPyg: number; // Ex: 7250.00 (1 USD = 7250 PYG)

  // Formatação de moeda
  enabledCurrencies: Currency[]; // Quais moedas estão habilitadas

  // Aplicativo celular
  mobileAppEnabled: boolean;
  mobileAppApiKey: string | null;

  // Chão de fábrica: como identificar o responsável na Separação/Expedição
  floorIdentificationMethod: FloorIdentificationMethod;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSystemSettingsDTO {
  country?: Country;
  defaultCurrency?: Currency;
  language?: Language;
  exchangeRateBrlToUsd?: number;
  exchangeRateBrlToPyg?: number;
  exchangeRateUsdToPyg?: number;
  enabledCurrencies?: Currency[];
  mobileAppEnabled?: boolean;
  mobileAppApiKey?: string | null;
  floorIdentificationMethod?: FloorIdentificationMethod;
}

export const COUNTRY_CONFIG = {
  BR: {
    label: 'Brasil',
    flag: '🇧🇷',
    defaultCurrency: 'BRL' as Currency,
    defaultLanguage: 'pt-BR' as Language,
    timezone: 'America/Sao_Paulo',
  },
  PY: {
    label: 'Paraguay',
    flag: '🇵🇾',
    defaultCurrency: 'PYG' as Currency,
    defaultLanguage: 'es-PY' as Language,
    timezone: 'America/Asuncion',
  },
} as const;

export const CURRENCY_CONFIG = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    label: 'Real Brasileiro',
    decimals: 2,
  },
  PYG: {
    code: 'PYG',
    symbol: '₲',
    label: 'Guarani Paraguayo',
    decimals: 0,
  },
  USD: {
    code: 'USD',
    symbol: 'US$',
    label: 'Dólar Americano',
    decimals: 2,
  },
} as const;

export const LANGUAGE_CONFIG = {
  'pt-BR': {
    code: 'pt-BR',
    label: 'Português (Brasil)',
    flag: '🇧🇷',
  },
  'es-PY': {
    code: 'es-PY',
    label: 'Español (Paraguay)',
    flag: '🇵🇾',
  },
} as const;
