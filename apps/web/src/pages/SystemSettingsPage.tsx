import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSystemSettings } from '../hooks/useSystemSettings';
import {
  COUNTRY_CONFIG,
  CURRENCY_CONFIG,
  LANGUAGE_CONFIG,
  type Country,
  type Currency,
  type Language,
} from '@ejr/shared-types';

export function SystemSettingsPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [country, setCountry] = useState<Country>('BR');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('BRL');
  const [language, setLanguage] = useState<Language>('pt-BR');
  const [exchangeRateBrlToUsd, setExchangeRateBrlToUsd] = useState(0.20);
  const [exchangeRateBrlToPyg, setExchangeRateBrlToPyg] = useState(1450.00);
  const [exchangeRateUsdToPyg, setExchangeRateUsdToPyg] = useState(7250.00);
  const [enabledCurrencies, setEnabledCurrencies] = useState<Currency[]>(['BRL', 'PYG', 'USD']);

  // Estados de inversão para os 3 campos
  const [isBrlUsdInverted, setIsBrlUsdInverted] = useState(false);
  const [isBrlPygInverted, setIsBrlPygInverted] = useState(false);
  const [isUsdPygInverted, setIsUsdPygInverted] = useState(false);

  // Estados de inversão para os cartões visuais
  const [isUsdCardInverted, setIsUsdCardInverted] = useState(false);
  const [isPygCardInverted, setIsPygCardInverted] = useState(false);
  const [isUsdPygCardInverted, setIsUsdPygCardInverted] = useState(false);

  // Estados temporários para edição (permitem digitar vírgula)
  const [editingBrlUsd, setEditingBrlUsd] = useState<string | null>(null);
  const [editingBrlPyg, setEditingBrlPyg] = useState<string | null>(null);
  const [editingUsdPyg, setEditingUsdPyg] = useState<string | null>(null);

  // Carregar dados quando disponíveis
  useEffect(() => {
    if (settings) {
      setCountry(settings.country);
      setDefaultCurrency(settings.defaultCurrency);
      setLanguage(settings.language);
      setExchangeRateBrlToUsd(settings.exchangeRateBrlToUsd);
      setExchangeRateBrlToPyg(settings.exchangeRateBrlToPyg);
      setExchangeRateUsdToPyg(settings.exchangeRateUsdToPyg);
      setEnabledCurrencies(settings.enabledCurrencies);
    }
  }, [settings]);

  // Atalho de teclado F10 para salvar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F10') {
        event.preventDefault(); // Previne comportamento padrão do navegador
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: remover listener quando componente desmontar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [country, defaultCurrency, language, exchangeRateBrlToUsd, exchangeRateBrlToPyg, exchangeRateUsdToPyg, enabledCurrencies]); // Dependências para ter acesso aos valores atuais

  // Ao mudar o país, sugerir moeda e língua padrão (mas permitir personalização)
  const handleCountryChange = (newCountry: Country) => {
    setCountry(newCountry);
    const config = COUNTRY_CONFIG[newCountry];
    setDefaultCurrency(config.defaultCurrency);
    setLanguage(config.defaultLanguage);
  };

  const handleToggleCurrency = (curr: Currency) => {
    if (enabledCurrencies.includes(curr)) {
      // Não permitir desabilitar todas as moedas
      if (enabledCurrencies.length > 1) {
        setEnabledCurrencies(enabledCurrencies.filter(c => c !== curr));
      } else {
        alert('Pelo menos uma moeda deve estar habilitada');
      }
    } else {
      setEnabledCurrencies([...enabledCurrencies, curr]);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        country,
        defaultCurrency,
        language,
        exchangeRateBrlToUsd,
        exchangeRateBrlToPyg,
        exchangeRateUsdToPyg,
        enabledCurrencies,
      });
      alert('✅ Configurações salvas com sucesso!');
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl lg:text-3xl font-bold mb-2">Configurações do Sistema</h1>
      <p className="text-gray-600 mb-8">
        Configure o país, moeda, idioma e taxas de câmbio do sistema
      </p>

      {/* País */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2">
          <span>🌍</span>
          <span>País de Operação</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(COUNTRY_CONFIG) as Country[]).map((countryCode) => {
            const config = COUNTRY_CONFIG[countryCode];
            const isSelected = country === countryCode;

            return (
              <button
                key={countryCode}
                onClick={() => handleCountryChange(countryCode)}
                className={`
                  p-6 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{config.flag}</span>
                  <div>
                    <div className="font-semibold text-lg">{config.label}</div>
                    <div className="text-sm text-gray-600">{countryCode}</div>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="text-sm text-blue-700">
                      Moeda padrão: {CURRENCY_CONFIG[config.defaultCurrency].symbol} {CURRENCY_CONFIG[config.defaultCurrency].label}
                    </div>
                    <div className="text-sm text-blue-700">
                      Idioma: {LANGUAGE_CONFIG[config.defaultLanguage].label}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Idioma e Moeda */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2">
          <span>⚙️</span>
          <span>Preferências</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Idioma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma do Sistema
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(LANGUAGE_CONFIG) as Language[]).map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_CONFIG[lang].flag} {LANGUAGE_CONFIG[lang].label}
                </option>
              ))}
            </select>
          </div>

          {/* Moeda Padrão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moeda Padrão
            </label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value as Currency)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {enabledCurrencies.map((curr) => (
                <option key={curr} value={curr}>
                  {CURRENCY_CONFIG[curr].symbol} {CURRENCY_CONFIG[curr].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Moedas Habilitadas */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2">
          <span>💰</span>
          <span>Moedas Habilitadas</span>
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecione quais moedas estarão disponíveis no sistema
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(CURRENCY_CONFIG) as Currency[]).map((curr) => {
            const config = CURRENCY_CONFIG[curr];
            const isEnabled = enabledCurrencies.includes(curr);

            return (
              <button
                key={curr}
                onClick={() => handleToggleCurrency(curr)}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${isEnabled
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-lg">{config.symbol}</div>
                    <div className="text-sm text-gray-600">{config.label}</div>
                  </div>
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center
                    ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}
                  `}>
                    {isEnabled && <span className="text-white text-sm">✓</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Taxas de Câmbio - Simplificado com botões de inversão */}
      {enabledCurrencies.length >= 2 && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
          <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💱</span>
            <span>Taxas de Câmbio</span>
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure as taxas de câmbio diretas entre as moedas. Use o botão ⇄ para inverter a direção da conversão.
          </p>

          <div className="space-y-6">
            {/* USD para BRL - Primeiro campo: Dólar em relação ao Real */}
            {enabledCurrencies.includes('BRL') && enabledCurrencies.includes('USD') && (
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {isBrlUsdInverted ? '1 Real (R$) = Quantos Dólares (US$)?' : '1 Dólar (US$) = Quantos Reais (R$)?'}
                  </label>
                  <button
                    onClick={() => setIsBrlUsdInverted(!isBrlUsdInverted)}
                    className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all hover:scale-110 active:scale-95"
                    title="Inverter conversão"
                  >
                    <span className="text-lg">⇄</span>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{isBrlUsdInverted ? '🇧🇷 R$ 1,00' : '🇺🇸 US$ 1,00'}</span>
                  <span className="text-gray-400 text-2xl">=</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingBrlUsd !== null ? editingBrlUsd : (isBrlUsdInverted ? (exchangeRateBrlToUsd || '') : (exchangeRateBrlToUsd > 0 ? (1 / exchangeRateBrlToUsd) : ''))}
                      onFocus={(e) => {
                        const currentValue = isBrlUsdInverted ? (exchangeRateBrlToUsd?.toString() || '') : (exchangeRateBrlToUsd > 0 ? (1 / exchangeRateBrlToUsd).toString() : '');
                        setEditingBrlUsd(currentValue);
                        e.target.select();
                      }}
                      onChange={(e) => {
                        setEditingBrlUsd(e.target.value);
                      }}
                      onBlur={() => {
                        if (editingBrlUsd !== null) {
                          const val = parseFloat(editingBrlUsd.replace(',', '.'));
                          if (!isNaN(val) && val >= 0) {
                            if (isBrlUsdInverted) {
                              setExchangeRateBrlToUsd(val);
                            } else {
                              if (val > 0) {
                                setExchangeRateBrlToUsd(1 / val);
                              }
                            }
                          } else if (editingBrlUsd === '' || editingBrlUsd === '0') {
                            setExchangeRateBrlToUsd(0);
                          }
                          setEditingBrlUsd(null);
                        }
                      }}
                      onClick={(e) => e.currentTarget.select()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder={isBrlUsdInverted ? "0.20" : "5.00"}
                    />
                  </div>
                  <span className="text-3xl">{isBrlUsdInverted ? '🇺🇸 US$' : '🇧🇷 R$'}</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {isBrlUsdInverted
                    ? `Exemplo: R$ 100,00 = US$ ${(100 * exchangeRateBrlToUsd).toFixed(2)}`
                    : `Exemplo: US$ 100,00 = R$ ${exchangeRateBrlToUsd > 0 ? (100 / exchangeRateBrlToUsd).toFixed(2) : '0.00'}`
                  }
                </div>
              </div>
            )}

            {/* USD para PYG - Segundo campo: Dólar em relação ao Guarani */}
            {enabledCurrencies.includes('USD') && enabledCurrencies.includes('PYG') && (
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {isUsdPygInverted ? '1.000 Guaranis (₲) = Quantos Dólares (US$)?' : '1 Dólar (US$) = Quantos Guaranis (₲)?'}
                  </label>
                  <button
                    onClick={() => setIsUsdPygInverted(!isUsdPygInverted)}
                    className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all hover:scale-110 active:scale-95"
                    title="Inverter conversão"
                  >
                    <span className="text-lg">⇄</span>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{isUsdPygInverted ? '🇵🇾 ₲ 1.000' : '🇺🇸 US$ 1,00'}</span>
                  <span className="text-gray-400 text-2xl">=</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingUsdPyg !== null ? editingUsdPyg : (isUsdPygInverted ? (exchangeRateUsdToPyg > 0 ? (1000 / exchangeRateUsdToPyg) : '') : (exchangeRateUsdToPyg || ''))}
                      onFocus={(e) => {
                        const currentValue = isUsdPygInverted ? (exchangeRateUsdToPyg > 0 ? (1000 / exchangeRateUsdToPyg).toString() : '') : (exchangeRateUsdToPyg?.toString() || '');
                        setEditingUsdPyg(currentValue);
                        e.target.select();
                      }}
                      onChange={(e) => {
                        setEditingUsdPyg(e.target.value);
                      }}
                      onBlur={() => {
                        if (editingUsdPyg !== null) {
                          const val = parseFloat(editingUsdPyg.replace(',', '.'));
                          if (!isNaN(val) && val >= 0) {
                            if (isUsdPygInverted) {
                              if (val > 0) {
                                setExchangeRateUsdToPyg(1000 / val);
                              }
                            } else {
                              setExchangeRateUsdToPyg(val);
                            }
                          } else if (editingUsdPyg === '' || editingUsdPyg === '0') {
                            setExchangeRateUsdToPyg(0);
                          }
                          setEditingUsdPyg(null);
                        }
                      }}
                      onClick={(e) => e.currentTarget.select()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder={isUsdPygInverted ? "0.14" : "7250"}
                    />
                  </div>
                  <span className="text-3xl">{isUsdPygInverted ? '🇺🇸 US$' : '🇵🇾 ₲'}</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {isUsdPygInverted
                    ? `Exemplo: ₲ 10.000 = US$ ${exchangeRateUsdToPyg > 0 ? (10000 / exchangeRateUsdToPyg).toFixed(2) : '0.00'}`
                    : `Exemplo: US$ 100,00 = ₲ ${(100 * exchangeRateUsdToPyg).toFixed(0)}`
                  }
                </div>
              </div>
            )}

            {/* BRL para PYG - Terceiro campo: Real em relação ao Guarani */}
            {enabledCurrencies.includes('BRL') && enabledCurrencies.includes('PYG') && (
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {isBrlPygInverted ? '1.000 Guaranis (₲) = Quantos Reais (R$)?' : '1 Real (R$) = Quantos Guaranis (₲)?'}
                  </label>
                  <button
                    onClick={() => setIsBrlPygInverted(!isBrlPygInverted)}
                    className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all hover:scale-110 active:scale-95"
                    title="Inverter conversão"
                  >
                    <span className="text-lg">⇄</span>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{isBrlPygInverted ? '🇵🇾 ₲ 1.000' : '🇧🇷 R$ 1,00'}</span>
                  <span className="text-gray-400 text-2xl">=</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingBrlPyg !== null ? editingBrlPyg : (isBrlPygInverted ? (exchangeRateBrlToPyg > 0 ? (1000 / exchangeRateBrlToPyg) : '') : (exchangeRateBrlToPyg || ''))}
                      onFocus={(e) => {
                        const currentValue = isBrlPygInverted ? (exchangeRateBrlToPyg > 0 ? (1000 / exchangeRateBrlToPyg).toString() : '') : (exchangeRateBrlToPyg?.toString() || '');
                        setEditingBrlPyg(currentValue);
                        e.target.select();
                      }}
                      onChange={(e) => {
                        setEditingBrlPyg(e.target.value);
                      }}
                      onBlur={() => {
                        if (editingBrlPyg !== null) {
                          const val = parseFloat(editingBrlPyg.replace(',', '.'));
                          if (!isNaN(val) && val >= 0) {
                            if (isBrlPygInverted) {
                              if (val > 0) {
                                setExchangeRateBrlToPyg(1000 / val);
                              }
                            } else {
                              setExchangeRateBrlToPyg(val);
                            }
                          } else if (editingBrlPyg === '' || editingBrlPyg === '0') {
                            setExchangeRateBrlToPyg(0);
                          }
                          setEditingBrlPyg(null);
                        }
                      }}
                      onClick={(e) => e.currentTarget.select()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder={isBrlPygInverted ? "0.69" : "1450"}
                    />
                  </div>
                  <span className="text-3xl">{isBrlPygInverted ? '🇧🇷 R$' : '🇵🇾 ₲'}</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {isBrlPygInverted
                    ? `Exemplo: ₲ 10.000 = R$ ${exchangeRateBrlToPyg > 0 ? (10000 / exchangeRateBrlToPyg).toFixed(2) : '0.00'}`
                    : `Exemplo: R$ 100,00 = ₲ ${(100 * exchangeRateBrlToPyg).toFixed(0)}`
                  }
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <span>💡</span>
              <span>
                <strong>Dica:</strong> Use o botão ⇄ para inverter a direção da conversão e facilitar a entrada de dados. Os valores são sempre salvos de forma consistente.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="w-full sm:w-auto px-8 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg shadow-md hover:shadow-lg transition-all"
        >
          {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações (F10)'}
        </button>
      </div>

      {/* Quadros de Comparação de Taxas - Final da Página */}
      {enabledCurrencies.length >= 2 && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mt-6">
          <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🔄</span>
            <span>Comparação de Taxas</span>
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Visualize e compare as taxas de câmbio configuradas
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* USD para BRL */}
            {enabledCurrencies.includes('USD') && enabledCurrencies.includes('BRL') && (
              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">{isUsdCardInverted ? '🇧🇷' : '🇺🇸'}</span>
                    <button
                      onClick={() => setIsUsdCardInverted(!isUsdCardInverted)}
                      className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110 active:scale-95"
                      title="Inverter conversão"
                    >
                      <span className="text-2xl">⇄</span>
                    </button>
                    <span className="text-4xl">{isUsdCardInverted ? '🇺🇸' : '🇧🇷'}</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-700">
                    {isUsdCardInverted ? 'Real → Dólar' : 'Dólar → Real'}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {isUsdCardInverted ? 'R$ 1,00' : 'US$ 1,00'}
                    </span>
                    <span className="text-gray-400 text-xl">=</span>
                    <span className="text-2xl font-bold text-green-600">
                      {isUsdCardInverted
                        ? `US$ ${exchangeRateBrlToUsd.toFixed(2)}`
                        : `R$ ${exchangeRateBrlToUsd > 0 ? (1 / exchangeRateBrlToUsd).toFixed(2) : '0.00'}`
                      }
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 text-center">
                      {isUsdCardInverted
                        ? `R$ 100,00 = US$ ${(100 * exchangeRateBrlToUsd).toFixed(2)}`
                        : `US$ 100,00 = R$ ${exchangeRateBrlToUsd > 0 ? (100 / exchangeRateBrlToUsd).toFixed(2) : '0.00'}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PYG para BRL */}
            {enabledCurrencies.includes('PYG') && enabledCurrencies.includes('BRL') && (
              <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">{isPygCardInverted ? '🇧🇷' : '🇵🇾'}</span>
                    <button
                      onClick={() => setIsPygCardInverted(!isPygCardInverted)}
                      className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110 active:scale-95"
                      title="Inverter conversão"
                    >
                      <span className="text-2xl">⇄</span>
                    </button>
                    <span className="text-4xl">{isPygCardInverted ? '🇵🇾' : '🇧🇷'}</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-700">
                    {isPygCardInverted ? 'Real → Guarani' : 'Guarani → Real'}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {isPygCardInverted ? 'R$ 1,00' : '₲ 1.000'}
                    </span>
                    <span className="text-gray-400 text-xl">=</span>
                    <span className="text-2xl font-bold text-green-600">
                      {isPygCardInverted
                        ? `₲ ${exchangeRateBrlToPyg.toFixed(0)}`
                        : `R$ ${exchangeRateBrlToPyg > 0 ? (1000 / exchangeRateBrlToPyg).toFixed(2) : '0.00'}`
                      }
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 text-center">
                      {isPygCardInverted
                        ? `R$ 100,00 = ₲ ${(100 * exchangeRateBrlToPyg).toFixed(0)}`
                        : `₲ 10.000 = R$ ${exchangeRateBrlToPyg > 0 ? (10000 / exchangeRateBrlToPyg).toFixed(2) : '0.00'}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USD para PYG */}
            {enabledCurrencies.includes('USD') && enabledCurrencies.includes('PYG') && (
              <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl">{isUsdPygCardInverted ? '🇵🇾' : '🇺🇸'}</span>
                    <button
                      onClick={() => setIsUsdPygCardInverted(!isUsdPygCardInverted)}
                      className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110 active:scale-95"
                      title="Inverter conversão"
                    >
                      <span className="text-2xl">⇄</span>
                    </button>
                    <span className="text-4xl">{isUsdPygCardInverted ? '🇺🇸' : '🇵🇾'}</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-700">
                    {isUsdPygCardInverted ? 'Guarani → Dólar' : 'Dólar → Guarani'}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {isUsdPygCardInverted ? '₲ 1.000' : 'US$ 1,00'}
                    </span>
                    <span className="text-gray-400 text-xl">=</span>
                    <span className="text-2xl font-bold text-green-600">
                      {isUsdPygCardInverted
                        ? `US$ ${exchangeRateUsdToPyg > 0 ? (1000 / exchangeRateUsdToPyg).toFixed(2) : '0.00'}`
                        : `₲ ${exchangeRateUsdToPyg.toFixed(0)}`
                      }
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 text-center">
                      {isUsdPygCardInverted
                        ? `₲ 10.000 = US$ ${exchangeRateUsdToPyg > 0 ? (10000 / exchangeRateUsdToPyg).toFixed(2) : '0.00'}`
                        : `US$ 100,00 = ₲ ${(100 * exchangeRateUsdToPyg).toFixed(0)}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <span>💡</span>
              <span>
                <strong>Dica:</strong> Estes valores são calculados automaticamente com base nas taxas que você configurou. Clique no botão ⇄ para inverter a visualização!
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
