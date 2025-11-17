import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrder, useSendPurchaseOrder } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useProducts } from '../hooks/useProducts';
import { toast } from 'sonner';

export function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: purchaseOrder } = usePurchaseOrder(id);
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const sendPO = useSendPurchaseOrder();

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });

  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    paymentTerms: '',
    notes: '',
    internalNotes: '',
    shippingCost: 0,
    discountAmount: 0,
    items: [] as Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>,
  });

  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        supplierId: purchaseOrder.supplierId,
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate
          ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0]
          : '',
        paymentTerms: purchaseOrder.paymentTerms || '',
        notes: purchaseOrder.notes || '',
        internalNotes: purchaseOrder.internalNotes || '',
        shippingCost: purchaseOrder.shippingCost || 0,
        discountAmount: purchaseOrder.discountAmount || 0,
        items: [],
      });
    }
  }, [purchaseOrder]);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0, notes: '' }],
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
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + formData.shippingCost - formData.discountAmount;
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const handleSubmit = async (e: React.FormEvent, sendImmediately = false) => {
    e.preventDefault();

    if (!formData.supplierId) {
      toast.error('Selecione um fornecedor');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    for (const item of formData.items) {
      if (!item.productId) {
        toast.error('Todos os itens devem ter um produto selecionado');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('A quantidade deve ser maior que zero');
        return;
      }
      if (item.unitPrice < 0) {
        toast.error('O preço unitário não pode ser negativo');
        return;
      }
    }

    try {
      const payload = {
        supplierId: formData.supplierId,
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


  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/purchase-orders')} className="text-blue-600 hover:text-blue-800 mb-4">
          Voltar para Ordens de Compra
        </button>
        <h1 className="text-3xl font-bold">{isEditing ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra'}</h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor *</label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um fornecedor</option>
              {suppliersData?.data.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Itens da Ordem</h2>
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
              <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded">
                <div className="col-span-5">
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Qtd *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Preço Unit. (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice / 100}
                    onChange={(e) => updateItem(index, 'unitPrice', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Total (R$)</label>
                  <div className="px-3 py-2 bg-gray-50 border rounded">
                    {((item.quantity * item.unitPrice) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Remover item"
                  >
                    ×
                  </button>
                </div>

                <div className="col-span-11">
                  <label className="block text-sm font-medium mb-1">Observações do Item</label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    placeholder="Observações específicas deste item..."
                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
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
                <span className="font-medium">Subtotal (R$):</span>
                <span>{(calculateSubtotal() / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Custo de Envio (R$):</span>
                <span>{(formData.shippingCost / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Desconto (R$):</span>
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
                <span>Total (R$):</span>
                <span className="text-green-600">{(calculateTotal() / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={createPO.isPending || updatePO.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPO.isPending || updatePO.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar como Rascunho'}
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={createPO.isPending || sendPO.isPending}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendPO.isPending ? 'Enviando...' : 'Salvar e Enviar ao Fornecedor'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
