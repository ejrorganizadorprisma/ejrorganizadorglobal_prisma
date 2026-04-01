import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useSupplierOrder,
  useSendSupplierOrder,
  useConfirmSupplierOrder,
  useCancelSupplierOrder,
  useUpdateSupplierOrder,
} from '../hooks/useSupplierOrders';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useAuth } from '../hooks/useAuth';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { toast } from 'sonner';
import { generateSupplierOrderPdf, type DocumentSettingsForPdf } from '../services/supplierOrderPdf';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  CONFIRMED: 'Confirmado',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  const { data: order, isLoading } = useSupplierOrder(id);
  const { data: documentSettings } = useDefaultDocumentSettings();
  const sendOrder = useSendSupplierOrder();
  const confirmOrder = useConfirmSupplierOrder();
  const cancelOrder = useCancelSupplierOrder();
  const updateOrder = useUpdateSupplierOrder();

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const handleGeneratePdf = () => {
    if (order) {
      const pdfSettings: DocumentSettingsForPdf | undefined = documentSettings ? {
        companyLogo: documentSettings.companyLogo || undefined,
        companyName: documentSettings.companyName || undefined,
        footerText: documentSettings.footerText || undefined,
        footerAddress: documentSettings.footerAddress || undefined,
        footerPhone: documentSettings.footerPhone || undefined,
        footerEmail: documentSettings.footerEmail || undefined,
        footerWebsite: documentSettings.footerWebsite || undefined,
        primaryColor: documentSettings.primaryColor || undefined,
        secondaryColor: documentSettings.secondaryColor || undefined,
      } : undefined;
      generateSupplierOrderPdf(order, pdfSettings, defaultCurrency);
      toast.success('PDF gerado com sucesso!');
    }
  };

  const handleSend = async () => {
    if (window.confirm('Marcar este pedido como enviado ao fornecedor?')) {
      try {
        await sendOrder.mutateAsync(id!);
        toast.success('Pedido marcado como enviado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao enviar');
      }
    }
  };

  const handleConfirm = async () => {
    if (window.confirm('Confirmar recebimento deste pedido pelo fornecedor?')) {
      try {
        await confirmOrder.mutateAsync(id!);
        toast.success('Pedido confirmado pelo fornecedor!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao confirmar');
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await cancelOrder.mutateAsync(id!);
        toast.success('Pedido cancelado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
      }
    }
  };

  const handleStartEdit = () => {
    setNotes(order?.notes || '');
    setInternalNotes(order?.internalNotes || '');
    setPaymentTerms(order?.paymentTerms || '');
    setExpectedDeliveryDate(order?.expectedDeliveryDate?.split('T')[0] || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateOrder.mutateAsync({
        id: id!,
        data: {
          notes: notes || undefined,
          internalNotes: internalNotes || undefined,
          paymentTerms: paymentTerms || undefined,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
        },
      });
      toast.success('Pedido atualizado!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar');
    }
  };

  const { formatPrice, defaultCurrency } = useFormatPrice();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Pedido não encontrado</h2>
          <button
            onClick={() => navigate('/supplier-orders')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate('/supplier-orders')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                  Pedido {order.orderNumber}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Grupo: {order.groupCode}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {order.status === 'PENDING' && !isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
              )}

              <button
                onClick={handleGeneratePdf}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Gerar PDF
              </button>

              {order.status === 'PENDING' && (
                <button
                  onClick={handleSend}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Marcar como Enviado
                </button>
              )}

              {order.status === 'SENT' && (
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Confirmar Recebimento
                </button>
              )}

              {(order.status === 'PENDING' || order.status === 'SENT') && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Cancelar
                </button>
              )}

              {(order.status === 'CONFIRMED' || order.status === 'PARTIAL') && (
                <button
                  onClick={() => navigate(`/goods-receipts/new?supplierOrderId=${id}`)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  Registrar Recebimento
                </button>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Fornecedor */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Fornecedor</h3>
              <p className="text-lg font-semibold text-gray-900">{order.supplier?.name || '-'}</p>
              {order.supplier?.document && (
                <p className="text-sm text-gray-500">{order.supplier.document}</p>
              )}
            </div>

            {/* Ordem de Compra */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ordem de Compra</h3>
              <p className="text-lg font-semibold text-gray-900">
                {order.purchaseOrder?.orderNumber || '-'}
              </p>
              {order.purchaseOrder?.name && (
                <p className="text-sm text-gray-500 truncate" title={order.purchaseOrder.name}>
                  {order.purchaseOrder.name}
                </p>
              )}
              <button
                onClick={() => navigate(`/purchase-orders/${order.purchaseOrderId}`)}
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                Ver OC
              </button>
            </div>

            {/* Datas */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Datas</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Data do Pedido:</span>{' '}
                  <span className="font-medium">{formatDate(order.orderDate)}</span>
                </p>
                {order.expectedDeliveryDate && (
                  <p>
                    <span className="text-gray-500">Entrega Prevista:</span>{' '}
                    <span className="font-medium">{formatDate(order.expectedDeliveryDate)}</span>
                  </p>
                )}
                {order.sentAt && (
                  <p>
                    <span className="text-gray-500">Enviado em:</span>{' '}
                    <span className="font-medium">{formatDateTime(order.sentAt)}</span>
                  </p>
                )}
                {order.confirmedAt && (
                  <p>
                    <span className="text-gray-500">Confirmado em:</span>{' '}
                    <span className="font-medium">{formatDateTime(order.confirmedAt)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Previsão de Entrega
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condições de Pagamento
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ex: 30/60/90 dias"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (visível ao fornecedor)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações Internas
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateOrder.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateOrder.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Notes Display (when not editing) */}
          {!isEditing && (order.notes || order.internalNotes || order.paymentTerms) && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.paymentTerms && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Condições de Pagamento</h4>
                    <p className="text-gray-900">{order.paymentTerms}</p>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Observações</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
                {order.internalNotes && isAdmin && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Observações Internas</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{order.internalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Itens do Pedido</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recebido
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Unit.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desconto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product?.code || '-'}
                      </div>
                      <div className="text-sm text-gray-500">{item.product?.name || '-'}</div>
                      {item.notes && (
                        <div className="text-xs text-gray-400 mt-1">{item.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.quantityReceived}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span
                        className={
                          item.quantityPending > 0
                            ? 'text-orange-600 font-medium'
                            : 'text-green-600'
                        }
                      >
                        {item.quantityPending}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatPrice(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatPrice(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 px-4 lg:px-6 py-4 border-t border-gray-200">
              <div className="flex flex-wrap justify-end gap-4 sm:gap-8">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Subtotal</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatPrice(order.subtotal)}
                  </div>
                </div>
                {order.discountAmount > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Desconto</div>
                    <div className="text-sm font-medium text-red-600">
                      -{formatPrice(order.discountAmount)}
                    </div>
                  </div>
                )}
                {order.shippingCost > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Frete</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(order.shippingCost)}
                    </div>
                  </div>
                )}
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPrice(order.totalAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 text-sm text-gray-500">
            <p>
              Criado em: {formatDateTime(order.createdAt)}
              {order.updatedAt !== order.createdAt && (
                <> | Atualizado em: {formatDateTime(order.updatedAt)}</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
