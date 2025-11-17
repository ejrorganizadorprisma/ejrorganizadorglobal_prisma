import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuote, useCreateQuote, useUpdateQuote } from '../hooks/useQuotes';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { toast } from 'sonner';

export function QuoteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: quote } = useQuote(id || '', { enabled: isEditing });
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();

  const { data: customersData } = useCustomers({ page: 1, limit: 100 });
  const { data: productsData } = useProducts({ page: 1, limit: 100 });

  const [formData, setFormData] = useState({
    customerId: '',
    discount: 0,
    validUntil: '',
    notes: '',
    items: [] as Array<{ productId: string; quantity: number; unitPrice: number }>,
  });

  useEffect(() => {
    if (quote) {
      setFormData({
        customerId: quote.customerId,
        discount: quote.discount,
        validUntil: new Date(quote.validUntil).toISOString().split('T')[0],
        notes: quote.notes || '',
        items: quote.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
  }, [quote]);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0 }],
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

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - formData.discount;
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = productsData?.data.find((p: any) => p.id === productId);
    if (product) {
      updateItem(index, 'productId', productId);
      updateItem(index, 'unitPrice', product.salePrice);
    }
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

    if (!formData.validUntil) {
      toast.error('Defina a data de validade');
      return;
    }

    try {
      const payload = {
        ...formData,
        validUntil: new Date(formData.validUntil).toISOString(),
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
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/quotes')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Voltar para Orçamentos
        </button>
        <h1 className="text-3xl font-bold">{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Itens do Orçamento</h2>
            <button type="button" onClick={addItem} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              + Adicionar Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded">
                <div className="col-span-5">
                  <label className="block text-sm font-medium mb-1">Produto</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="">Selecione...</option>
                    {productsData?.data.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.salePrice} centavos
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice / 100}
                    onChange={(e) => updateItem(index, 'unitPrice', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="w-full px-3 py-2 border rounded"
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
                  >
                    ×
                  </button>
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
          <div className="flex justify-end space-y-2">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal (R$):</span>
                <span>{(calculateSubtotal() / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Desconto (R$):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount / 100}
                  onChange={(e) => setFormData({ ...formData, discount: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  className="w-32 px-3 py-1 border rounded text-right"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-between py-2 text-xl font-bold border-t">
                <span>Total (R$):</span>
                <span className="text-green-600">{(calculateTotal() / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={createQuote.isPending || updateQuote.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createQuote.isPending || updateQuote.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Orçamento'}
          </button>
          <button type="button" onClick={() => navigate('/quotes')} className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
