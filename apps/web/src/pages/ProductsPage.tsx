import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useDeleteProduct } from '../hooks/useProducts';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useStorageSpaces, useStorageShelves, useStorageSections } from '../hooks/useStorageLocations';
import { useActiveProductCategories } from '../hooks/useProductCategories';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { AppPage, type Currency } from '@ejr/shared-types';
import { CURRENCY_CONFIG } from '@ejr/shared-types';
import { Pencil, X, MapPin, History } from 'lucide-react';
import { ProductHistoryModal } from '../components/ProductHistoryModal';

export function ProductsPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.PRODUCTS,
    message: 'Você não tem permissão para acessar a página de produtos.'
  });
  if (permissionCheck) return permissionCheck;

  const navigate = useNavigate();
  const { hasActionPermission } = usePagePermissions();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [historyProduct, setHistoryProduct] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [manufacturerInput, setManufacturerInput] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const manufacturerDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce da pesquisa - aguarda 600ms após parar de digitar
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput]);

  // Debounce do fabricante - aguarda 600ms após parar de digitar
  useEffect(() => {
    if (manufacturerDebounceRef.current) {
      clearTimeout(manufacturerDebounceRef.current);
    }
    manufacturerDebounceRef.current = setTimeout(() => {
      setManufacturer(manufacturerInput);
      setPage(1);
    }, 600);

    return () => {
      if (manufacturerDebounceRef.current) {
        clearTimeout(manufacturerDebounceRef.current);
      }
    };
  }, [manufacturerInput]);
  const [status, setStatus] = useState<any>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FINAL' | 'COMPONENT'>('ALL');
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; imageUrl: string; productName: string }>({
    isOpen: false,
    imageUrl: '',
    productName: '',
  });

  // Check permissions
  const canCreate = hasActionPermission('products', 'create');
  const canEdit = hasActionPermission('products', 'edit');
  const canDelete = hasActionPermission('products', 'delete');

  // Show actions column only if user has any action permission
  const showActions = canEdit || canDelete;

  // Load storage locations for display
  const { data: spaces = [] } = useStorageSpaces();
  const { data: allShelves = [] } = useStorageShelves(undefined);
  const { data: allSections = [] } = useStorageSections(undefined);

  // Load product categories for filter
  const { data: categories = [] } = useActiveProductCategories();

  // Load system settings for currency conversion
  const { data: systemSettings } = useSystemSettings();

  // Helper function to get location details
  const getLocationDetails = (product: any) => {
    if (!product.spaceId) return null;

    const space = spaces.find(s => s.id === product.spaceId);
    const shelf = allShelves.find(s => s.id === product.shelfId);
    const section = allSections.find(s => s.id === product.sectionId);

    return {
      space: space?.name,
      shelf: shelf?.name,
      section: section?.name,
      full: [space?.name, shelf?.name, section?.name].filter(Boolean).join(' › '),
      compact: [
        space?.name?.substring(0, 1),
        shelf?.name,
        section?.name
      ].filter(Boolean).join('-')
    };
  };

  // Abreviações inteligentes para categorias
  const abbreviateCategory = (name: string): string => {
    if (!name) return '-';
    const map: Record<string, string> = {
      'acessórios': 'Acess.',
      'acessorios': 'Acess.',
      'acessórios para celular': 'Acess. Cel.',
      'acessórios para notebook': 'Acess. Note.',
      'acessórios para computador': 'Acess. PC',
      'acessórios para tablet': 'Acess. Tab.',
      'acessórios para câmera': 'Acess. Câm.',
      'acessórios para audio': 'Acess. Áudio',
      'acessórios para áudio': 'Acess. Áudio',
      'acessórios para games': 'Acess. Games',
      'acessórios para impressora': 'Acess. Impr.',
      'acessórios automotivos': 'Acess. Auto.',
      'componentes': 'Comp.',
      'componentes eletrônicos': 'Comp. Eletr.',
      'componentes elétricos': 'Comp. Elét.',
      'componentes mecânicos': 'Comp. Mec.',
      'equipamentos': 'Equip.',
      'ferramentas': 'Ferram.',
      'eletrônicos': 'Eletr.',
      'eletrodomésticos': 'Eletrod.',
      'informática': 'Inform.',
      'periféricos': 'Perif.',
      'cabos e conectores': 'Cabos/Con.',
      'armazenamento': 'Armaz.',
      'iluminação': 'Ilum.',
      'segurança': 'Seg.',
      'telecomunicações': 'Telecom.',
      'manutenção': 'Manut.',
    };
    const lower = name.toLowerCase().trim();
    if (map[lower]) return map[lower];
    // Para categorias não mapeadas, abreviar se > 10 caracteres
    if (name.length > 10) return name.substring(0, 9) + '.';
    return name;
  };

  const { data, isLoading, isFetching, error } = useProducts({
    page,
    limit: 25,
    search: search || undefined,
    category: category || undefined,
    manufacturer: manufacturer || undefined,
    status: status || undefined,
    productType: typeFilter === 'ALL' ? undefined : typeFilter,
  });

  // Usar os produtos diretos da API (já filtrados no backend)
  const filteredProducts = data?.data || [];

  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) {
      try {
        await deleteProduct.mutateAsync(id);
      } catch (error: any) {
        console.error('Erro ao excluir produto:', error);
        // Extrair mensagem de erro amigável do backend
        const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao excluir produto. Tente novamente.';
        alert(errorMessage);
      }
    }
  };

  // Converter valor armazenado para valor real na moeda de origem
  const toRealValue = (storedValue: number, sourceCurrency: Currency): number => {
    const config = CURRENCY_CONFIG[sourceCurrency];
    return config.decimals === 0 ? storedValue : storedValue / 100;
  };

  // Converter valor real de uma moeda para outra via BRL como intermediário
  const convertToTarget = (realValue: number, sourceCurrency: Currency, targetCurrency: Currency): number => {
    if (!systemSettings || sourceCurrency === targetCurrency) return realValue;

    // Converter para BRL primeiro
    let valueInBRL: number;
    if (sourceCurrency === 'BRL') {
      valueInBRL = realValue;
    } else if (sourceCurrency === 'USD') {
      valueInBRL = systemSettings.exchangeRateBrlToUsd > 0 ? realValue / systemSettings.exchangeRateBrlToUsd : 0;
    } else if (sourceCurrency === 'PYG') {
      valueInBRL = systemSettings.exchangeRateBrlToPyg > 0 ? realValue / systemSettings.exchangeRateBrlToPyg : 0;
    } else {
      return realValue;
    }

    // Converter de BRL para moeda de destino
    if (targetCurrency === 'BRL') return valueInBRL;
    if (targetCurrency === 'USD') return valueInBRL * systemSettings.exchangeRateBrlToUsd;
    if (targetCurrency === 'PYG') return valueInBRL * systemSettings.exchangeRateBrlToPyg;
    return valueInBRL;
  };

  // Formatar valor em uma moeda específica
  const formatCurrency = (value: number, currency: Currency): string => {
    const config = CURRENCY_CONFIG[currency];
    const decimals = config.decimals;

    let formattedValue = value.toFixed(decimals);
    const parts = formattedValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    const integerWithSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (decimals > 0 && decimalPart) {
      formattedValue = `${integerWithSeparator},${decimalPart}`;
    } else {
      formattedValue = integerWithSeparator;
    }

    return `${config.symbol} ${formattedValue}`;
  };

  // Renderizar preços em múltiplas moedas, respeitando a moeda de origem do produto
  const renderMultiCurrencyPrice = (storedValue: number, sourceCurrency?: Currency) => {
    const srcCur = sourceCurrency || (systemSettings?.defaultCurrency as Currency) || 'BRL';
    const realValue = toRealValue(storedValue, srcCur);

    if (!systemSettings) {
      return (
        <span className="text-sm text-gray-900">
          {formatCurrency(realValue, srcCur)}
        </span>
      );
    }

    const defaultCurrency = systemSettings.defaultCurrency;
    const enabledCurrencies = systemSettings.enabledCurrencies;

    if (enabledCurrencies.length === 0) {
      return <span className="text-sm text-gray-500">-</span>;
    }

    const activePrices = enabledCurrencies.map(currency => {
      const converted = convertToTarget(realValue, srcCur, currency);
      return {
        currency,
        value: converted,
        formatted: formatCurrency(converted, currency),
        isDefault: currency === defaultCurrency,
      };
    });

    const mainPrice = activePrices.find(p => p.isDefault) || activePrices[0];
    const otherPrices = activePrices.filter(p => p.currency !== mainPrice.currency);

    return (
      <span
        className="font-semibold text-gray-900 tabular-nums whitespace-nowrap"
        title={otherPrices.length ? [mainPrice, ...otherPrices].map((p) => p.formatted).join(' · ') : undefined}
      >
        {mainPrice.formatted}
      </span>
    );
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Erro ao carregar produtos</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Produtos</h1>
        {canCreate && (
          <button
            onClick={() => navigate('/products/new')}
            className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Novo Produto
          </button>
        )}
      </div>

      {/* Filtros de Tipo */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => { setTypeFilter('ALL'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            typeFilter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => { setTypeFilter('FINAL'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            typeFilter === 'FINAL'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Produtos Finais
        </button>
        <button
          onClick={() => { setTypeFilter('COMPONENT'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            typeFilter === 'COMPONENT'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Componentes
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-xl shadow-sm border mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nome, código ou cód. fornecedor..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchInput !== search && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Indústria
            </label>
            <input
              type="text"
              value={manufacturerInput}
              onChange={(e) => setManufacturerInput(e.target.value)}
              placeholder="Filtrar por indústria..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="DEVELOPMENT">Em Desenvolvimento</option>
              <option value="PRODUCTION">Em Produção</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="DISCONTINUED">Descontinuado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela — compacta, 1 linha por produto */}
      <div className={`bg-white rounded-xl shadow-sm border relative ${isFetching ? 'opacity-60' : ''}`}>
        {isFetching && (
          <div className="absolute top-2 right-2 z-10">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-[13px]">
          <colgroup>
            <col className="w-[64px]" />
            <col className="hidden xl:table-column w-[110px]" />
            <col className="w-[48px]" />
            <col />
            <col className="hidden xl:table-column w-[130px]" />
            <col className="w-[112px]" />
            <col className="w-[112px]" />
            <col className="w-[84px]" />
            <col className="hidden xl:table-column w-[40px]" />
            {showActions && <col className="w-[96px]" />}
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Cód</th>
              <th className="hidden xl:table-cell px-3 py-2 text-left" title="Código Fornecedor">Cód. Forn.</th>
              <th className="px-2 py-2 text-left">Img</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="hidden xl:table-cell px-3 py-2 text-left">Indústria</th>
              <th className="px-3 py-2 text-right">Atacado</th>
              <th className="px-3 py-2 text-right">Varejo</th>
              <th className="px-3 py-2 text-right" title="Estoque atual / mínimo">Estoque</th>
              <th className="hidden xl:table-cell px-2 py-2 text-center" title="Localização">
                <MapPin className="w-3.5 h-3.5 inline-block" />
              </th>
              {showActions && (
                <th className="px-3 py-2 text-right sticky right-0 bg-gray-50">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => {
              const location = getLocationDetails(product);
              return (
              <tr key={product.id} className="group hover:bg-indigo-50/40 transition-colors">
                <td className="px-3 py-1.5 whitespace-nowrap font-semibold text-gray-900 tabular-nums" title={product.code}>
                  {product.code.replace('PROD-', '')}
                </td>
                <td className="hidden xl:table-cell px-3 py-1.5 text-gray-500 truncate" title={product.factoryCode || undefined}>
                  {product.factoryCode || '-'}
                </td>
                <td className="px-2 py-1.5">
                  {product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0] ? (
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      loading="lazy"
                      className="w-8 h-8 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => setImageModal({ isOpen: true, imageUrl: product.imageUrls[0], productName: product.name })}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMjQgMjZDMjYuMjA5MSAyNiAyOCAyNC4yMDkxIDI4IDIyQzI4IDE5Ljc5MDkgMjYuMjA5MSAxOCAyNCAxOEMyMS43OTA5IDE4IDIwIDE5Ljc5MDkgMjAgMjJDMjAgMjQuMjA5MSAyMS43OTA5IDI2IDI0IDI2WiIgZmlsbD0iIzlDQTNBRiIvPjxwYXRoIGQ9Ik0zMiAzMkwzNiAzNkgyMEwyNCAzMEwyOCAzNEwzMiAzMloiIGZpbGw9IiM5Q0EzQUYiLz48L3N2Zz4=';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5 text-gray-900 font-medium truncate" title={[product.name, product.manufacturer, product.factoryCode && `Cód. forn. ${product.factoryCode}`].filter(Boolean).join(' · ')}>
                  {product.name}
                </td>
                <td className="hidden xl:table-cell px-3 py-1.5 text-gray-500 truncate" title={product.manufacturer || undefined}>
                  {product.manufacturer || '-'}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {renderMultiCurrencyPrice(product.wholesalePrice || 0, product.wholesalePriceCurrency)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {renderMultiCurrencyPrice(product.salePrice, product.salePriceCurrency)}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-right tabular-nums" title={`Estoque ${product.currentStock} / mínimo ${product.minimumStock}${location ? ` · ${location.full}` : ''}`}>
                  <span
                    className={
                      product.currentStock <= product.minimumStock
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-900'
                    }
                  >
                    {product.currentStock}
                  </span>
                  <span className="text-gray-400 mx-0.5">/</span>
                  <span className="text-gray-500">{product.minimumStock}</span>
                </td>
                <td className="hidden xl:table-cell px-2 py-1.5 text-center">
                  {!location ? (
                    <span className="text-gray-400 text-xs">-</span>
                  ) : (
                    <div className="inline-block" title={location.full}>
                      <MapPin className="w-3.5 h-3.5 text-blue-600 mx-auto cursor-help" />
                    </div>
                  )}
                </td>
                {showActions && (
                  <td className="px-3 py-1.5 sticky right-0 bg-white group-hover:bg-indigo-50/40">
                    <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                      <button
                        onClick={() => setHistoryProduct({ id: product.id, name: product.name })}
                        className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Histórico de compra e venda"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Paginação */}
      {data?.pagination && data.pagination.totalPages > 1 && (() => {
        const { page: currentPage, totalPages, total } = data.pagination;
        const startItem = (currentPage - 1) * 25 + 1;
        const endItem = Math.min(currentPage * 25, total);

        // Gerar lista de páginas visíveis
        const getVisiblePages = () => {
          const pages: (number | '...')[] = [];
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
          } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
          }
          return pages;
        };

        return (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <div className="text-sm text-gray-500">
              {startItem}–{endItem} de {total} produtos
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="p-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Primeira página"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>

              {getVisiblePages().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-gray-400 text-sm">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[36px] h-9 text-sm rounded font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Próxima página"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Última página"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>

              <div className="ml-2 flex items-center gap-1.5 border-l pl-3">
                <span className="text-sm text-gray-500 whitespace-nowrap">Ir para</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  className="w-14 h-9 px-2 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt((e.target as HTMLInputElement).value);
                      if (val >= 1 && val <= totalPages) {
                        setPage(val);
                        (e.target as HTMLInputElement).value = '';
                        (e.target as HTMLInputElement).blur();
                      }
                    }
                  }}
                  placeholder={String(currentPage)}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Imagem */}
      {imageModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModal({ isOpen: false, imageUrl: '', productName: '' })}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Botão fechar */}
            <button
              onClick={() => setImageModal({ isOpen: false, imageUrl: '', productName: '' })}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
              title="Fechar"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Nome do produto */}
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{imageModal.productName}</h3>
            </div>

            {/* Imagem */}
            <div className="p-4 flex items-center justify-center bg-gray-100">
              <img
                src={imageModal.imageUrl}
                alt={imageModal.productName}
                className="max-w-full max-h-[70vh] object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}

      {historyProduct && (
        <ProductHistoryModal
          productId={historyProduct.id}
          productName={historyProduct.name}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </div>
  );
}
