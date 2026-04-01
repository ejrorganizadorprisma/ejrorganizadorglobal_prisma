import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrder, useSendPurchaseOrder } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useProducts } from '../hooks/useProducts';
import { useProductSuppliers } from '../hooks/useProductSuppliers';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { toast } from 'sonner';

interface ItemFormData {
  productId: string;
  supplierId: string;
  setAsPreferredSupplier: boolean;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

// Componente para seleção de fornecedor de cada item
function ItemSupplierSelect({
  productId,
  supplierId,
  setAsPreferred,
  allSuppliers,
  onSupplierChange,
  onPreferredChange,
}: {
  productId: string;
  supplierId: string;
  setAsPreferred: boolean;
  allSuppliers: any[];
  onSupplierChange: (supplierId: string) => void;
  onPreferredChange: (checked: boolean) => void;
}) {
  const { data: productSuppliers, isLoading } = useProductSuppliers(productId || undefined);
  const { formatPrice } = useFormatPrice();

  // Fornecedores vinculados ao produto
  const linkedSuppliers = productSuppliers || [];
  const preferredSupplier = linkedSuppliers.find((ps: any) => ps.isPreferred);

  // Auto-selecionar fornecedor preferencial quando produto é selecionado
  useEffect(() => {
    if (productId && !supplierId && preferredSupplier) {
      onSupplierChange(preferredSupplier.supplierId);
    }
  }, [productId, preferredSupplier, supplierId]);

  if (!productId) {
    return (
      <div className="text-xs text-gray-400 italic">
        Selecione um produto primeiro
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-xs text-gray-400">Carregando...</div>;
  }

  return (
    <div className="space-y-2">
      <select
        value={supplierId}
        onChange={(e) => onSupplierChange(e.target.value)}
        className="w-full px-2 py-1 text-sm border rounded focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Selecione fornecedor...</option>

        {/* Fornecedores vinculados ao produto */}
        {linkedSuppliers.length > 0 && (
          <optgroup label="Fornecedores do Produto">
            {linkedSuppliers.map((ps: any) => (
              <option key={ps.supplierId} value={ps.supplierId}>
                {ps.supplier?.name || 'Fornecedor'} {ps.isPreferred ? '⭐' : ''}
                {ps.unitPrice ? ` - ${formatPrice(ps.unitPrice)}` : ''}
              </option>
            ))}
          </optgroup>
        )}

        {/* Todos os fornecedores */}
        <optgroup label="Outros Fornecedores">
          {allSuppliers
            .filter((s: any) => !linkedSuppliers.some((ps: any) => ps.supplierId === s.id))
            .map((supplier: any) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
        </optgroup>
      </select>

      {/* Checkbox para definir como preferencial */}
      {supplierId && !linkedSuppliers.some((ps: any) => ps.supplierId === supplierId && ps.isPreferred) && (
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={setAsPreferred}
            onChange={(e) => onPreferredChange(e.target.checked)}
            className="rounded text-blue-600"
          />
          Definir como fornecedor padrão
        </label>
      )}

      {preferredSupplier && supplierId === preferredSupplier.supplierId && (
        <span className="text-xs text-green-600">⭐ Fornecedor padrão</span>
      )}
    </div>
  );
}

export function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { formatPrice } = useFormatPrice();

  const { data: purchaseOrder } = usePurchaseOrder(id);
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const sendPO = useSendPurchaseOrder();

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });

  const [formData, setFormData] = useState({
    name: '',
    supplierId: '', // Fornecedor principal (opcional quando cada item tem seu fornecedor)
    expectedDeliveryDate: '',
    paymentTerms: '',
    notes: '',
    internalNotes: '',
    shippingCost: 0,
    discountAmount: 0,
    items: [] as ItemFormData[],
  });

  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        name: purchaseOrder.name || '',
        supplierId: purchaseOrder.supplierId || '',
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate
          ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0]
          : '',
        paymentTerms: purchaseOrder.paymentTerms || '',
        notes: purchaseOrder.notes || '',
        internalNotes: purchaseOrder.internalNotes || '',
        shippingCost: purchaseOrder.shippingCost || 0,
        discountAmount: purchaseOrder.discountAmount || 0,
        items: purchaseOrder.items?.map((item: any) => ({
          productId: item.productId,
          supplierId: item.supplierId || '',
          setAsPreferredSupplier: false,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || '',
        })) || [],
      });
    }
  }, [purchaseOrder]);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: '',
        supplierId: '',
        setAsPreferredSupplier: false,
        quantity: 1,
        unitPrice: 0,
        notes: ''
      }],
    }));
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

  const handleProductChange = (index: number, productId: string) => {
    const product = productsData?.data.find((p: any) => p.id === productId);
    if (product) {
      updateItem(index, 'productId', productId);
      updateItem(index, 'unitPrice', product.costPrice || 0);
      updateItem(index, 'supplierId', ''); // Reset fornecedor ao trocar produto
      updateItem(index, 'setAsPreferredSupplier', false);
    }
  };

  const handleSupplierChangeForItem = (index: number, supplierId: string) => {
    updateItem(index, 'supplierId', supplierId);
    updateItem(index, 'setAsPreferredSupplier', false);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + formData.shippingCost - formData.discountAmount;
  };

  const handleSubmit = async (e: React.FormEvent, sendImmediately = false) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    // Validar itens
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.productId) {
        toast.error(`Item ${i + 1}: Selecione um produto`);
        return;
      }
      if (!item.supplierId) {
        const product = productsData?.data.find((p: any) => p.id === item.productId);
        toast.error(`Item ${i + 1} (${product?.name || 'Produto'}): Selecione um fornecedor`);
        return;
      }
      if (item.quantity <= 0) {
        toast.error(`Item ${i + 1}: A quantidade deve ser maior que zero`);
        return;
      }
      if (item.unitPrice < 0) {
        toast.error(`Item ${i + 1}: O preço unitário não pode ser negativo`);
        return;
      }
    }

    try {
      const payload = {
        name: formData.name || undefined,
        supplierId: formData.supplierId || null,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
        shippingCost: formData.shippingCost,
        discountAmount: formData.discountAmount,
        subtotal: calculateSubtotal(),
        totalAmount: calculateTotal(),
        items: formData.items.map(item => ({
          productId: item.productId,
          supplierId: item.supplierId,
          setAsPreferredSupplier: item.setAsPreferredSupplier,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          notes: item.notes || undefined,
        })),
      };

      if (isEditing) {
        await updatePO.mutateAsync({ id: id!, data: payload });
        toast.success('Ordem de compra atualizada!');
      } else {
        const newPO = await createPO.mutateAsync(payload);

        if (sendImmediately && newPO.id) {
          await sendPO.mutateAsync(newPO.id);
          toast.success('Ordem de compra criada e enviada ao fornecedor!');
        } else {
          toast.success('Ordem de compra criada!');
        }
      }

      navigate('/purchase-orders');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  const suppliers = suppliersData?.data || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/purchase-orders')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Voltar para Ordens de Compra
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold">{isEditing ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra'}</h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Nome da Ordem de Compra</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Compra de componentes eletrônicos, Reposição de estoque..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Opcional: Um nome descritivo para identificar facilmente esta ordem</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor Principal</label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Nenhum (usar fornecedor por item)</option>
              {suppliers.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Opcional: Cada item pode ter seu próprio fornecedor</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data de Entrega Prevista</label>
            <input
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Condições de Pagamento</label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="Ex: 30 dias, à vista..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Custo de Envio (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.shippingCost / 100}
              onChange={(e) => setFormData({ ...formData, shippingCost: Math.round(parseFloat(e.target.value || '0') * 100) })}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Observações visíveis ao fornecedor..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Observações Internas</label>
            <textarea
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              rows={2}
              placeholder="Notas internas (não visíveis ao fornecedor)..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg lg:text-xl font-semibold">Itens da Ordem</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Adicionar Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="p-4 border rounded bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                  {/* Produto */}
                  <div className="sm:col-span-4">
                    <label className="block text-sm font-medium mb-1">Produto *</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {productsData?.data.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fornecedor do Item */}
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium mb-1">Fornecedor *</label>
                    <ItemSupplierSelect
                      productId={item.productId}
                      supplierId={item.supplierId}
                      setAsPreferred={item.setAsPreferredSupplier}
                      allSuppliers={suppliers}
                      onSupplierChange={(supplierId) => handleSupplierChangeForItem(index, supplierId)}
                      onPreferredChange={(checked) => updateItem(index, 'setAsPreferredSupplier', checked)}
                    />
                  </div>

                  {/* Quantidade */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium mb-1">Qtd *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Preço Unitário */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Preço Unit. (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice / 100}
                      onChange={(e) => updateItem(index, 'unitPrice', Math.round(parseFloat(e.target.value || '0') * 100))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* Total */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium mb-1">Total</label>
                    <div className="px-2 py-2 bg-white border rounded text-sm font-medium">
                      {formatPrice(item.quantity * item.unitPrice)}
                    </div>
                  </div>

                  {/* Remover */}
                  <div className="sm:col-span-1 sm:pt-6">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full px-3 py-2 min-h-[44px] bg-red-600 text-white rounded hover:bg-red-700"
                      title="Remover item"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Observações do Item */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    placeholder="Observações específicas deste item..."
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            ))}

            {formData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum item adicionado. Clique em "Adicionar Item" para começar.
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-end">
            <div className="w-80">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>{formatPrice(calculateSubtotal())}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Custo de Envio:</span>
                <span>{formatPrice(formData.shippingCost)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Desconto:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountAmount / 100}
                  onChange={(e) => setFormData({ ...formData, discountAmount: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  className="w-32 px-3 py-1 border rounded text-right focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-between py-2 text-xl font-bold border-t mt-2">
                <span>Total:</span>
                <span className="text-green-600">{formatPrice(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="submit"
            disabled={createPO.isPending || updatePO.isPending}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPO.isPending || updatePO.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar como Rascunho'}
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={createPO.isPending || sendPO.isPending}
              className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendPO.isPending ? 'Enviando...' : 'Salvar e Enviar ao Fornecedor'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="w-full sm:w-auto bg-gray-200 px-6 py-2 min-h-[44px] rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
