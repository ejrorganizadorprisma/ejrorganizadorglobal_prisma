import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSale } from '../hooks/useSales';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { useServices } from '../hooks/useServices';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { PaymentMethod } from '@ejr/shared-types';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  Wrench,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  Receipt,
  Minus,
  ShoppingCart,
  X,
  ChevronDown,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Keyboard,
  Lock,
} from 'lucide-react';
import { CurrencyInput } from '../components/CurrencyInput';

type ItemType = 'PRODUCT' | 'SERVICE';

type FormItem = {
  itemType: ItemType;
  productId?: string;
  productName?: string;
  productCode?: string;
  serviceId?: string;
  serviceName?: string;
  serviceDescription?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  stock?: number;
};

const paymentMethods: { value: PaymentMethod; label: string; icon: any; shortcut: string }[] = [
  { value: PaymentMethod.PIX, label: 'PIX', icon: Smartphone, shortcut: '1' },
  { value: PaymentMethod.CASH, label: 'Dinheiro', icon: Banknote, shortcut: '2' },
  { value: PaymentMethod.CREDIT_CARD, label: 'Credito', icon: CreditCard, shortcut: '3' },
  { value: PaymentMethod.DEBIT_CARD, label: 'Debito', icon: CreditCard, shortcut: '4' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Transferencia', icon: Building, shortcut: '5' },
  { value: PaymentMethod.BOLETO, label: 'Boleto', icon: Receipt, shortcut: '6' },
  { value: PaymentMethod.CHECK, label: 'Cheque', icon: Receipt, shortcut: '7' },
  { value: PaymentMethod.PROMISSORY, label: 'Promissoria', icon: Receipt, shortcut: '8' },
  { value: PaymentMethod.OTHER, label: 'Outro', icon: CreditCard, shortcut: '9' },
];

export function SaleFormPage() {
  const navigate = useNavigate();
  const createSale = useCreateSale();
  const { formatPrice, defaultCurrency } = useFormatPrice();

  const { data: customersData } = useCustomers({ page: 1, limit: 500 });
  const { data: productsData } = useProducts({ page: 1, limit: 500 });
  const { data: servicesData } = useServices({ page: 1, limit: 500, isActive: true });

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [installments, setInstallments] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditDays, setCreditDays] = useState(30);

  // Quick-add search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [showSearch, setShowSearch] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(0);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerHighlight, setCustomerHighlight] = useState(0);

  // Refs for keyboard flow
  const customerInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const creditDaysInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const customerContainerRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customersData?.data?.find((c: any) => c.id === customerId);

  const customerAllowedMethods = useMemo(() => {
    return selectedCustomer?.allowedPaymentMethods || ['CASH'];
  }, [selectedCustomer]);

  // Auto-select first allowed method when customer changes
  useEffect(() => {
    if (selectedCustomer && !customerAllowedMethods.includes(paymentMethod)) {
      const firstAllowed = paymentMethods.find(pm => customerAllowedMethods.includes(pm.value));
      if (firstAllowed) {
        setPaymentMethod(firstAllowed.value);
      }
    }
  }, [selectedCustomer, customerAllowedMethods]);

  // Auto-focus customer input on mount
  useEffect(() => {
    if (!customerId) {
      setTimeout(() => customerInputRef.current?.focus(), 100);
    }
  }, []);

  // Auto-focus product search after customer is selected
  useEffect(() => {
    if (customerId) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [customerId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // F2 or Ctrl+Enter = finalize sale
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleSubmit();
        return;
      }
      // Escape = go back to search or close
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          searchInputRef.current?.focus();
        } else if (showCustomerDropdown) {
          setShowCustomerDropdown(false);
          customerInputRef.current?.focus();
        }
        return;
      }
      // F4 = focus product search
      if (e.key === 'F4') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSearch, showCustomerDropdown, items, customerId]);

  // Filter products/services by search
  const filteredProducts = useMemo(() => {
    if (!productsData?.data) return [];
    if (!searchQuery.trim()) return productsData.data;
    const q = searchQuery.toLowerCase();
    return productsData.data.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.factoryCode?.toLowerCase().includes(q)
    );
  }, [productsData?.data, searchQuery]);

  const filteredServices = useMemo(() => {
    if (!servicesData?.data) return [];
    if (!searchQuery.trim()) return servicesData.data;
    const q = searchQuery.toLowerCase();
    return servicesData.data.filter((s: any) =>
      s.name.toLowerCase().includes(q)
    );
  }, [servicesData?.data, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!customersData?.data) return [];
    if (!customerSearch.trim()) return customersData.data;
    const q = customerSearch.toLowerCase();
    return customersData.data.filter((c: any) =>
      c.name.toLowerCase().includes(q) ||
      c.document?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customersData?.data, customerSearch]);

  // Current search results list
  const currentSearchResults = searchType === 'PRODUCT'
    ? filteredProducts.slice(0, 20)
    : filteredServices.slice(0, 20);

  // Reset highlight when search changes
  useEffect(() => { setSearchHighlight(0); }, [searchQuery, searchType]);
  useEffect(() => { setCustomerHighlight(0); }, [customerSearch]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (showSearch && searchDropdownRef.current) {
      const items = searchDropdownRef.current.querySelectorAll('[data-search-item]');
      items[searchHighlight]?.scrollIntoView({ block: 'nearest' });
    }
  }, [searchHighlight, showSearch]);

  useEffect(() => {
    if (showCustomerDropdown && customerDropdownRef.current) {
      const items = customerDropdownRef.current.querySelectorAll('[data-customer-item]');
      items[customerHighlight]?.scrollIntoView({ block: 'nearest' });
    }
  }, [customerHighlight, showCustomerDropdown]);

  // Add product to items
  const addProduct = useCallback((product: any) => {
    const existingIndex = items.findIndex(
      (i) => i.itemType === 'PRODUCT' && i.productId === product.id
    );

    if (existingIndex >= 0) {
      setItems((prev) => {
        const updated = { ...prev[existingIndex], quantity: prev[existingIndex].quantity + 1 };
        const rest = prev.filter((_, i) => i !== existingIndex);
        return [updated, ...rest];
      });
      toast.success(`${product.name} +1`);
    } else {
      setItems((prev) => [
        {
          itemType: 'PRODUCT',
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: 1,
          unitPrice: product.salePrice || 0,
          discount: 0,
          stock: product.currentStock,
        },
        ...prev,
      ]);
      toast.success(`${product.name} adicionado`);
    }

    setSearchQuery('');
    setShowSearch(false);
    // Keep focus on search for next item
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [items]);

  // Add service to items
  const addService = useCallback((service: any) => {
    setItems((prev) => [
      {
        itemType: 'SERVICE',
        serviceId: service.id,
        serviceName: service.name,
        serviceDescription: service.description || '',
        quantity: 1,
        unitPrice: service.defaultPrice || 0,
        discount: 0,
      },
      ...prev,
    ]);
    setSearchQuery('');
    setShowSearch(false);
    toast.success(`${service.name} adicionado`);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const updateItemQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Compute due date from days offset
  const computeDueDate = (days: number): string => {
    const base = saleDate ? new Date(saleDate + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + days);
    return base.toISOString().split('T')[0];
  };

  // Handle payment method selection
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (!customerAllowedMethods.includes(method)) {
      toast.error('Método de pagamento não autorizado para este cliente');
      return;
    }
    setPaymentMethod(method);
    if (method === PaymentMethod.CREDIT_CARD) {
      if (!customerAllowedMethods.includes(PaymentMethod.CREDIT_CARD)) {
        toast.error('Método de pagamento não autorizado para este cliente');
        return;
      }
      setShowCreditModal(true);
      setCreditDays(30);
      setDueDate(computeDueDate(30));
      setTimeout(() => creditDaysInputRef.current?.focus(), 100);
    }
  };

  // Confirm credit modal
  const confirmCreditModal = () => {
    const maxDays = selectedCustomer?.creditMaxDays;
    if (maxDays && creditDays > maxDays) {
      toast.error(`Prazo maximo para este cliente: ${maxDays} dias`);
      setCreditDays(maxDays);
      setDueDate(computeDueDate(maxDays));
      return;
    }
    setShowCreditModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // Select customer
  const selectCustomer = useCallback((customer: any) => {
    setCustomerId(customer.id);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    // Auto-focus product search
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Select search result
  const selectSearchResult = useCallback((index: number) => {
    const item = currentSearchResults[index];
    if (!item) return;
    if (searchType === 'PRODUCT') {
      addProduct(item);
    } else {
      addService(item);
    }
  }, [currentSearchResults, searchType, addProduct, addService]);

  // Customer keyboard handler
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    const list = filteredCustomers.slice(0, 20);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowCustomerDropdown(true);
      setCustomerHighlight((prev) => Math.min(prev + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerHighlight((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showCustomerDropdown && list[customerHighlight]) {
        selectCustomer(list[customerHighlight]);
      } else if (list.length > 0) {
        setShowCustomerDropdown(true);
      }
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
    } else if (e.key === 'Tab' && showCustomerDropdown && list[customerHighlight]) {
      e.preventDefault();
      selectCustomer(list[customerHighlight]);
    }
  };

  // Search keyboard handler
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const list = currentSearchResults;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSearch(true);
      setSearchHighlight((prev) => Math.min(prev + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchHighlight((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showSearch && list[searchHighlight]) {
        selectSearchResult(searchHighlight);
      } else if (list.length > 0) {
        setShowSearch(true);
      }
    } else if (e.key === 'Escape') {
      if (searchQuery) {
        setSearchQuery('');
        setShowSearch(false);
      } else {
        setShowSearch(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey && showSearch && list[searchHighlight]) {
      e.preventDefault();
      selectSearchResult(searchHighlight);
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
    0
  );
  const total = Math.max(0, subtotal - discount);
  const installmentValue = installments > 0 ? Math.floor(total / installments) : total;

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Selecione um cliente');
      customerInputRef.current?.focus();
      return;
    }
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item');
      searchInputRef.current?.focus();
      return;
    }

    for (const item of items) {
      if (item.itemType === 'PRODUCT' && !item.productId) {
        toast.error('Item de produto invalido');
        return;
      }
      if (item.itemType === 'SERVICE' && !item.serviceName?.trim()) {
        toast.error('Item de servico invalido');
        return;
      }
    }

    try {
      const payload = {
        customerId,
        saleDate,
        dueDate: dueDate || undefined,
        discount,
        installments,
        paymentMethod,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        items: items.map((item) => {
          if (item.itemType === 'PRODUCT') {
            return {
              itemType: 'PRODUCT' as const,
              productId: item.productId!,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
            };
          } else {
            return {
              itemType: 'SERVICE' as const,
              serviceName: item.serviceName!,
              serviceDescription: item.serviceDescription || undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
            };
          }
        }),
      };

      const result = await createSale.mutateAsync(payload);
      toast.success('Venda criada com sucesso!');
      navigate(`/sales/${result.data?.id || ''}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Erro ao criar venda');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/sales')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              tabIndex={-1}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Nova Venda</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Keyboard hints */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">F2</kbd>
                Finalizar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">F4</kbd>
                Buscar
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={createSale.isPending || items.length === 0}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm flex items-center gap-2"
              tabIndex={-1}
            >
              {createSale.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Finalizar
                  <kbd className="hidden sm:inline px-1 py-0.5 bg-blue-500 rounded text-[10px] font-mono">F2</kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Items & Search */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Cliente</span>
                {!selectedCustomer && (
                  <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" /> Enter para selecionar
                  </span>
                )}
              </div>

              <div ref={customerContainerRef} className="relative">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                    <div>
                      <span className="font-medium text-blue-900">{selectedCustomer.name}</span>
                      {selectedCustomer.document && (
                        <span className="text-sm text-blue-600 ml-2">{selectedCustomer.document}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setCustomerId('');
                        setCustomerSearch('');
                        setTimeout(() => customerInputRef.current?.focus(), 50);
                      }}
                      className="p-1 hover:bg-blue-100 rounded"
                      tabIndex={-1}
                    >
                      <X className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        ref={customerInputRef}
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                          setCustomerHighlight(0);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onKeyDown={handleCustomerKeyDown}
                        placeholder="Digite o nome do cliente..."
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoComplete="off"
                      />
                    </div>
                    {showCustomerDropdown && (
                      <div
                        ref={customerDropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        {filteredCustomers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">Nenhum cliente encontrado</div>
                        ) : (
                          filteredCustomers.slice(0, 20).map((c: any, idx: number) => (
                            <button
                              key={c.id}
                              type="button"
                              data-customer-item
                              onClick={() => selectCustomer(c)}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm border-b border-gray-50 last:border-0 transition-colors ${
                                idx === customerHighlight
                                  ? 'bg-blue-50 text-blue-900'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{c.name}</span>
                              <div className="flex items-center gap-2">
                                {c.document && <span className="text-gray-400 text-xs">{c.document}</span>}
                                {idx === customerHighlight && (
                                  <CornerDownLeft className="w-3 h-3 text-blue-400" />
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick Add Search */}
            <div ref={searchContainerRef} className="relative">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Adicionar itens</span>
                  <div className="flex ml-auto bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => { setSearchType('PRODUCT'); searchInputRef.current?.focus(); }}
                      tabIndex={-1}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        searchType === 'PRODUCT'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Package className="w-3 h-3 inline mr-1" />
                      Produtos
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSearchType('SERVICE'); searchInputRef.current?.focus(); }}
                      tabIndex={-1}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        searchType === 'SERVICE'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Wrench className="w-3 h-3 inline mr-1" />
                      Servicos
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearch(true);
                      setSearchHighlight(0);
                    }}
                    onFocus={() => setShowSearch(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchType === 'PRODUCT' ? 'Buscar produto por nome ou codigo...' : 'Buscar servico...'}
                    className="w-full pl-10 pr-20 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-300">
                    <ArrowUp className="w-3 h-3" />
                    <ArrowDown className="w-3 h-3" />
                    <CornerDownLeft className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Search Results Dropdown — opens upward so it won't cover the items list */}
              {showSearch && (
                <div
                  ref={searchDropdownRef}
                  className="absolute z-10 w-full bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
                >
                  {currentSearchResults.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                      {searchQuery ? 'Nenhum resultado encontrado' : 'Digite para buscar...'}
                    </div>
                  ) : (
                    currentSearchResults.map((item: any, idx: number) => (
                      <button
                        key={item.id}
                        type="button"
                        data-search-item
                        onClick={() => selectSearchResult(idx)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors ${
                          idx === searchHighlight
                            ? searchType === 'PRODUCT' ? 'bg-blue-50' : 'bg-purple-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${
                          searchType === 'PRODUCT' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {searchType === 'PRODUCT' ? (
                            <Package className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Wrench className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {searchType === 'PRODUCT' ? item.code : item.description || ''}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">
                              {formatPrice(searchType === 'PRODUCT' ? (item.salePrice || 0) : (item.defaultPrice || 0))}
                            </p>
                            {searchType === 'PRODUCT' && (
                              <p className="text-xs text-gray-400">Est: {item.currentStock ?? 0}</p>
                            )}
                          </div>
                          {idx === searchHighlight && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    Itens ({items.length})
                  </span>
                </div>
                {items.length > 0 && (
                  <span className="text-sm font-bold text-gray-900">{formatPrice(subtotal)}</span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Busque e adicione produtos ou servicos</p>
                  <p className="text-xs text-gray-300 mt-1 flex items-center justify-center gap-1">
                    <Keyboard className="w-3 h-3" />
                    Use as setas e Enter para adicionar rapidamente
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`p-1.5 rounded-lg mt-0.5 ${
                          item.itemType === 'PRODUCT' ? 'bg-blue-50' : 'bg-purple-50'
                        }`}>
                          {item.itemType === 'PRODUCT' ? (
                            <Package className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Wrench className="w-4 h-4 text-purple-600" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {item.itemType === 'PRODUCT' ? item.productName : item.serviceName}
                              </p>
                              {item.productCode && (
                                <p className="text-xs text-gray-400">{item.productCode}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              tabIndex={-1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {/* Quantity controls */}
                            <div className="flex items-center border border-gray-200 rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateItemQty(index, -1)}
                                className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors"
                                tabIndex={-1}
                              >
                                <Minus className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    searchInputRef.current?.focus();
                                  }
                                }}
                                className="w-14 text-center text-sm font-medium border-x border-gray-200 py-1.5 outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 rounded-none cursor-text"
                                min="1"
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(index, 1)}
                                className="p-1.5 hover:bg-gray-100 rounded-r-lg transition-colors"
                                tabIndex={-1}
                              >
                                <Plus className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            </div>

                            {/* Unit price */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">x</span>
                              <CurrencyInput
                                value={item.unitPrice}
                                currency={defaultCurrency}
                                onChange={(value) => updateItem(index, 'unitPrice', value)}
                                className="!w-28 !py-1 !text-sm !border-gray-200 !rounded-lg"
                              />
                            </div>

                            {/* Item total */}
                            <span className="text-sm font-bold text-gray-900 ml-auto">
                              {formatPrice(item.quantity * item.unitPrice - item.discount)}
                            </span>
                          </div>

                          {item.stock !== undefined && item.stock < item.quantity && (
                            <p className="text-xs text-amber-600 mt-1">
                              Estoque: {item.stock} (abaixo da quantidade)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Payment & Totals */}
          <div className="space-y-4">
            {/* Sale Date */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data da venda</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    tabIndex={-1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <span className="text-sm font-semibold text-gray-700 mb-3 block">Pagamento</span>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {paymentMethods.slice(0, 6).map((pm) => {
                  const Icon = pm.icon;
                  const isAllowed = customerAllowedMethods.includes(pm.value);
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => handlePaymentMethodChange(pm.value)}
                      disabled={!isAllowed}
                      tabIndex={-1}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all relative ${
                        !isAllowed
                          ? 'border-gray-200 text-gray-300 opacity-40 cursor-not-allowed bg-gray-50'
                          : paymentMethod === pm.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {!isAllowed && (
                          <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-gray-400" />
                        )}
                      </div>
                      {pm.label}
                    </button>
                  );
                })}
              </div>

              {/* More payment methods */}
              {paymentMethods.length > 6 && (
                <select
                  value={paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white mb-3"
                  tabIndex={-1}
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.value} value={pm.value} disabled={!customerAllowedMethods.includes(pm.value)}>
                      {pm.label}{!customerAllowedMethods.includes(pm.value) ? ' (bloqueado)' : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Installments */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Parcelas</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 6, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(n)}
                      tabIndex={-1}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        installments === n
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {![1, 2, 3, 4, 6, 12].includes(installments) && (
                  <input
                    type="number"
                    min="1"
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                    className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    tabIndex={-1}
                  />
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-700">{formatPrice(subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-500">Desconto</span>
                  <CurrencyInput
                    value={discount}
                    currency={defaultCurrency}
                    onChange={(value) => setDiscount(value)}
                    className="!w-28 !py-1 !text-sm !text-right !border-gray-200 !rounded-lg"
                  />
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-blue-600">{formatPrice(total)}</span>
                  </div>
                  {installments > 1 && (
                    <p className="text-right text-sm text-gray-500 mt-1">
                      {installments}x de {formatPrice(installmentValue)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes toggle */}
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              tabIndex={-1}
              className="w-full text-left bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Observacoes</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
            </button>

            {showNotes && (
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Observacoes do cliente</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Visiveis no documento..."
                    tabIndex={-1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Observacoes internas</label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Apenas uso interno..."
                    tabIndex={-1}
                  />
                </div>
              </div>
            )}

            {/* Mobile Submit */}
            <div className="lg:hidden">
              <button
                onClick={handleSubmit}
                disabled={createSale.isPending || items.length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {createSale.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Finalizar Venda - {formatPrice(total)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Card Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmCreditModal();
              } else if (e.key === 'Escape') {
                setShowCreditModal(false);
              }
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-lg font-bold text-white">Venda a Credito</h3>
                  <p className="text-blue-100 text-sm">Configure o prazo e vencimento</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Quick days selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prazo (dias)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[7, 14, 30, 60].map((d) => {
                    const maxDays = selectedCustomer?.creditMaxDays;
                    const isOverLimit = maxDays ? d > maxDays : false;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={isOverLimit}
                        onClick={() => {
                          setCreditDays(d);
                          setDueDate(computeDueDate(d));
                        }}
                        className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                          isOverLimit
                            ? 'border-gray-200 text-gray-300 opacity-40 cursor-not-allowed'
                            : creditDays === d
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {d} dias
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={creditDaysInputRef}
                  type="number"
                  min="1"
                  max={selectedCustomer?.creditMaxDays || undefined}
                  value={creditDays}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const days = Math.min(parseInt(e.target.value) || 1, selectedCustomer?.creditMaxDays || 9999);
                    setCreditDays(days);
                    setDueDate(computeDueDate(days));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Dias para vencimento"
                />
                {selectedCustomer?.creditMaxDays && (
                  <p className="text-xs text-amber-600 mt-1">
                    Prazo maximo permitido para este cliente: {selectedCustomer.creditMaxDays} dias
                  </p>
                )}
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data de Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      const base = saleDate ? new Date(saleDate + 'T12:00:00') : new Date();
                      const target = new Date(e.target.value + 'T12:00:00');
                      const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
                      const maxDays = selectedCustomer?.creditMaxDays;
                      if (maxDays && diffDays > maxDays) {
                        toast.error(`Prazo maximo para este cliente: ${maxDays} dias`);
                        const clamped = Math.min(diffDays, maxDays);
                        setCreditDays(clamped);
                        setDueDate(computeDueDate(clamped));
                        return;
                      }
                      setCreditDays(Math.max(1, diffDays));
                    }
                    setDueDate(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {dueDate && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Vencimento: {new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Installments in modal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 6, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(n)}
                      className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                        installments === n
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {installments > 1 && total > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {installments}x de <span className="font-semibold">{formatPrice(Math.floor(total / installments))}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCreditModal}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                Confirmar
                <kbd className="px-1 py-0.5 bg-blue-500 rounded text-[10px] font-mono">Enter</kbd>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
