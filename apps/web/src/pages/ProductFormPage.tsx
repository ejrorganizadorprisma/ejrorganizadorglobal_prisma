import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProduct, useCreateProduct, useUpdateProduct } from '../hooks/useProducts';
import { useStorageSpaces, useStorageShelves, useStorageSections } from '../hooks/useStorageLocations';
import { useActiveProductCategories } from '../hooks/useProductCategories';
import { useActiveProductFamilies } from '../hooks/useProductFamilies';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { toast } from 'sonner';
import { BOMManager } from '../components/product/BOMManager';
import { SuppliersManager } from '../components/product/SuppliersManager';
import { ProductStatus, ProductUnit, type Currency, CURRENCY_CONFIG } from '@ejr/shared-types';
import { api } from '../lib/api';
import { CurrencyInput } from '../components/CurrencyInput';

// Função auxiliar para converter preço entre moedas
function convertPrice(
  value: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  systemSettings: any
): number {
  if (!systemSettings || fromCurrency === toCurrency) return value;

  const fromConfig = CURRENCY_CONFIG[fromCurrency];
  const toConfig = CURRENCY_CONFIG[toCurrency];

  // Converter para valor real (dividir por 100 se tiver decimais)
  const realValue = fromConfig.decimals === 0 ? value : value / 100;

  // Converter para BRL primeiro
  let valueInBRL: number;
  if (fromCurrency === 'BRL') {
    valueInBRL = realValue;
  } else if (fromCurrency === 'USD') {
    valueInBRL = realValue / systemSettings.exchangeRateBrlToUsd;
  } else if (fromCurrency === 'PYG') {
    valueInBRL = realValue / systemSettings.exchangeRateBrlToPyg;
  } else {
    return value;
  }

  // Converter de BRL para moeda de destino
  let result: number;
  if (toCurrency === 'BRL') {
    result = valueInBRL;
  } else if (toCurrency === 'USD') {
    result = valueInBRL * systemSettings.exchangeRateBrlToUsd;
  } else if (toCurrency === 'PYG') {
    result = valueInBRL * systemSettings.exchangeRateBrlToPyg;
  } else {
    result = valueInBRL;
  }

  // Converter de volta para formato numérico (multiplicar por 100 se tiver decimais)
  return toConfig.decimals === 0 ? Math.round(result) : Math.round(result * 100);
}

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;

  // Lê a aba da URL se fornecida
  const initialTab = searchParams.get('tab') as 'info' | 'bom' | 'suppliers' | null;
  const [activeTab, setActiveTab] = useState<'info' | 'bom' | 'suppliers'>(initialTab || 'info');
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: product, isLoading: loadingProduct } = useProduct(id);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: systemSettings } = useSystemSettings();

  const defaultCurrency = (systemSettings?.defaultCurrency || 'BRL') as Currency;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    family: '',
    manufacturer: '',
    costPrice: 0,
    salePrice: 0,
    wholesalePrice: 0,
    costPriceCurrency: defaultCurrency,
    salePriceCurrency: defaultCurrency,
    wholesalePriceCurrency: defaultCurrency,
    technicalDescription: '',
    commercialDescription: '',
    warrantyMonths: 0,
    minimumStock: 5,
    status: ProductStatus.ACTIVE,
    imageUrls: [] as string[],
    isAssembly: false,
    isPart: false,
    assemblyCost: 0,
    unit: ProductUnit.UNIT,
    factoryCode: '',
    warrantyExpirationDate: '',
    observations: '',
    quantityPerBox: 1,
    spaceId: '',
    shelfId: '',
    sectionId: '',
  });

  // Estados para edição intuitiva dos campos de margem
  const [saleMarginDisplay, setSaleMarginDisplay] = useState('0');
  const [wholesaleMarginDisplay, setWholesaleMarginDisplay] = useState('0');
  const [isSaleMarginFocused, setIsSaleMarginFocused] = useState(false);
  const [isWholesaleMarginFocused, setIsWholesaleMarginFocused] = useState(false);

  // Storage locations - chamados DEPOIS de formData estar definido
  const { data: spaces = [] } = useStorageSpaces();
  const { data: shelves = [] } = useStorageShelves(formData.spaceId);
  const { data: sections = [] } = useStorageSections(formData.shelfId);

  // Categorias e famílias de produtos
  const { data: categories = [] } = useActiveProductCategories();
  const { data: families = [] } = useActiveProductFamilies();

  useEffect(() => {
    if (product) {
      setFormData({
        code: product.code,
        name: product.name,
        category: product.category,
        family: product.family || '',
        manufacturer: product.manufacturer || '',
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        wholesalePrice: product.wholesalePrice || 0,
        costPriceCurrency: product.costPriceCurrency || systemSettings?.defaultCurrency || 'BRL',
        salePriceCurrency: product.salePriceCurrency || systemSettings?.defaultCurrency || 'BRL',
        wholesalePriceCurrency: product.wholesalePriceCurrency || systemSettings?.defaultCurrency || 'BRL',
        technicalDescription: product.technicalDescription || '',
        commercialDescription: product.commercialDescription || '',
        warrantyMonths: product.warrantyMonths || 0,
        minimumStock: product.minimumStock,
        status: product.status,
        imageUrls: product.imageUrls || [],
        isAssembly: product.isAssembly || false,
        isPart: product.isPart || false,
        assemblyCost: product.assemblyCost || 0,
        unit: product.unit || ProductUnit.UNIT,
        factoryCode: (product as any).factoryCode || '',
        warrantyExpirationDate: (product as any).warrantyExpirationDate ? String((product as any).warrantyExpirationDate).split('T')[0] : '',
        observations: (product as any).observations || '',
        quantityPerBox: (product as any).quantityPerBox || 1,
        spaceId: product.spaceId || '',
        shelfId: product.shelfId || '',
        sectionId: product.sectionId || '',
      });
    }
  }, [product, systemSettings]);

  // Define moedas padrão ao criar novo produto
  useEffect(() => {
    if (!id && systemSettings) {
      setFormData(prev => ({
        ...prev,
        costPriceCurrency: systemSettings.defaultCurrency as Currency,
        salePriceCurrency: systemSettings.defaultCurrency as Currency,
        wholesalePriceCurrency: systemSettings.defaultCurrency as Currency,
      }));
    }
  }, [id, systemSettings]);

  // Atualiza a aba quando o parâmetro da URL mudar
  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'info' | 'bom' | 'suppliers' | null;
    if (tabParam && isEditing) {
      setActiveTab(tabParam);
    }
  }, [searchParams, isEditing]);

  // Atualiza displays das margens quando os preços mudarem (somente quando não está focado)
  useEffect(() => {
    if (!isSaleMarginFocused && formData.costPrice > 0) {
      const salePriceInCostCurrency = systemSettings
        ? convertPrice(formData.salePrice, formData.salePriceCurrency, formData.costPriceCurrency, systemSettings)
        : formData.salePrice;
      const costConfig = CURRENCY_CONFIG[formData.costPriceCurrency];
      const costReal = costConfig.decimals === 0 ? formData.costPrice : formData.costPrice / 100;
      const saleReal = costConfig.decimals === 0 ? salePriceInCostCurrency : salePriceInCostCurrency / 100;
      const margin = ((saleReal - costReal) / costReal) * 100;
      setSaleMarginDisplay(margin.toFixed(2));
    }
  }, [formData.costPrice, formData.salePrice, formData.costPriceCurrency, formData.salePriceCurrency, isSaleMarginFocused, systemSettings]);

  useEffect(() => {
    if (!isWholesaleMarginFocused && formData.costPrice > 0) {
      const wholesalePriceInCostCurrency = systemSettings
        ? convertPrice(formData.wholesalePrice, formData.wholesalePriceCurrency, formData.costPriceCurrency, systemSettings)
        : formData.wholesalePrice;
      const costConfig = CURRENCY_CONFIG[formData.costPriceCurrency];
      const costReal = costConfig.decimals === 0 ? formData.costPrice : formData.costPrice / 100;
      const wholesaleReal = costConfig.decimals === 0 ? wholesalePriceInCostCurrency : wholesalePriceInCostCurrency / 100;
      const margin = ((wholesaleReal - costReal) / costReal) * 100;
      setWholesaleMarginDisplay(margin.toFixed(2));
    }
  }, [formData.costPrice, formData.wholesalePrice, formData.costPriceCurrency, formData.wholesalePriceCurrency, isWholesaleMarginFocused, systemSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Converte valores para inteiros (em centavos)
    const costPrice = parseInt(String(formData.costPrice)) || 0;
    const salePrice = parseInt(String(formData.salePrice)) || 0;
    const wholesalePrice = parseInt(String(formData.wholesalePrice)) || 0;
    const assemblyCost = parseInt(String(formData.assemblyCost)) || 0;

    // Validações
    if (!formData.name || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (costPrice < 0) {
      toast.error('Preço de custo não pode ser negativo');
      return;
    }

    if (salePrice < 0) {
      toast.error('Preço de venda não pode ser negativo');
      return;
    }

    if (wholesalePrice < 0) {
      toast.error('Preço de venda atacado não pode ser negativo');
      return;
    }

    if (salePrice > 0 && costPrice > 0 && salePrice < costPrice) {
      toast.error('Preço de venda não pode ser menor que o preço de custo');
      return;
    }

    if (formData.minimumStock < 0) {
      toast.error('Estoque mínimo não pode ser negativo');
      return;
    }

    // Prepara dados com valores em centavos
    const dataToSubmit = {
      ...formData,
      costPrice,
      salePrice,
      wholesalePrice,
      assemblyCost,
      costPriceCurrency: formData.costPriceCurrency,
      salePriceCurrency: formData.salePriceCurrency,
      wholesalePriceCurrency: formData.wholesalePriceCurrency,
      // Campos opcionais: enviar null se vazios
      factoryCode: formData.factoryCode || null,
      warrantyExpirationDate: formData.warrantyExpirationDate || null,
      observations: formData.observations || null,
      quantityPerBox: formData.quantityPerBox || 1,
      // Filtra URLs vazias
      imageUrls: formData.imageUrls.filter((url) => url.trim() !== ''),
    };

    console.log('💾 Salvando produto...', isEditing ? 'Editando' : 'Criando');
    console.log('📦 Dados a enviar:', dataToSubmit);
    console.log('🖼️ URLs de imagens:', dataToSubmit.imageUrls);

    try {
      if (isEditing) {
        const result = await updateProduct.mutateAsync({
          id: id!,
          data: dataToSubmit,
        });
        console.log('✅ Produto atualizado:', result);
        toast.success('Produto atualizado com sucesso!');
        navigate('/products');
      } else {
        const result = await createProduct.mutateAsync(dataToSubmit);
        console.log('✅ Produto criado:', result);
        toast.success('Produto criado! Adicione fornecedores agora.');
        // Redireciona para a página de edição com aba de fornecedores
        navigate(`/products/${result.id}/edit?tab=suppliers`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar produto:', error);
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar produto');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'minimumStock' || name === 'warrantyMonths') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <button
            onClick={() => navigate('/products')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Voltar para Produtos
          </button>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
        </div>

        {/* Tabs */}
        {isEditing && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Informações Básicas
              </button>
              {formData.isAssembly && (
                <button
                  type="button"
                  onClick={() => setActiveTab('bom')}
                  className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                    activeTab === 'bom'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  BOM (Peças)
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('suppliers')}
                className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'suppliers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Fornecedores
              </button>
            </nav>
          </div>
        )}

        {activeTab === 'info' ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código {isEditing && <span className="text-xs text-gray-500">(gerado automaticamente)</span>}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.code}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                placeholder="PROD-0001"
              />
            ) : (
              <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500 italic">
                Será gerado automaticamente (ex: PROD-0001)
              </div>
            )}
          </div>

          {/* Código Fábrica */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Fábrica
            </label>
            <input
              type="text"
              name="factoryCode"
              value={formData.factoryCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Código do fabricante"
            />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do produto"
            />
          </div>

          {/* Fabricante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fabricante
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do fabricante"
            />
          </div>

          {/* Unidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade <span className="text-red-500">*</span>
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={ProductUnit.UNIT}>Un (Unidade)</option>
              <option value={ProductUnit.METER}>Metro</option>
              <option value={ProductUnit.WEIGHT}>Peso (Kg)</option>
              <option value={ProductUnit.LITER}>Litro</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Nenhuma categoria cadastrada. <a href="/settings/product-categories" className="underline">Cadastre categorias aqui</a>.
              </p>
            )}
          </div>

          {/* Família */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Família
            </label>
            <select
              name="family"
              value={formData.family}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma família</option>
              {families.map((family) => (
                <option key={family.id} value={family.name}>
                  {family.name}
                </option>
              ))}
            </select>
            {families.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Nenhuma família cadastrada. <a href="/settings/product-categories" className="underline">Cadastre famílias aqui</a>.
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={ProductStatus.ACTIVE}>Ativo</option>
              <option value={ProductStatus.INACTIVE}>Inativo</option>
              <option value={ProductStatus.DISCONTINUED}>Descontinuado</option>
            </select>
          </div>

          {/* Garantia (meses) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garantia (meses)
            </label>
            <input
              type="number"
              name="warrantyMonths"
              value={formData.warrantyMonths}
              onChange={handleChange}
              onFocus={(e) => e.target.select()}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          {/* Garantia - Data de Vencimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garantia Vencimento
            </label>
            <input
              type="date"
              name="warrantyExpirationDate"
              value={formData.warrantyExpirationDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preço de Custo */}
          <div>
            <CurrencyInput
              label="Preço de Custo"
              value={formData.costPrice}
              currency={formData.costPriceCurrency}
              onChange={(value, currency) => setFormData({
                ...formData,
                costPrice: value,
                costPriceCurrency: currency
              })}
            />
          </div>

          {/* Preço de Venda Atacado + Margem */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <CurrencyInput
                label="Preço de Venda Atacado"
                value={formData.wholesalePrice}
                currency={formData.wholesalePriceCurrency}
                onChange={(value, currency) => setFormData({
                  ...formData,
                  wholesalePrice: value,
                  wholesalePriceCurrency: currency
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem %
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={wholesaleMarginDisplay}
                  onChange={(e) => {
                    // Permite apenas números, vírgula e ponto
                    const cleaned = e.target.value.replace(/[^\d.,-]/g, '');
                    setWholesaleMarginDisplay(cleaned);
                  }}
                  onFocus={(e) => {
                    setIsWholesaleMarginFocused(true);
                    e.target.select();
                  }}
                  onBlur={() => {
                    setIsWholesaleMarginFocused(false);
                    // Calcula o novo preço baseado na margem
                    const margin = parseFloat(wholesaleMarginDisplay.replace(',', '.')) || 0;
                    if (formData.costPrice > 0) {
                      const costConfig = CURRENCY_CONFIG[formData.costPriceCurrency];
                      const costReal = costConfig.decimals === 0 ? formData.costPrice : formData.costPrice / 100;
                      const newWholesaleReal = costReal * (1 + margin / 100);
                      const newWholesalePriceInCostCurrency = costConfig.decimals === 0
                        ? Math.round(newWholesaleReal)
                        : Math.round(newWholesaleReal * 100);
                      const newWholesalePrice = systemSettings && formData.wholesalePriceCurrency !== formData.costPriceCurrency
                        ? convertPrice(newWholesalePriceInCostCurrency, formData.costPriceCurrency, formData.wholesalePriceCurrency, systemSettings)
                        : newWholesalePriceInCostCurrency;
                      setFormData({ ...formData, wholesalePrice: newWholesalePrice });
                    }
                    // Formata o display
                    setWholesaleMarginDisplay(margin.toFixed(2));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Preço de Venda + Margem */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <CurrencyInput
                label="Preço de Venda"
                value={formData.salePrice}
                currency={formData.salePriceCurrency}
                onChange={(value, currency) => setFormData({
                  ...formData,
                  salePrice: value,
                  salePriceCurrency: currency
                })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem %
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={saleMarginDisplay}
                  onChange={(e) => {
                    // Permite apenas números, vírgula e ponto
                    const cleaned = e.target.value.replace(/[^\d.,-]/g, '');
                    setSaleMarginDisplay(cleaned);
                  }}
                  onFocus={(e) => {
                    setIsSaleMarginFocused(true);
                    e.target.select();
                  }}
                  onBlur={() => {
                    setIsSaleMarginFocused(false);
                    // Calcula o novo preço baseado na margem
                    const margin = parseFloat(saleMarginDisplay.replace(',', '.')) || 0;
                    if (formData.costPrice > 0) {
                      const costConfig = CURRENCY_CONFIG[formData.costPriceCurrency];
                      const costReal = costConfig.decimals === 0 ? formData.costPrice : formData.costPrice / 100;
                      const newSaleReal = costReal * (1 + margin / 100);
                      const newSalePriceInCostCurrency = costConfig.decimals === 0
                        ? Math.round(newSaleReal)
                        : Math.round(newSaleReal * 100);
                      const newSalePrice = systemSettings && formData.salePriceCurrency !== formData.costPriceCurrency
                        ? convertPrice(newSalePriceInCostCurrency, formData.costPriceCurrency, formData.salePriceCurrency, systemSettings)
                        : newSalePriceInCostCurrency;
                      setFormData({ ...formData, salePrice: newSalePrice });
                    }
                    // Formata o display
                    setSaleMarginDisplay(margin.toFixed(2));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Estoque Mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque Mínimo
            </label>
            <input
              type="number"
              name="minimumStock"
              value={formData.minimumStock}
              onChange={handleChange}
              onFocus={(e) => e.target.select()}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          {/* Quantidade na Caixa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qtd na Caixa
            </label>
            <input
              type="number"
              name="quantityPerBox"
              value={formData.quantityPerBox}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantityPerBox: parseInt(e.target.value) || 1 }))}
              onFocus={(e) => e.target.select()}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
          </div>

          {/* Localização - Espaço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Espaço
            </label>
            <select
              name="spaceId"
              value={formData.spaceId}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  spaceId: e.target.value,
                  shelfId: '', // Limpa prateleira quando muda espaço
                  sectionId: '' // Limpa seção quando muda espaço
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um espaço</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>

          {/* Localização - Prateleira */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prateleira
            </label>
            <select
              name="shelfId"
              value={formData.shelfId}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  shelfId: e.target.value,
                  sectionId: '' // Limpa seção quando muda prateleira
                }));
              }}
              disabled={!formData.spaceId}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione uma prateleira</option>
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.name}
                </option>
              ))}
            </select>
          </div>

          {/* Localização - Seção */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seção
            </label>
            <select
              name="sectionId"
              value={formData.sectionId}
              onChange={handleChange}
              disabled={!formData.shelfId}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione uma seção</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Produto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Produto
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isAssembly"
                  checked={formData.isAssembly}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  É produto montado? (possui BOM)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPart"
                  checked={formData.isPart}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  É peça/componente?
                </span>
              </label>
            </div>
          </div>

          {/* Custo de Montagem (se isAssembly) */}
          {formData.isAssembly && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo de Montagem (R$)
              </label>
              <input
                type="number"
                step="0.01"
                name="assemblyCost"
                value={formData.assemblyCost / 100}
                onChange={(e) => setFormData({
                  ...formData,
                  assemblyCost: Math.round(parseFloat(e.target.value || '0') * 100)
                })}
                onFocus={(e) => e.target.select()}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Custo adicional para montar este produto
              </p>
            </div>
          )}

          {/* Upload de Imagens */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagens do Produto
            </label>

            {/* Input de arquivo */}
            <div className="mb-3">
              <input
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Validar tamanho (máximo 5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error('Imagem muito grande. Máximo 5MB');
                    return;
                  }

                  // Upload da imagem
                  setUploadingImage(true);
                  try {
                    console.log('📤 Iniciando upload de imagem...', file.name);
                    const formDataUpload = new FormData();
                    formDataUpload.append('image', file);

                    console.log('⏳ Enviando request via axios...');
                    const response = await api.post('/products/upload-image', formDataUpload, {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                      },
                    });

                    console.log('✅ Upload bem-sucedido:', response.data);
                    const imageUrl = response.data.data.url;
                    console.log('🖼️ URL da imagem:', imageUrl);

                    // Adicionar URL à lista
                    setFormData((prev) => {
                      const newImageUrls = [...prev.imageUrls, imageUrl];
                      console.log('📝 Novas URLs de imagens:', newImageUrls);
                      return {
                        ...prev,
                        imageUrls: newImageUrls,
                      };
                    });

                    toast.success('Imagem enviada com sucesso!');

                    // Limpar input
                    e.target.value = '';
                  } catch (error: any) {
                    console.error('❌ Erro ao fazer upload:', error);
                    const errorMessage = error.response?.data?.message || error.message || 'Erro ao enviar imagem';
                    toast.error(errorMessage);
                  } finally {
                    setUploadingImage(false);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {uploadingImage ? (
                <div className="mt-2 flex items-center gap-2 text-blue-600 text-xs">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Enviando imagem... Por favor, aguarde.</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Selecione uma imagem (máximo 5MB, formatos: JPG, PNG, GIF, WebP)
                </p>
              )}
            </div>

            {/* Lista de imagens */}
            {formData.imageUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Imagens adicionadas:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formData.imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNFNUU3RUIiLz48L3N2Zz4=';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newUrls = formData.imageUrls.filter((_, i) => i !== index);
                          setFormData((prev) => ({ ...prev, imageUrls: newUrls }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Descrição Técnica */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Técnica
            </label>
            <textarea
              name="technicalDescription"
              value={formData.technicalDescription}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Especificações técnicas detalhadas..."
            />
          </div>

          {/* Descrição Comercial */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Comercial
            </label>
            <textarea
              name="commercialDescription"
              value={formData.commercialDescription}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição para vendas e marketing..."
            />
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observações gerais sobre o produto..."
            />
          </div>
            </div>

            {/* Botões */}
            <div className="mt-6 flex flex-col gap-4">
              {uploadingImage && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Enviando imagem... Aguarde para salvar o produto.</span>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={createProduct.isPending || updateProduct.isPending || uploadingImage}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createProduct.isPending || updateProduct.isPending
                    ? 'Salvando...'
                    : uploadingImage
                    ? 'Aguarde o upload...'
                    : isEditing
                    ? 'Atualizar'
                    : 'Criar Produto'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="w-full sm:w-auto bg-gray-200 text-gray-700 px-6 py-2 min-h-[44px] rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'bom' ? (
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            {id && <BOMManager productId={id} />}
          </div>
        ) : activeTab === 'suppliers' ? (
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            {id && <SuppliersManager productId={id} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}
