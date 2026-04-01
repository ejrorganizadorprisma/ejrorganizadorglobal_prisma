import { useParams, useNavigate } from 'react-router-dom';
import {
  useGoodsReceipt,
  useGoodsReceiptItems,
  useApproveGoodsReceipt,
  useRejectGoodsReceipt,
  useDeleteGoodsReceipt,
} from '../hooks/useGoodsReceipts';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  INSPECTED: 'Inspecionado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  RETURNED: 'Devolvido',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  INSPECTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-orange-100 text-orange-800',
};

const QUALITY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  QUARANTINE: 'Quarentena',
};

const QUALITY_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  QUARANTINE: 'bg-orange-100 text-orange-800',
};

export function GoodsReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: receipt, isLoading } = useGoodsReceipt(id);
  const { data: items, isLoading: loadingItems } = useGoodsReceiptItems(id);
  const approveReceipt = useApproveGoodsReceipt();
  const rejectReceipt = useRejectGoodsReceipt();
  const deleteReceipt = useDeleteGoodsReceipt();

  const handleApprove = async () => {
    if (window.confirm('Aprovar este recebimento? O estoque sera atualizado.')) {
      try {
        await approveReceipt.mutateAsync(id!);
        toast.success('Recebimento aprovado! Estoque atualizado.');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao aprovar');
      }
    }
  };

  const handleReject = async () => {
    if (window.confirm('Tem certeza que deseja rejeitar este recebimento?')) {
      try {
        await rejectReceipt.mutateAsync(id!);
        toast.success('Recebimento rejeitado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao rejeitar');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este recebimento?')) {
      try {
        await deleteReceipt.mutateAsync(id!);
        toast.success('Recebimento excluido!');
        navigate('/goods-receipts');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
      }
    }
  };

  const { formatPrice } = useFormatPrice();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Recebimento nao encontrado</h2>
          <button
            onClick={() => navigate('/goods-receipts')}
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
                  onClick={() => navigate('/goods-receipts')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                  Recebimento {receipt.receiptNumber}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    STATUS_COLORS[receipt.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {STATUS_LABELS[receipt.status] || receipt.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {receipt.status === 'PENDING' && (
                <button
                  onClick={() => navigate(`/goods-receipts/${id}/edit`)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
              )}

              {(receipt.status === 'PENDING' || receipt.status === 'INSPECTED') && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveReceipt.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {approveReceipt.isPending ? 'Aprovando...' : 'Aprovar'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectReceipt.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectReceipt.isPending ? 'Rejeitando...' : 'Rejeitar'}
                  </button>
                </>
              )}

              {receipt.status === 'PENDING' && (
                <button
                  onClick={handleDelete}
                  disabled={deleteReceipt.isPending}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Fornecedor */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Fornecedor</h3>
              <p className="text-lg font-semibold text-gray-900">{(receipt as any).supplier?.name || '-'}</p>
            </div>

            {/* Pedido */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Pedido do Fornecedor</h3>
              <p className="text-lg font-semibold text-gray-900">
                {(receipt as any).supplierOrder?.orderNumber || (receipt as any).purchaseOrder?.orderNumber || '-'}
              </p>
              {(receipt as any).supplierOrderId && (
                <button
                  onClick={() => navigate(`/supplier-orders/${(receipt as any).supplierOrderId}`)}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                >
                  Ver Pedido
                </button>
              )}
            </div>

            {/* Datas */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Datas</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Data Recebimento:</span>{' '}
                  <span className="font-medium">{formatDate(receipt.receiptDate)}</span>
                </p>
                {receipt.invoiceDate && (
                  <p>
                    <span className="text-gray-500">Data NF-e:</span>{' '}
                    <span className="font-medium">{formatDate(receipt.invoiceDate)}</span>
                  </p>
                )}
                {receipt.inspectedAt && (
                  <p>
                    <span className="text-gray-500">Inspecionado em:</span>{' '}
                    <span className="font-medium">{formatDateTime(receipt.inspectedAt)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          {(receipt.invoiceNumber || receipt.invoiceAmount) && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nota Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {receipt.invoiceNumber && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Numero NF-e</h4>
                    <p className="text-gray-900">{receipt.invoiceNumber}</p>
                  </div>
                )}
                {receipt.invoiceDate && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Data NF-e</h4>
                    <p className="text-gray-900">{formatDate(receipt.invoiceDate)}</p>
                  </div>
                )}
                {receipt.invoiceAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Valor NF-e</h4>
                    <p className="text-gray-900 font-semibold">{formatPrice(receipt.invoiceAmount)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {receipt.notes && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Observacoes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{receipt.notes}</p>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Itens Recebidos</h3>
            </div>

            {loadingItems ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd Pedida
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd Recebida
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd Aceita
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd Rejeitada
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qualidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lote
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items?.map((item: any) => (
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
                        {item.quantityOrdered || '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        {item.quantityReceived}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-green-600 font-medium">
                        {item.quantityAccepted}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                        {item.quantityRejected}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.qualityStatus && (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              QUALITY_STATUS_COLORS[item.qualityStatus] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {QUALITY_STATUS_LABELS[item.qualityStatus] || item.qualityStatus}
                          </span>
                        )}
                        {item.rejectionReason && (
                          <div className="text-xs text-red-500 mt-1">{item.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.lotNumber || '-'}
                        {item.expiryDate && (
                          <div className="text-xs text-gray-400">
                            Val: {formatDate(item.expiryDate)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}

            {items?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum item encontrado
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-4 text-sm text-gray-500">
            <p>
              Criado em: {formatDateTime(receipt.createdAt)}
              {receipt.updatedAt !== receipt.createdAt && (
                <> | Atualizado em: {formatDateTime(receipt.updatedAt)}</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
