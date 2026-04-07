import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuote, useCreateQuote, useUpdateQuote } from '../hooks/useQuotes';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { useServices } from '../hooks/useServices';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { QuoteItemType } from '@ejr/shared-types';
import { toast } from 'sonner';
import { CurrencyInput } from '../components/CurrencyInput';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { generateQuotePDF, type QuotePdfMode } from '../utils/quotePdfGenerator';
import { api } from '../lib/api';
import { Search, Package, AlertTriangle, Trash2, Plus, Wrench, FileText, Printer } from 'lucide-react';

type FormItem = {
  itemType: QuoteItemType;
  productId?: string;
  productName?: string;
  productCode?: string;
  serviceId?: string;
  serviceName?: string;
  serviceDescription?: string;
  quantity: number;
  unitPrice: number;
};

export function QuoteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: quote } = useQuote(id || '', { enabled: isEditing });
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();

  const { data: customersData } = useCustomers({ page: 1, limit: 100 });
  const { data: servicesData } = useServices({ page: 1, limit: 100, isActive: true });
  const { data: systemSettings } = useSystemSettings();
  const defaultCurrency = systemSettings?.defaultCurrency || 'BRL';
  const { formatPrice } = useFormatPrice();
  const { data: documentSettings } = useDefaultDocumentSettings();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleGeneratePdf = async (mode: QuotePdfMode) => {
    if (!id) return;
    setPdfLoading(true);
    try {
      const { data: quoteResp } = await api.get(`/quotes/${id}`);
      const fullQuote = quoteResp.data;
      if (!fullQuote?.customer) {
        toast.error('Dados do cliente nao disponiveis');
        return;
      }
      const signerInfo = {
        name: documentSettings?.signatureName || 'Responsavel',
        role: documentSettings?.signatureRole || 'Diretor',
      };
      generateQuotePDF(fullQuote, fullQuote.customer, signerInfo, documentSettings, defaultCurrency, mode);
      toast.success(mode === 'print' ? 'PDF para impressao gerado' : 'PDF elegante gerado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.response?.data?.message || err?.message || 'desconhecido'));
    } finally {
      setPdfLoading(false);
    }
  };

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addQty, setAddQty] = useState(1);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Service add state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceId: '',
    serviceName: '',
    serviceDescription: '',
    quantity: 1,
    unitPrice: 0,
  });

  const { data: productsData, isLoading: loadingProducts } = useProducts({
    page: 1,
    limit: 20,
    search: productSearch.trim() || undefined,
  });
  const products = productsData?.data || [];

  const [formData, setFormData] = useState({
    customerId: '',
    discount: 0,
    validUntil: '',
    notes: '',
    items: [] as FormItem[],
  });

  useEffect(() => {
    if (quote) {
      setFormData({
        customerId: quote.customerId,
        discount: quote.discount,
        validUntil: new Date(quote.validUntil).toISOString().split('T')[0],
        notes: quote.notes || '',
        items: quote.items.map(item => ({
          itemType: item.itemType,
          productId: item.productId,
          productName: item.product?.name,
          productCode: item.product?.code,
          serviceId: undefined,
          serviceName: item.serviceName,
          serviceDescription: item.serviceDescription,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
  }, [quote]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select a product from the dropdown
  const handleProductSelect = (product: any) => {
    setPendingProduct(product);
    setProductSearch(product.name);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setAddQty(1);
    // Focus quantity input
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  // Add the pending product as an item
  const handleAddProduct = () => {
    if (!pendingProduct) return;
    if (addQty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemType: QuoteItemType.PRODUCT,
        productId: pendingProduct.id,
        productName: pendingProduct.name,
        productCode: pendingProduct.code,
        quantity: addQty,
        unitPrice: pendingProduct.salePrice || 0,
      }],
    }));

    // Reset
    setPendingProduct(null);
    setProductSearch('');
    setAddQty(1);
    toast.success(`${pendingProduct.name} adicionado`);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // Keyboard nav for product search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') {
        setShowDropdown(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < products.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && products[selectedIndex]) {
          handleProductSelect(products[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Enter on quantity field → add item
  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProduct();
    }
  };

  // Add service item
  const handleAddService = () => {
    if (!serviceForm.serviceName.trim()) {
      toast.error('Nome do serviço é obrigatório');
      return;
    }
    if (serviceForm.quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemType: QuoteItemType.SERVICE,
        serviceName: serviceForm.serviceName,
        serviceDescription: serviceForm.serviceDescription,
        quantity: serviceForm.quantity,
        unitPrice: serviceForm.unitPrice,
      }],
    }));
    setServiceForm({ serviceId: '', serviceName: '', serviceDescription: '', quantity: 1, unitPrice: 0 });
    setShowServiceForm(false);
    toast.success('Serviço adicionado');
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = servicesData?.data.find((s: any) => s.id === serviceId);
    if (service) {
      setServiceForm(prev => ({
        ...prev,
        serviceId,
        serviceName: service.name,
        serviceDescription: service.description || '',
        unitPrice: service.defaultPrice || 0,
      }));
    }
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - formData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || formData.customerId.trim() === '') {
      toast.error('Selecione um cliente');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    for (const item of formData.items) {
      if (item.itemType === QuoteItemType.PRODUCT && !item.productId) {
        toast.error('Todos os itens de produto devem ter um produto selecionado');
        return;
      }
      if (item.itemType === QuoteItemType.SERVICE && !item.serviceName?.trim()) {
        toast.error('Todos os itens de serviço devem ter um nome');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }
      if (item.unitPrice < 0) {
        toast.error('Preço unitário não pode ser negativo');
        return;
      }
    }

    if (!formData.validUntil) {
      toast.error('Defina a data de validade');
      return;
    }

    try {
      const payload = {
        customerId: formData.customerId,
        discount: formData.discount,
        validUntil: new Date(formData.validUntil).toISOString(),
        notes: formData.notes,
        items: formData.items.map(item => {
          if (item.itemType === QuoteItemType.PRODUCT) {
            return {
              itemType: QuoteItemType.PRODUCT,
              productId: item.productId!,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            };
          } else {
            return {
              itemType: QuoteItemType.SERVICE,
              serviceName: item.serviceName!,
              serviceDescription: item.serviceDescription,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            };
          }
        }),
      };

      if (isEditing) {
        await updateQuote.mutateAsync({ id: id!, data: payload });
        toast.success('Orçamento atualizado!');
      } else {
        await createQuote.mutateAsync(payload);
        toast.success('Orçamento criado!');
      }
      navigate('/quotes');
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/quotes')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Voltar para Orçamentos
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold">{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
          {isEditing && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleGeneratePdf('elegant')}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {pdfLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                PDF Elegante
              </button>
              <button
                type="button"
                onClick={() => handleGeneratePdf('print')}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                PDF Impressao
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente *</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Selecione um cliente</option>
                {customersData?.data.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Válido até *</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Quick add product bar */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">Adicionar Produto</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {/* Product search */}
            <div className="flex-1 relative" ref={dropdownRef}>
              <label className="block text-sm font-medium mb-1">Produto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowDropdown(true);
                    setSelectedIndex(-1);
                    setPendingProduct(null);
                  }}
                  onFocus={() => {
                    if (!pendingProduct) {
                      setShowDropdown(true);
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar produto por nome ou código..."
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 ${
                    pendingProduct ? 'border-green-400 bg-green-50' : ''
                  }`}
                  autoComplete="off"
                />
                {pendingProduct && (
                  <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && !pendingProduct && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto">
                  {loadingProducts ? (
                    <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                      Buscando...
                    </div>
                  ) : products.length > 0 ? (
                    products.map((p: any, pIdx: number) => {
                      const isZeroStock = typeof p.currentStock === 'number' && p.currentStock <= 0;
                      const isLowStock = typeof p.currentStock === 'number' && typeof p.minimumStock === 'number' && p.currentStock > 0 && p.currentStock <= p.minimumStock;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleProductSelect(p)}
                          className={`px-3 py-2.5 cursor-pointer text-sm flex items-center justify-between border-b border-gray-50 last:border-0 ${
                            pIdx === selectedIndex
                              ? 'bg-blue-50 text-blue-900'
                              : isZeroStock
                              ? 'bg-red-50/40 hover:bg-red-50'
                              : isLowStock
                              ? 'bg-amber-50/40 hover:bg-amber-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isZeroStock ? (
                              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            ) : isLowStock ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-medium">{p.name}</span>
                              {p.code && <span className="ml-2 text-xs text-gray-400">({p.code})</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs flex-shrink-0 ml-3">
                            {p.salePrice > 0 && (
                              <span className="text-gray-500">{formatPrice(p.salePrice)}</span>
                            )}
                            {typeof p.currentStock === 'number' && (
                              <span className={`font-semibold px-1.5 py-0.5 rounded ${
                                isZeroStock ? 'bg-red-100 text-red-700' :
                                isLowStock ? 'bg-amber-100 text-amber-700' :
                                'bg-green-50 text-green-600'
                              }`}>
                                Est: {p.currentStock}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      {productSearch.trim() ? `Nenhum produto encontrado para "${productSearch}"` : 'Nenhum produto cadastrado'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="w-24">
              <label className="block text-sm font-medium mb-1">Qtd</label>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleQtyKeyDown}
                className="w-full px-3 py-2 border rounded-lg text-sm text-center"
              />
            </div>

            {/* Add button */}
            <button
              type="button"
              onClick={handleAddProduct}
              disabled={!pendingProduct}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium min-h-[38px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>

            {/* Service toggle */}
            <button
              type="button"
              onClick={() => setShowServiceForm(!showServiceForm)}
              className={`px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium min-h-[38px] whitespace-nowrap ${
                showServiceForm
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Serviço
            </button>
          </div>

          {/* Service add form (collapsible) */}
          {showServiceForm && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-sm font-semibold text-purple-800 mb-3">Adicionar Serviço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium mb-1">Serviço cadastrado</label>
                  <select
                    value={serviceForm.serviceId}
                    onChange={(e) => handleServiceSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm bg-white"
                  >
                    <option value="">Selecionar...</option>
                    {servicesData?.data.map((service: any) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    value={serviceForm.serviceName}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, serviceName: e.target.value }))}
                    placeholder="Nome do serviço"
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={serviceForm.quantity}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border rounded text-sm text-center"
                  />
                </div>
                <div className="lg:col-span-1">
                  <CurrencyInput
                    label="Preço"
                    value={serviceForm.unitPrice}
                    currency={defaultCurrency}
                    onChange={(cents) => setServiceForm(prev => ({ ...prev, unitPrice: cents }))}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium min-h-[38px]"
                  >
                    + Serviço
                  </button>
                </div>
              </div>
              {/* Description */}
              <div className="mt-2">
                <input
                  type="text"
                  value={serviceForm.serviceDescription}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, serviceDescription: e.target.value }))}
                  placeholder="Descrição do serviço (opcional)"
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 lg:px-6 py-3 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">
              Itens ({formData.items.length})
            </h2>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum item adicionado</p>
              <p className="text-sm mt-1">Use a barra acima para buscar e adicionar produtos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Qtd</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-36">Preço Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-36">Total</th>
                    <th className="px-4 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 group">
                      <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {item.itemType === QuoteItemType.PRODUCT ? (
                            <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          ) : (
                            <Wrench className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-900 block truncate">
                              {item.itemType === QuoteItemType.PRODUCT
                                ? (item.productName || 'Produto')
                                : (item.serviceName || 'Serviço')}
                            </span>
                            {item.itemType === QuoteItemType.PRODUCT && item.productCode && (
                              <span className="text-xs text-gray-400">{item.productCode}</span>
                            )}
                            {item.itemType === QuoteItemType.SERVICE && item.serviceDescription && (
                              <span className="text-xs text-gray-400 block truncate">{item.serviceDescription}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          className="w-20 px-2 py-1 border rounded text-sm text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <CurrencyInput
                          value={item.unitPrice}
                          currency={defaultCurrency}
                          onChange={(cents) => updateItem(index, 'unitPrice', cents)}
                          className="text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                        {formatPrice(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {formData.items.length > 0 && (
            <div className="border-t px-4 lg:px-6 py-4">
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatPrice(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Desconto:</span>
                    <div className="w-40">
                      <CurrencyInput
                        value={formData.discount}
                        currency={defaultCurrency}
                        onChange={(cents) => setFormData({ ...formData, discount: cents })}
                        className="text-right text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="submit"
            disabled={createQuote.isPending || updateQuote.isPending}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {createQuote.isPending || updateQuote.isPending ? 'Salvando...' : isEditing ? 'Atualizar Orçamento' : 'Criar Orçamento'}
          </button>
          <button type="button" onClick={() => navigate('/quotes')} className="w-full sm:w-auto bg-gray-200 px-6 py-2 min-h-[44px] rounded-lg hover:bg-gray-300">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
