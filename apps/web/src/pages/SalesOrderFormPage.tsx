import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSalesOrder } from '../hooks/useSalesOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { useServices } from '../hooks/useServices';
import { useUsers } from '../hooks/useUsers';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { AppPage } from '@ejr/shared-types';
import { toast } from 'sonner';
import { CurrencyInput } from '../components/CurrencyInput';
import {
  Search,
  Package,
  AlertTriangle,
  Trash2,
  Plus,
  Wrench,
  ArrowLeft,
  Save,
  ShieldOff,
} from 'lucide-react';

type FormItem = {
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string;
  productName?: string;
  productCode?: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export function SalesOrderFormPage() {
  const navigate = useNavigate();

  // Permissoes
  const permissionCheck = useRequirePermission({
    page: AppPage.SALES,
    message: 'Voce nao tem permissao para acessar pedidos de venda.',
  });
  const { hasActionPermission } = usePagePermissions();
  const canCreate = hasActionPermission(AppPage.SALES, 'create' as any);

  // Dados
  const createOrder = useCreateSalesOrder();
  const { data: customersData } = useCustomers({ page: 1, limit: 500 });
  const { data: usersData } = useUsers({ isActive: true, role: 'SALESPERSON' as any });
  const { data: servicesData } = useServices({ page: 1, limit: 100, isActive: true });
  const { data: systemSettings } = useSystemSettings();
  const defaultCurrency = systemSettings?.defaultCurrency || 'BRL';
  const { formatPrice } = useFormatPrice();

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addQty, setAddQty] = useState(1);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceId: '',
    serviceName: '',
    quantity: 1,
    unitPrice: 0,
  });

  const { data: productsData, isLoading: loadingProducts } = useProducts({
    page: 1,
    limit: 20,
    search: productSearch.trim() || undefined,
  });
  const products = productsData?.data || [];

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    sellerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    discount: 0,
    notes: '',
    internalNotes: '',
    items: [] as FormItem[],
  });

  // Click outside dropdown
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

  if (permissionCheck) return permissionCheck;

  if (!canCreate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sem Permissao</h2>
          <p className="text-gray-500 mb-4">Voce nao tem permissao para criar pedidos.</p>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Product handlers
  const handleProductSelect = (product: any) => {
    setPendingProduct(product);
    setProductSearch(product.name);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setAddQty(1);
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  const handleAddProduct = () => {
    if (!pendingProduct) return;
    if (addQty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemType: 'PRODUCT' as const,
          productId: pendingProduct.id,
          productName: pendingProduct.name,
          productCode: pendingProduct.code,
          quantity: addQty,
          unitPrice: pendingProduct.salePrice || 0,
          discount: 0,
        },
      ],
    }));
    setPendingProduct(null);
    setProductSearch('');
    setAddQty(1);
    toast.success(`${pendingProduct.name} adicionado`);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

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
        setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
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

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProduct();
    }
  };

  // Service handlers
  const handleServiceSelect = (serviceId: string) => {
    const service = servicesData?.data.find((s: any) => s.id === serviceId);
    if (service) {
      setServiceForm((prev) => ({
        ...prev,
        serviceId,
        serviceName: service.name,
        unitPrice: service.defaultPrice || 0,
      }));
    }
  };

  const handleAddService = () => {
    if (!serviceForm.serviceName.trim()) {
      toast.error('Nome do servico e obrigatorio');
      return;
    }
    if (serviceForm.quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemType: 'SERVICE' as const,
          serviceName: serviceForm.serviceName,
          quantity: serviceForm.quantity,
          unitPrice: serviceForm.unitPrice,
          discount: 0,
        },
      ],
    }));
    setServiceForm({ serviceId: '', serviceName: '', quantity: 1, unitPrice: 0 });
    setShowServiceForm(false);
    toast.success('Servico adicionado');
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice - (item.discount || 0);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - formData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    for (const item of formData.items) {
      if (item.itemType === 'PRODUCT' && !item.productId) {
        toast.error('Todos os itens de produto devem ter um produto selecionado');
        return;
      }
      if (item.itemType === 'SERVICE' && !item.serviceName?.trim()) {
        toast.error('Todos os itens de servico devem ter um nome');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }
    }
    if (!formData.orderDate) {
      toast.error('Defina a data do pedido');
      return;
    }

    try {
      const payload = {
        customerId: formData.customerId,
        sellerId: formData.sellerId || undefined,
        orderDate: new Date(formData.orderDate).toISOString(),
        discount: formData.discount,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
        items: formData.items.map((item) => ({
          itemType: item.itemType,
          productId: item.productId || undefined,
          serviceName: item.serviceName || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        })),
      };

      await createOrder.mutateAsync(payload);
      toast.success('Pedido criado com sucesso!');
      navigate('/sales-orders');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Erro ao criar pedido');
    }
  };

  const sellers = usersData?.data || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/sales-orders')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Pedidos
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold">Novo Pedido de Venda</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <label className="block text-sm font-medium mb-1">Data do Pedido *</label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vendedor</label>
              <select
                value={formData.sellerId}
                onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Nenhum (voce mesmo)</option>
                {sellers.map((seller: any) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Observacoes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas Internas</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Visiveis apenas para a equipe interna"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick add product bar */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">Adicionar Produto</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
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
                    if (!pendingProduct) setShowDropdown(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar produto por nome ou codigo..."
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 ${
                    pendingProduct ? 'border-green-400 bg-green-50' : ''
                  }`}
                  autoComplete="off"
                />
                {pendingProduct && (
                  <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>

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
                      const isLowStock =
                        typeof p.currentStock === 'number' &&
                        typeof p.minimumStock === 'number' &&
                        p.currentStock > 0 &&
                        p.currentStock <= p.minimumStock;
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
                            {p.salePrice > 0 && <span className="text-gray-500">{formatPrice(p.salePrice)}</span>}
                            {typeof p.currentStock === 'number' && (
                              <span
                                className={`font-semibold px-1.5 py-0.5 rounded ${
                                  isZeroStock
                                    ? 'bg-red-100 text-red-700'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-50 text-green-600'
                                }`}
                              >
                                Est: {p.currentStock}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      {productSearch.trim()
                        ? `Nenhum produto encontrado para "${productSearch}"`
                        : 'Nenhum produto cadastrado'}
                    </div>
                  )}
                </div>
              )}
            </div>

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

            <button
              type="button"
              onClick={handleAddProduct}
              disabled={!pendingProduct}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium min-h-[38px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>

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
              Servico
            </button>
          </div>

          {showServiceForm && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-sm font-semibold text-purple-800 mb-3">Adicionar Servico</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium mb-1">Servico cadastrado</label>
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
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                    placeholder="Nome do servico"
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={serviceForm.quantity}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border rounded text-sm text-center"
                  />
                </div>
                <div className="lg:col-span-1">
                  <CurrencyInput
                    label="Preco"
                    value={serviceForm.unitPrice}
                    currency={defaultCurrency}
                    onChange={(cents) => setServiceForm((prev) => ({ ...prev, unitPrice: cents }))}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium min-h-[38px]"
                  >
                    + Servico
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 lg:px-6 py-3 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Itens ({formData.items.length})</h2>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum item adicionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Qtd</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-36">Preco Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Desc. Item</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-36">Total</th>
                    <th className="px-4 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => {
                    const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
                    return (
                      <tr key={index} className="hover:bg-gray-50 group">
                        <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {item.itemType === 'PRODUCT' ? (
                              <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            ) : (
                              <Wrench className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-gray-900 block truncate">
                                {item.itemType === 'PRODUCT' ? item.productName || 'Produto' : item.serviceName || 'Servico'}
                              </span>
                              {item.itemType === 'PRODUCT' && item.productCode && (
                                <span className="text-xs text-gray-400">{item.productCode}</span>
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
                        <td className="px-4 py-2">
                          <CurrencyInput
                            value={item.discount}
                            currency={defaultCurrency}
                            onChange={(cents) => updateItem(index, 'discount', cents)}
                            className="text-right text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          {formatPrice(itemTotal)}
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
                    );
                  })}
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
            disabled={createOrder.isPending}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {createOrder.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Criar Pedido
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/sales-orders')}
            className="w-full sm:w-auto bg-gray-200 px-6 py-2 min-h-[44px] rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
