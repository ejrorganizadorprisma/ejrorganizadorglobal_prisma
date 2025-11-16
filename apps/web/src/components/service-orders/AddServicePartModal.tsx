import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import type { AddServicePartDTO } from '@ejr/shared-types';

interface AddServicePartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: AddServicePartDTO) => void;
  isLoading?: boolean;
}

export function AddServicePartModal({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
}: AddServicePartModalProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Buscar produtos que são peças (isPart = true)
  const { data: productsData } = useProducts({
    limit: 1000,
  });

  const parts = productsData?.data?.filter((p) => p.isPart) || [];
  const selectedProduct = parts.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (!isOpen) {
      setSelectedProductId('');
      setQuantity(1);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    onAdd({
      productId: selectedProductId,
      quantity,
    });
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    return selectedProduct.costPrice * quantity;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Adicionar Peça</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peça *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              >
                <option value="">Selecione uma peça</option>
                {parts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estoque disponível:</span>
                  <span className="font-medium text-gray-900">
                    {selectedProduct.currentStock} unidades
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Custo unitário:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(selectedProduct.costPrice)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>

            {selectedProduct && quantity > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    Custo Total:
                  </span>
                  <span className="text-sm font-bold text-blue-900">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            {selectedProduct && quantity > selectedProduct.currentStock && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  Atenção: A quantidade solicitada é maior que o estoque disponível.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              disabled={isLoading || !selectedProductId || quantity <= 0}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
