import { useState } from 'react';
import { PurchaseSuggestionsModal } from './PurchaseSuggestionsModal';

/**
 * Exemplo de uso do PurchaseSuggestionsModal
 *
 * Este componente exibe sugestões de compras para materiais faltantes
 * necessários para a produção de um produto.
 */
export function PurchaseSuggestionsModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    quantity: number;
  } | null>(null);

  const handleOpenModal = (productId: string, quantity: number) => {
    setSelectedProduct({ id: productId, quantity });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div>
      {/* Botão para abrir o modal */}
      <button
        onClick={() => handleOpenModal('product-123', 10)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Ver Sugestões de Compras
      </button>

      {/* Modal de sugestões */}
      {selectedProduct && (
        <PurchaseSuggestionsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          productId={selectedProduct.id}
          quantity={selectedProduct.quantity}
        />
      )}
    </div>
  );
}

/**
 * Exemplo de integração com um formulário de ordem de produção
 */
export function ProductionOrderFormWithSuggestions() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
  });

  const handleCheckMaterials = () => {
    if (!formData.productId || formData.quantity <= 0) {
      alert('Selecione um produto e quantidade válida');
      return;
    }
    setShowSuggestions(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Nova Ordem de Produção</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Produto</label>
          <select
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Selecione...</option>
            <option value="product-123">Produto A</option>
            <option value="product-456">Produto B</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantidade</label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
            }
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <button
          onClick={handleCheckMaterials}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          Verificar Materiais e Sugestões de Compra
        </button>
      </div>

      <PurchaseSuggestionsModal
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        productId={formData.productId}
        quantity={formData.quantity}
      />
    </div>
  );
}
