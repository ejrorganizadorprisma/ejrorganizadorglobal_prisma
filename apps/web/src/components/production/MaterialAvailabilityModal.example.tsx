import { useState } from 'react';
import { MaterialAvailabilityModal } from './MaterialAvailabilityModal';

/**
 * Exemplo de uso do componente MaterialAvailabilityModal
 *
 * Este exemplo demonstra como integrar o modal de verificação de disponibilidade
 * de materiais em uma página ou componente de ordem de produção.
 */
export function MaterialAvailabilityModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Exemplo de dados de uma ordem de produção
  const productionOrder = {
    productId: 'prod-123',
    productName: 'Produto Acabado XYZ',
    quantity: 10,
  };

  const handleSuggestPurchases = () => {
    console.log('Sugerir compras para materiais faltantes');
    // Aqui você pode navegar para a página de pedidos de compra
    // ou abrir um modal para criar sugestões de compra
    setIsModalOpen(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Exemplo de Verificação de Materiais</h1>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-2">Ordem de Produção #OP-001</h2>
        <p className="text-gray-600 mb-4">
          Produto: {productionOrder.productName} - Quantidade: {productionOrder.quantity}
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Verificar Disponibilidade de Materiais
        </button>
      </div>

      <MaterialAvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={productionOrder.productId}
        productName={productionOrder.productName}
        quantity={productionOrder.quantity}
        onSuggestPurchases={handleSuggestPurchases}
      />
    </div>
  );
}

/**
 * Exemplo de integração com ProductionOrderCard
 *
 * Mostra como adicionar um botão de verificação de materiais
 * no card de ordem de produção existente.
 */
export function ProductionOrderCardWithAvailabilityCheck() {
  const [showAvailability, setShowAvailability] = useState(false);

  // Dados simulados da ordem de produção
  const order = {
    id: 'po-001',
    productId: 'prod-456',
    productName: 'Conjunto Montado ABC',
    quantityPlanned: 25,
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">OP-{order.id}</h3>
          <button
            onClick={() => setShowAvailability(true)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Verificar Materiais
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p>Produto: {order.productName}</p>
          <p>Quantidade: {order.quantityPlanned}</p>
        </div>
      </div>

      <MaterialAvailabilityModal
        isOpen={showAvailability}
        onClose={() => setShowAvailability(false)}
        productId={order.productId}
        productName={order.productName}
        quantity={order.quantityPlanned}
      />
    </>
  );
}
