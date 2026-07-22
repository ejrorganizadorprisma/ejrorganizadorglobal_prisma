import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSalesOrder, useUpdateSalesOrder, useReleaseSeparation, useReceiveSalesOrder } from '../hooks/useSalesOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { useServices } from '../hooks/useServices';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useAuth } from '../hooks/useAuth';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { generateSalesOrderPDF } from '../utils/salesOrderPdfGenerator';
import { AppPage } from '@ejr/shared-types';
import { toast } from 'sonner';
import { CurrencyInput } from '../components/CurrencyInput';
import { SalesOrderAuditBlock } from '../components/SalesOrderAuditBlock';
import { ApproveSalesOrderModal } from '../components/ApproveSalesOrderModal';
import { ConversionHistoryBlock } from '../components/ConversionHistoryBlock';
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
  ThumbsUp,
  ArrowRightCircle,
  FileDown,
  Printer,
  PackageCheck,
  ClipboardCheck,
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

export function SalesOrderEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Permissoes
  const permissionCheck = useRequirePermission({
    page: AppPage.SALES,
    message: 'Voce nao tem permissao para acessar pedidos de venda.',
  });
  const { hasActionPermission } = usePagePermissions();
  const canEdit = hasActionPermission(AppPage.SALES, 'edit');
  const userRole = useAuth((state) => state.user?.role);
  // ADMIN não existe no enum UserRole hoje; tratamos OWNER/DIRECTOR/MANAGER como aprovadores.
  const canApprove = !!userRole && (['OWNER', 'ADMIN', 'DIRECTOR', 'MANAGER'] as string[]).includes(userRole);

  // Estado do modal de aprovação
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Dados
  const { data: order, isLoading: loadingOrder } = useSalesOrder(id || '', { enabled: !!id });
  const updateOrder = useUpdateSalesOrder();
  const releaseSeparation = useReleaseSeparation();
  const receiveOrder = useReceiveSalesOrder();
  const { data: customersData } = useCustomers({ page: 1, limit: 500 });
  const { data: servicesData } = useServices({ page: 1, limit: 100, isActive: true });
  const { data: systemSettings } = useSystemSettings();
  const defaultCurrency = systemSettings?.defaultCurrency || 'BRL';
  const { formatPrice } = useFormatPrice();
  const { data: documentSettings } = useDefaultDocumentSettings();

  const handleGeneratePDF = (mode: 'elegant' | 'print') => {
    if (!order) return;
    if (!order.customer) {
      toast.error('Dados do cliente nao disponiveis');
      return;
    }
    if (!order.items || order.items.length === 0) {
      toast.error('Pedido sem itens para gerar PDF');
      return;
    }
    try {
      generateSalesOrderPDF(order as any, order.customer as any, documentSettings, defaultCurrency, mode);
      toast.success(mode === 'print' ? 'PDF para impressao gerado' : 'PDF elegante gerado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || 'desconhecido'));
    }
  };

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addQty, setAddQty] = useState(1);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notas recolhíveis (fechadas por padrão para não ocupar espaço)
  const [showNotes, setShowNotes] = useState(false);

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
    limit: 500,
    search: productSearch.trim() || undefined,
    sortBy: 'name',
  });
  const products = productsData?.data || [];

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    orderDate: '',
    separationForecastDate: '',
    discount: 0,
    notes: '',
    internalNotes: '',
    items: [] as FormItem[],
  });

  // Preencher form com dados do pedido
  useEffect(() => {
    if (order) {
      setFormData({
        customerId: order.customerId,
        orderDate: new Date(order.orderDate).toISOString().split('T')[0],
        separationForecastDate: order.separationForecastDate
          ? new Date(order.separationForecastDate).toISOString().split('T')[0]
          : '',
        discount: order.discount,
        notes: order.notes || '',
        internalNotes: order.internalNotes || '',
        items: (order.items || []).map((item) => ({
          itemType: item.itemType,
          productId: item.productId,
          productName: item.product?.name,
          productCode: item.product?.code,
          serviceName: item.serviceName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        })),
      });
    }
  }, [order]);

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

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sem Permissao</h2>
          <p className="text-gray-500 mb-4">Voce nao tem permissao para editar pedidos.</p>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Pedido nao encontrado.</p>
        <button onClick={() => navigate('/sales-orders')} className="mt-4 text-blue-600 hover:text-blue-800">
          Voltar para Pedidos
        </button>
      </div>
    );
  }

  const isReadOnly = order.status === 'CONVERTED' || order.status === 'CANCELLED';

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
        orderDate: new Date(formData.orderDate).toISOString(),
        separationForecastDate: formData.separationForecastDate || null,
        discount: formData.discount,
        notes: formData.notes || null,
        internalNotes: formData.internalNotes || null,
        items: formData.items.map((item) => ({
          itemType: item.itemType,
          productId: item.productId || undefined,
          serviceName: item.serviceName || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        })),
      };

      await updateOrder.mutateAsync({ id: id!, data: payload });
      toast.success('Pedido atualizado com sucesso!');
      setJustSaved(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Erro ao salvar');
    }
  };

  // Confirmar Recebimento: pedido de venda (PENDING) → recebido (RECEIVED).
  // Só depois disso o pedido pode ser liberado para separação.
  const canReceive = order.status === 'PENDING';

  const handleReceive = async () => {
    if (!id) return;
    try {
      await receiveOrder.mutateAsync({ id, body: {} });
      // Permanece na página: a query é invalidada, o status vira RECEIVED e o
      // botão "Liberar Separação" passa a aparecer automaticamente.
      toast.success('Pedido recebido! Agora você pode liberar para separação.');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Erro ao confirmar recebimento');
    }
  };

  // Liberar Separação: manda o pedido para a fila do estoque.
  // Aparece só após o recebimento (RECEIVED) ou para pedidos já autorizados (APPROVED).
  const canRelease =
    order.status === 'APPROVED' ||
    order.status === 'RECEIVED';

  const handleRelease = async () => {
    if (!id) return;
    try {
      await releaseSeparation.mutateAsync({ id, body: {} });
      toast.success('Pedido liberado para o estoque separar!');
      navigate('/sales-orders');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Erro ao liberar separação');
    }
  };

  const showConversionHistory =
    order.status === 'CONVERTED' || order.status === 'PARTIALLY_CONVERTED';

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold">
            Editar Pedido {order.orderNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleGeneratePDF('elegant')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-blue-200 transition-colors"
              title="Versao colorida com logo e cores da empresa"
            >
              <FileDown className="w-4 h-4" />
              PDF Elegante
            </button>
            <button
              type="button"
              onClick={() => handleGeneratePDF('print')}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-gray-300 transition-colors"
              title="Versao em escala de cinza, otimizada para economia de tinta"
            >
              <Printer className="w-4 h-4" />
              PDF Impressao
            </button>
            {canApprove && order.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <ThumbsUp className="w-4 h-4" />
                Aprovar pedido
              </button>
            )}
          </div>
        </div>
        {isReadOnly && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Este pedido esta {order.status === 'CONVERTED' ? 'faturado' : 'cancelado'} e nao pode ser editado.
          </div>
        )}
        {order.status === 'PARTIALLY_CONVERTED' && (
          <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-sm">
            Este pedido foi <strong>parcialmente faturado</strong>. O saldo continua disponível para novo faturamento.
          </div>
        )}
      </div>

      {/* Bloco de auditoria — sempre visível, separado dos campos editáveis */}
      <div className="mb-6">
        <SalesOrderAuditBlock order={order} />
      </div>

      {/* Histórico de faturamentos — exibido apenas se houve conversão */}
      {showConversionHistory && id && (
        <div className="mb-6">
          <ConversionHistoryBlock orderId={id} />
        </div>
      )}

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
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-100"
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
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vendedor</label>
              <input
                type="text"
                value={order.seller?.name || '-'}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-amber-500" />
                Previsão Separação
              </label>
              <input
                type="date"
                value={formData.separationForecastDate}
                onChange={(e) => setFormData({ ...formData, separationForecastDate: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">
                Data estimada para encaminhar à separação. Quando a data chega, o pedido é priorizado na lista.
              </p>
            </div>

            <div className="md:col-span-3">
              <button
                type="button"
                onClick={() => setShowNotes((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                <span className={`transition-transform ${showNotes ? 'rotate-90' : ''}`}>▶</span>
                Observações e notas internas
                {(formData.notes || formData.internalNotes) && !showNotes && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">preenchido</span>
                )}
              </button>
              {showNotes && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Observações</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border rounded disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notas Internas</label>
                    <textarea
                      value={formData.internalNotes}
                      onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                      rows={2}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border rounded disabled:bg-gray-100"
                      placeholder="Visíveis apenas para a equipe interna"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick add product bar */}
        {!isReadOnly && (
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
                  <div
                    className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto ${
                      formData.items.length >= 1 ? 'bottom-full mb-1' : 'top-full mt-1'
                    }`}
                  >
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
        )}

        {/* Items table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 lg:px-6 py-3 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Itens ({formData.items.length})</h2>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum item</p>
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
                    {!isReadOnly && <th className="px-4 py-2 w-12"></th>}
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
                            disabled={isReadOnly}
                            className="w-20 px-2 py-1 border rounded text-sm text-center disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <CurrencyInput
                            value={item.unitPrice}
                            currency={defaultCurrency}
                            onChange={(cents) => updateItem(index, 'unitPrice', cents)}
                            className="text-right text-sm"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <CurrencyInput
                            value={item.discount}
                            currency={defaultCurrency}
                            onChange={(cents) => updateItem(index, 'discount', cents)}
                            className="text-right text-sm"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          {formatPrice(itemTotal)}
                        </td>
                        {!isReadOnly && (
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
                        )}
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
                        disabled={isReadOnly}
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
        {!isReadOnly && (
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="submit"
              disabled={updateOrder.isPending}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {updateOrder.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alteracoes
                </>
              )}
            </button>
            {canReceive && (
              <button
                type="button"
                onClick={handleReceive}
                disabled={receiveOrder.isPending}
                className="w-full sm:w-auto bg-sky-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-sky-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                title="Confirmar que o pedido foi recebido e conferido pela administração"
              >
                {receiveOrder.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Pedido Recebido
                  </>
                )}
              </button>
            )}
            {canRelease && (
              <button
                type="button"
                onClick={handleRelease}
                disabled={releaseSeparation.isPending}
                className="w-full sm:w-auto bg-amber-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                title="Enviar este pedido para a fila de separação do estoque"
              >
                {releaseSeparation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Liberando...
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    Liberar Separação
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/sales-orders')}
              className="w-full sm:w-auto bg-gray-200 px-6 py-2 min-h-[44px] rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            {justSaved &&
              (order.status === 'PENDING' ||
                order.status === 'APPROVED' ||
                order.status === 'PARTIALLY_CONVERTED') && (
                <button
                  type="button"
                  onClick={() => navigate(`/sales-orders/${id}/convert`)}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2"
                  title="Faturar (converter em venda)"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Faturar
                </button>
              )}
          </div>
        )}
      </form>

      {/* Modal de aprovação */}
      <ApproveSalesOrderModal
        isOpen={showApproveModal}
        orderId={id || null}
        orderNumber={order.orderNumber}
        onClose={() => setShowApproveModal(false)}
      />
    </div>
  );
}
