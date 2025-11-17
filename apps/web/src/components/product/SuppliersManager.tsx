import { useState } from 'react';
import { toast } from 'sonner';
import {
  useProductSuppliers,
  useAddProductSupplier,
  useUpdateProductSupplier,
  useRemoveProductSupplier,
} from '../../hooks/useProductSuppliers';
import { useSuppliers } from '../../hooks/useSuppliers';

interface SuppliersManagerProps {
  productId: string;
}

export function SuppliersManager({ productId }: SuppliersManagerProps) {
  const { data: suppliers, isLoading } = useProductSuppliers(productId);
  const { data: allSuppliersData } = useSuppliers({ page: 1, limit: 100 });
  const addSupplier = useAddProductSupplier();
  const updateSupplier = useUpdateProductSupplier();
  const removeSupplier = useRemoveProductSupplier();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newSupplier, setNewSupplier] = useState({
    supplierId: '',
    supplierSku: '',
    unitPrice: 0,
    minimumQuantity: 1,
    leadTimeDays: 0,
    isPreferred: false,
    notes: '',
  });

  const [editData, setEditData] = useState({
    supplierSku: '',
    unitPrice: 0,
    minimumQuantity: 1,
    leadTimeDays: 0,
    isPreferred: false,
    notes: '',
  });

  const handleAdd = async () => {
    if (!newSupplier.supplierId) {
      toast.error('Selecione um fornecedor');
      return;
    }

    try {
      await addSupplier.mutateAsync({
        productId,
        data: {
          ...newSupplier,
          unitPrice: Math.round(newSupplier.unitPrice * 100),
        },
      });
      toast.success('Fornecedor vinculado!');
      setIsAdding(false);
      setNewSupplier({
        supplierId: '',
        supplierSku: '',
        unitPrice: 0,
        minimumQuantity: 1,
        leadTimeDays: 0,
        isPreferred: false,
        notes: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao vincular fornecedor');
    }
  };

  const startEdit = (supplier: any) => {
    setEditingId(supplier.id);
    setEditData({
      supplierSku: supplier.supplierSku || '',
      unitPrice: supplier.unitPrice / 100,
      minimumQuantity: supplier.minimumQuantity,
      leadTimeDays: supplier.leadTimeDays,
      isPreferred: supplier.isPreferred,
      notes: supplier.notes || '',
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateSupplier.mutateAsync({
        id,
        productId,
        data: {
          ...editData,
          unitPrice: Math.round(editData.unitPrice * 100),
        },
      });
      toast.success('Fornecedor atualizado!');
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar');
    }
  };

  const handleRemove = async (id: string, supplierId: string) => {
    if (!confirm('Tem certeza que deseja desvincular este fornecedor?')) return;

    try {
      await removeSupplier.mutateAsync({ id, productId, supplierId });
      toast.success('Fornecedor desvinculado!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao desvincular');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando fornecedores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fornecedores</h2>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Adicionar Fornecedor
        </button>
      </div>

      {isAdding && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-4">Novo Fornecedor</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Fornecedor *</label>
              <select
                value={newSupplier.supplierId}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplierId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Selecione...</option>
                {allSuppliersData?.data.map((sup: any) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SKU do Fornecedor</label>
              <input
                type="text"
                value={newSupplier.supplierSku}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplierSku: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Código no catálogo do fornecedor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Preço Unitário (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newSupplier.unitPrice}
                onChange={(e) => setNewSupplier({ ...newSupplier, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantidade Mínima</label>
              <input
                type="number"
                min="1"
                value={newSupplier.minimumQuantity}
                onChange={(e) => setNewSupplier({ ...newSupplier, minimumQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prazo de Entrega (dias)</label>
              <input
                type="number"
                min="0"
                value={newSupplier.leadTimeDays}
                onChange={(e) => setNewSupplier({ ...newSupplier, leadTimeDays: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newSupplier.isPreferred}
                  onChange={(e) => setNewSupplier({ ...newSupplier, isPreferred: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Fornecedor Preferencial</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Observações</label>
              <textarea
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addSupplier.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {addSupplier.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {suppliers && suppliers.length > 0 ? (
          suppliers.map((supplier: any) => (
            <div key={supplier.id} className="border rounded-lg p-4">
              {editingId === supplier.id ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <strong>{supplier.supplier.name}</strong>
                    {supplier.isPreferred && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Preferencial
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">SKU do Fornecedor</label>
                    <input
                      type="text"
                      value={editData.supplierSku}
                      onChange={(e) => setEditData({ ...editData, supplierSku: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Preço Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.unitPrice}
                      onChange={(e) => setEditData({ ...editData, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Quantidade Mínima</label>
                    <input
                      type="number"
                      min="1"
                      value={editData.minimumQuantity}
                      onChange={(e) => setEditData({ ...editData, minimumQuantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Prazo de Entrega (dias)</label>
                    <input
                      type="number"
                      min="0"
                      value={editData.leadTimeDays}
                      onChange={(e) => setEditData({ ...editData, leadTimeDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.isPreferred}
                        onChange={(e) => setEditData({ ...editData, isPreferred: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Fornecedor Preferencial</span>
                    </label>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Observações</label>
                    <textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      rows={2}
                    />
                  </div>

                  <div className="col-span-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(supplier.id)}
                      disabled={updateSupplier.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {updateSupplier.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <strong className="text-lg">{supplier.supplier.name}</strong>
                      {supplier.isPreferred && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Preferencial
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {supplier.supplierSku && (
                        <div>
                          <span className="font-medium">SKU:</span> {supplier.supplierSku}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Preço:</span> R$ {(supplier.unitPrice / 100).toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Qtd Mín:</span> {supplier.minimumQuantity}
                      </div>
                      <div>
                        <span className="font-medium">Prazo:</span> {supplier.leadTimeDays} dias
                      </div>
                    </div>
                    {supplier.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Obs:</span> {supplier.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(supplier)}
                      className="text-blue-600 hover:text-blue-800 px-3 py-1"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(supplier.id, supplier.supplierId)}
                      disabled={removeSupplier.isPending}
                      className="text-red-600 hover:text-red-800 px-3 py-1 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhum fornecedor vinculado. Clique em "Adicionar Fornecedor" para começar.
          </div>
        )}
      </div>
    </div>
  );
}
