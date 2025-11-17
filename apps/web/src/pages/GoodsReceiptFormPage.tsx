import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateGoodsReceipt, useGoodsReceipt, useUpdateGoodsReceipt } from '../hooks/useGoodsReceipts';
import { usePurchaseOrders, usePurchaseOrder, usePurchaseOrderItems } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useProducts } from '../hooks/useProducts';
import { toast } from 'sonner';

const QUALITY_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente', color: 'text-yellow-600' },
  { value: 'APPROVED', label: 'Aprovado', color: 'text-green-600' },
  { value: 'REJECTED', label: 'Rejeitado', color: 'text-red-600' },
  { value: 'QUARANTINE', label: 'Quarentena', color: 'text-orange-600' },
];

export function GoodsReceiptFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: receipt } = useGoodsReceipt(id);
  const createReceipt = useCreateGoodsReceipt();
  const updateReceipt = useUpdateGoodsReceipt();

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: purchaseOrdersData } = usePurchaseOrders({ page: 1, limit: 100, status: 'CONFIRMED' });
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });

  const [formData, setFormData] = useState({
    purchaseOrderId: '',
    supplierId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    invoiceDate: '',
    invoiceAmount: 0,
    notes: '',
    items: [] as Array<{
      purchaseOrderItemId?: string;
      productId: string;
      quantityOrdered: number;
      quantityReceived: number;
      quantityAccepted: number;
      quantityRejected: number;
      unitPrice: number;
      qualityStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUARANTINE';
      rejectionReason: string;
      lotNumber: string;
      expiryDate: string;
      notes: string;
    }>,
  });

  const [selectedPOId, setSelectedPOId] = useState('');
  const { data: selectedPO } = usePurchaseOrder(selectedPOId);
  const { data: selectedPOItems } = usePurchaseOrderItems(selectedPOId);

  useEffect(() => {
    if (receipt) {
      setFormData({
        purchaseOrderId: receipt.purchaseOrderId || '',
        supplierId: receipt.supplierId,
        receiptDate: new Date(receipt.receiptDate).toISOString().split('T')[0],
        invoiceNumber: receipt.invoiceNumber || '',
        invoiceDate: receipt.invoiceDate ? new Date(receipt.invoiceDate).toISOString().split('T')[0] : '',
        invoiceAmount: receipt.invoiceAmount || 0,
        notes: receipt.notes || '',
        items: [],
      });
    }
  }, [receipt]);

  const handlePOSelection = (poId: string) => {
    setSelectedPOId(poId);
    setFormData(prev => ({
      ...prev,
      purchaseOrderId: poId,
    }));
  };

  useEffect(() => {
    if (selectedPO && selectedPOItems) {
      setFormData(prev => ({
        ...prev,
        supplierId: selectedPO.supplierId,
        items: selectedPOItems.map((item: any) => ({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          quantityOrdered: item.quantity,
          quantityReceived: item.quantityPending,
          quantityAccepted: 0,
          quantityRejected: 0,
          unitPrice: item.unitPrice,
          qualityStatus: 'PENDING' as const,
          rejectionReason: '',
          lotNumber: '',
          expiryDate: '',
          notes: '',
        })),
      }));
    }
  }, [selectedPO, selectedPOItems]);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: '',
          quantityOrdered: 0,
          quantityReceived: 0,
          quantityAccepted: 0,
          quantityRejected: 0,
          unitPrice: 0,
          qualityStatus: 'PENDING' as const,
          rejectionReason: '',
          lotNumber: '',
          expiryDate: '',
          notes: '',
        },
      ],
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
      items: prev.items.map((item, i) => {
        if (i !== index) return item;

        const updatedItem = { ...item, [field]: value };

        // Auto-calculate accepted/rejected quantities
        if (field === 'quantityReceived' || field === 'qualityStatus') {
          if (updatedItem.qualityStatus === 'APPROVED') {
            updatedItem.quantityAccepted = updatedItem.quantityReceived;
            updatedItem.quantityRejected = 0;
          } else if (updatedItem.qualityStatus === 'REJECTED') {
            updatedItem.quantityAccepted = 0;
            updatedItem.quantityRejected = updatedItem.quantityReceived;
          } else if (updatedItem.qualityStatus === 'PENDING') {
            updatedItem.quantityAccepted = 0;
            updatedItem.quantityRejected = 0;
          }
        }

        return updatedItem;
      }),
    }));
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = productsData?.data.find((p: any) => p.id === productId);
    if (product) {
      updateItem(index, 'productId', productId);
      updateItem(index, 'unitPrice', product.costPrice || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (item.quantityReceived <= 0) {
        toast.error('A quantidade recebida deve ser maior que zero');
        return;
      }
    }

    try {
      const payload = {
        purchaseOrderId: formData.purchaseOrderId || undefined,
        supplierId: formData.supplierId,
        receiptDate: formData.receiptDate,
        invoiceNumber: formData.invoiceNumber || undefined,
        invoiceDate: formData.invoiceDate || undefined,
        invoiceAmount: formData.invoiceAmount || undefined,
        notes: formData.notes || undefined,
        items: formData.items.map(item => ({
          purchaseOrderItemId: item.purchaseOrderItemId || undefined,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered || undefined,
          quantityReceived: item.quantityReceived,
          quantityAccepted: item.quantityAccepted,
          quantityRejected: item.quantityRejected,
          unitPrice: item.unitPrice || undefined,
          qualityStatus: item.qualityStatus,
          rejectionReason: item.rejectionReason || undefined,
          lotNumber: item.lotNumber || undefined,
          expiryDate: item.expiryDate || undefined,
          notes: item.notes || undefined,
        })),
      };

      if (isEditing) {
        await updateReceipt.mutateAsync({ id: id!, data: payload });
        toast.success('Recebimento atualizado!');
      } else {
        await createReceipt.mutateAsync(payload);
        toast.success('Recebimento criado!');
      }

      navigate('/goods-receipts');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  const getProductName = (productId: string) => {
    const product = productsData?.data.find((p: any) => p.id === productId);
    return product ? `${product.name} (${product.sku})` : 'Produto não encontrado';
  };


  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <button onClick={() => navigate('/goods-receipts')} className="text-blue-600 hover:text-blue-800 mb-4">
          Voltar para Recebimentos
        </button>
        <h1 className="text-3xl font-bold">{isEditing ? 'Editar Recebimento' : 'Novo Recebimento de Mercadoria'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Ordem de Compra (opcional)</label>
            <select
              value={formData.purchaseOrderId}
              onChange={(e) => handlePOSelection(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma ordem de compra (ou deixe em branco)</option>
              {purchaseOrdersData?.data.map((po: any) => (
                <option key={po.id} value={po.id}>
                  {po.orderNumber} - {po.supplier?.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecionar uma OC preencherá automaticamente os itens
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor *</label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              required
              disabled={!!formData.purchaseOrderId}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
            <label className="block text-sm font-medium mb-1">Data de Recebimento *</label>
            <input
              type="date"
              value={formData.receiptDate}
              onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Número da NF-e</label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="Número da nota fiscal..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data da NF-e</label>
            <input
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor da NF-e (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.invoiceAmount / 100}
              onChange={(e) => setFormData({ ...formData, invoiceAmount: Math.round(parseFloat(e.target.value || '0') * 100) })}
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
              placeholder="Observações gerais do recebimento..."
              className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Itens Recebidos</h2>
            {!formData.purchaseOrderId && (
              <button
                type="button"
                onClick={addItem}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Adicionar Item
              </button>
            )}
          </div>

          <div className="space-y-6">
            {formData.items.map((item, index) => (
              <div key={index} className="p-4 border-2 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Produto *</label>
                    {item.purchaseOrderItemId ? (
                      <div className="px-3 py-2 bg-white border rounded">
                        {getProductName(item.productId)}
                      </div>
                    ) : (
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Selecione...</option>
                        {productsData?.data.map((product: any) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (SKU: {product.sku})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Qtd Solicitada</label>
                    <input
                      type="number"
                      value={item.quantityOrdered}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Qtd Recebida *</label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantityReceived}
                      onChange={(e) => updateItem(index, 'quantityReceived', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Status de Qualidade *</label>
                    <select
                      value={item.qualityStatus}
                      onChange={(e) => updateItem(index, 'qualityStatus', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {QUALITY_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Qtd Aceita</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantityReceived}
                      value={item.quantityAccepted}
                      onChange={(e) => updateItem(index, 'quantityAccepted', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Qtd Rejeitada</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantityReceived}
                      value={item.quantityRejected}
                      onChange={(e) => updateItem(index, 'quantityRejected', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Lote</label>
                    <input
                      type="text"
                      value={item.lotNumber}
                      onChange={(e) => updateItem(index, 'lotNumber', e.target.value)}
                      placeholder="Número do lote..."
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data de Validade</label>
                    <input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Motivo de Rejeição / Observações</label>
                    <input
                      type="text"
                      value={item.rejectionReason || item.notes}
                      onChange={(e) => {
                        if (item.qualityStatus === 'REJECTED') {
                          updateItem(index, 'rejectionReason', e.target.value);
                        } else {
                          updateItem(index, 'notes', e.target.value);
                        }
                      }}
                      placeholder={item.qualityStatus === 'REJECTED' ? 'Motivo da rejeição...' : 'Observações do item...'}
                      className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {!item.purchaseOrderItemId && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remover Item
                    </button>
                  </div>
                )}
              </div>
            ))}

            {formData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded">
                {formData.purchaseOrderId
                  ? 'Selecione uma ordem de compra para carregar os itens automaticamente.'
                  : 'Nenhum item adicionado. Clique em "Adicionar Item" para começar.'}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={createReceipt.isPending || updateReceipt.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createReceipt.isPending || updateReceipt.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar Recebimento'
              : 'Criar Recebimento'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/goods-receipts')}
            className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
