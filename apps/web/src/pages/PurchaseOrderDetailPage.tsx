import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder, useSendPurchaseOrder, useConfirmPurchaseOrder, useCancelPurchaseOrder } from '../hooks/usePurchaseOrders';
import { useGenerateSupplierOrders, useSupplierOrdersByPurchaseOrder } from '../hooks/useSupplierOrders';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { toast } from 'sonner';

const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  CONFIRMED: 'Confirmado',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-yellow-100 text-yellow-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatPrice } = useFormatPrice();
  const { data: order, isLoading } = usePurchaseOrder(id);
  const { data: supplierOrders } = useSupplierOrdersByPurchaseOrder(id);
  const sendPO = useSendPurchaseOrder();
  const confirmPO = useConfirmPurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();
  const generateSupplierOrders = useGenerateSupplierOrders();

  const handleSend = async () => {
    if (!id || !window.confirm('Deseja enviar esta ordem de compra ao fornecedor?')) return;

    try {
      await sendPO.mutateAsync(id);
      toast.success('Ordem enviada ao fornecedor!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao enviar');
    }
  };

  const handleConfirm = async () => {
    if (!id || !window.confirm('Confirmar recebimento desta ordem pelo fornecedor?')) return;

    try {
      await confirmPO.mutateAsync(id);
      toast.success('Ordem confirmada pelo fornecedor!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao confirmar');
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm('Tem certeza que deseja cancelar esta ordem de compra?')) return;

    try {
      await cancelPO.mutateAsync(id);
      toast.success('Ordem de compra cancelada!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
    }
  };

  const handleGenerateSupplierOrders = async () => {
    if (!id) return;

    // Verificar se todos os itens têm fornecedor
    const itemsWithoutSupplier = order?.items?.filter((item: any) => !item.supplierId);
    if (itemsWithoutSupplier && itemsWithoutSupplier.length > 0) {
      toast.error('Todos os itens precisam ter um fornecedor definido. Edite a OC para adicionar fornecedores aos itens.');
      return;
    }

    if (!window.confirm('Deseja gerar pedidos por fornecedor a partir desta ordem de compra? Os itens serão agrupados por fornecedor.')) return;

    try {
      const result = await generateSupplierOrders.mutateAsync(id);
      toast.success(`${result.data.length} pedido(s) gerado(s) com sucesso!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao gerar pedidos');
    }
  };

  const hasSupplierOrders = supplierOrders && supplierOrders.length > 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Ordem de compra não encontrada</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/purchase-orders')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Voltar para Ordens de Compra
        </button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Ordem de Compra {order.orderNumber}</h1>
            {order.name && (
              <p className="text-lg text-gray-600 mt-1">{order.name}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                }`}
              >
                {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
              </span>
              {order.purchaseRequest && (
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                  Origem: {order.purchaseRequest.requestNumber}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => navigate(`/purchase-orders/${id}/edit`)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                >
                  Editar
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendPO.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {sendPO.isPending ? 'Enviando...' : 'Enviar ao Fornecedor'}
                </button>
              </>
            )}
            {order.status === 'SENT' && (
              <button
                onClick={handleConfirm}
                disabled={confirmPO.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {confirmPO.isPending ? 'Confirmando...' : 'Confirmar Recebimento'}
              </button>
            )}
            {(order.status === 'DRAFT' || order.status === 'SENT' || order.status === 'CONFIRMED') && !hasSupplierOrders && (
              <button
                onClick={handleGenerateSupplierOrders}
                disabled={generateSupplierOrders.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {generateSupplierOrders.isPending ? 'Gerando...' : 'Gerar Pedidos'}
              </button>
            )}
            {hasSupplierOrders && (
              <button
                onClick={() => navigate('/supplier-orders')}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Ver Pedidos ({supplierOrders.length})
              </button>
            )}
            {(order.status === 'DRAFT' || order.status === 'SENT') && (
              <button
                onClick={handleCancel}
                disabled={cancelPO.isPending}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {cancelPO.isPending ? 'Cancelando...' : 'Cancelar Ordem'}
              </button>
            )}
          </div>
        </div>
      </div>

      {order.purchaseRequest && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-medium">
                Esta ordem de compra foi criada a partir da requisição <strong>{order.purchaseRequest.requestNumber}</strong>
                {order.purchaseRequest.title && <span> - {order.purchaseRequest.title}</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Fornecedor</label>
            <p className="text-lg">{order.supplier?.name || <span className="text-gray-400 italic">Não definido - Edite para adicionar</span>}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Data da Ordem</label>
            <p className="text-lg">{formatDate(order.orderDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Data de Entrega Prevista</label>
            <p className="text-lg">{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Condições de Pagamento</label>
            <p className="text-lg">{order.paymentTerms || '-'}</p>
          </div>
          {order.notes && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Observações</label>
              <p className="text-lg">{order.notes}</p>
            </div>
          )}
          {order.internalNotes && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Observações Internas</label>
              <p className="text-lg bg-yellow-50 p-3 rounded">{order.internalNotes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Itens da Ordem</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fornecedor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product?.name || '-'}</div>
                    <div className="text-sm text-gray-500">{item.product?.code || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.quantity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatPrice(item.unitPrice)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatPrice(item.totalPrice)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.supplier?.name || '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <div className="flex justify-end">
          <div className="w-80">
            <div className="flex justify-between py-2">
              <span className="font-medium">Subtotal:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Custo de Envio:</span>
              <span>{formatPrice(order.shippingCost || 0)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Desconto:</span>
              <span>-{formatPrice(order.discountAmount || 0)}</span>
            </div>
            <div className="flex justify-between py-2 text-xl font-bold border-t mt-2 pt-2">
              <span>Total:</span>
              <span className="text-green-600">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pedidos por Fornecedor */}
      {hasSupplierOrders && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Pedidos por Fornecedor</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Itens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supplierOrders.map((so: any) => (
                  <tr key={so.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{so.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{so.supplier?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{so.items?.length || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatPrice(so.totalAmount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        so.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        so.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                        so.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        so.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                        so.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {so.status === 'PENDING' ? 'Pendente' :
                         so.status === 'SENT' ? 'Enviado' :
                         so.status === 'CONFIRMED' ? 'Confirmado' :
                         so.status === 'RECEIVED' ? 'Recebido' :
                         so.status === 'CANCELLED' ? 'Cancelado' : so.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/supplier-orders/${so.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
