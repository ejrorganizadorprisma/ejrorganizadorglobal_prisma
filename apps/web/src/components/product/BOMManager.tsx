import { useState } from 'react';
import { Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductBOM,
  useAddProductPart,
  useRemoveProductPart,
} from '../../hooks/useProductParts';
import { useProducts } from '../../hooks/useProducts';
import { AssemblyAvailabilityModal } from './AssemblyAvailabilityModal';

interface BOMManagerProps {
  productId: string;
}

interface AddPartFormData {
  partId: string;
  quantity: number;
  isOptional: boolean;
}

export function BOMManager({ productId }: BOMManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [formData, setFormData] = useState<AddPartFormData>({
    partId: '',
    quantity: 1,
    isOptional: false,
  });

  const { data: bomData, isLoading } = useProductBOM(productId);
  const { data: productsData } = useProducts({ limit: 1000 });
  const addPartMutation = useAddProductPart();
  const removePartMutation = useRemoveProductPart();

  const parts = productsData?.data?.filter((p) => p.isPart) || [];

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partId || formData.quantity <= 0) return;

    try {
      await addPartMutation.mutateAsync({
        productId,
        data: {
          partId: formData.partId,
          quantity: formData.quantity,
          isOptional: formData.isOptional,
        },
      });
      toast.success('Peça adicionada ao BOM');
      setFormData({ partId: '', quantity: 1, isOptional: false });
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar peça');
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!confirm('Deseja remover esta peça do BOM?')) return;

    try {
      await removePartMutation.mutateAsync({ productId, partId });
      toast.success('Peça removida do BOM');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover peça');
    }
  };

  const totalBOMCost =
    bomData?.reduce((sum, item) => sum + item.totalCost, 0) || 0;

  if (isLoading) {
    return <div className="text-center py-8">Carregando BOM...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          BOM - Bill of Materials
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <CheckCircle className="w-4 h-4" />
            Verificar Disponibilidade
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar Peça
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddPart} className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peça *
              </label>
              <select
                value={formData.partId}
                onChange={(e) =>
                  setFormData({ ...formData, partId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma peça</option>
                {parts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name} (Estoque: {product.currentStock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOptional}
                onChange={(e) =>
                  setFormData({ ...formData, isOptional: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Peça opcional
              </span>
            </label>

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ partId: '', quantity: 1, isOptional: false });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={addPartMutation.isPending}
              >
                {addPartMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </form>
      )}

      {!bomData || bomData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhuma peça adicionada ao BOM
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Unit.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bomData.map((item) => (
                <tr key={item.partId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.partCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.partName}
                    {item.isOptional && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Opcional
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(item.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`font-medium ${
                        item.availableStock >= item.quantity
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.availableStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => handleRemovePart(item.partId)}
                      className="text-red-600 hover:text-red-900"
                      title="Remover peça"
                      disabled={removePartMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-sm font-medium text-gray-900 text-right"
                >
                  Custo Total do BOM:
                </td>
                <td
                  colSpan={3}
                  className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right"
                >
                  {formatCurrency(totalBOMCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AssemblyAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        productId={productId}
      />
    </div>
  );
}
