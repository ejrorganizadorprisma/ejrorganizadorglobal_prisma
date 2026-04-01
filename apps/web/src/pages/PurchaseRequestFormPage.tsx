import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseRequest, useCreatePurchaseRequest, useUpdatePurchaseRequest } from '../hooks/usePurchaseRequests';
import { useProducts } from '../hooks/useProducts';
import { toast } from 'sonner';

export function PurchaseRequestFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: purchaseRequest } = usePurchaseRequest(id);
  const createPR = useCreatePurchaseRequest();
  const updatePR = useUpdatePurchaseRequest();

  const { data: productsData } = useProducts({ page: 1, limit: 1000 });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    justification: '',
    items: [] as Array<{
      productId: string;
      quantity: number;
      notes?: string;
    }>,
  });

  useEffect(() => {
    if (purchaseRequest) {
      setFormData({
        title: purchaseRequest.title,
        description: purchaseRequest.description || '',
        department: purchaseRequest.department || '',
        priority: purchaseRequest.priority,
        justification: purchaseRequest.justification || '',
        items: purchaseRequest.items?.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || '',
        })) || [],
      });
    }
  }, [purchaseRequest]);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, notes: '' }],
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
    updateItem(index, 'productId', productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Digite um nome para a requisição');
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
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        department: formData.department || undefined,
        priority: formData.priority,
        justification: formData.justification || undefined,
        items: formData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      };

      if (isEditing) {
        await updatePR.mutateAsync({ id: id!, data: payload });
        toast.success('Requisição atualizada!');
      } else {
        await createPR.mutateAsync(payload);
        toast.success('Requisição criada! Aguardando aprovação.');
      }

      navigate('/purchase-requests');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/purchase-requests')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Voltar para Requisições
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold">{isEditing ? 'Editar Requisição' : 'Nova Requisição de Compra'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Materiais para manutenção"
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Departamento</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Ex: Produção, Manutenção..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prioridade *</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              required
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="LOW">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Descreva os materiais necessários..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Justificativa</label>
            <textarea
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              rows={2}
              placeholder="Por que estes materiais são necessários?"
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg lg:text-xl font-semibold">Itens Necessários</h2>
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
              <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end p-4 border rounded">
                <div className="sm:col-span-9">
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

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Qtd *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="w-full px-3 py-2 min-h-[44px] bg-red-600 text-white rounded hover:bg-red-700"
                    title="Remover item"
                  >
                    ×
                  </button>
                </div>

                <div className="sm:col-span-12">
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

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="submit"
            disabled={createPR.isPending || updatePR.isPending}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPR.isPending || updatePR.isPending ? 'Salvando...' : isEditing ? 'Atualizar Requisição' : 'Enviar Requisição'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/purchase-requests')}
            className="w-full sm:w-auto bg-gray-200 px-6 py-2 min-h-[44px] rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
