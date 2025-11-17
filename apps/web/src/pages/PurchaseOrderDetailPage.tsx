import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder, useSendPurchaseOrder, useConfirmPurchaseOrder, useCancelPurchaseOrder } from '../hooks/usePurchaseOrders';
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
  const { data: order, isLoading } = usePurchaseOrder(id);
  const sendPO = useSendPurchaseOrder();
  const confirmPO = useConfirmPurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();

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

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Ordem de Compra {order.orderNumber}</h1>
            <div className="mt-2">
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                }`}
              >
                {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Fornecedor</label>
            <p className="text-lg">{order.supplier?.name || '-'}</p>
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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                  Observações
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
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{item.notes || '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
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
    </div>
  );
}
