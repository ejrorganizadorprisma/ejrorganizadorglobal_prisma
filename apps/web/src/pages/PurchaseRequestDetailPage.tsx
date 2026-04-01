import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseRequest, useReviewPurchaseRequest, useConvertToPurchaseOrder } from '../hooks/usePurchaseRequests';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { toast } from 'sonner';

const STATUS_LABELS = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CONVERTED: 'Convertido',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CONVERTED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const PRIORITY_LABELS = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-700',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export function PurchaseRequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: request, isLoading } = usePurchaseRequest(id);
  const reviewPR = useReviewPurchaseRequest();
  const convertPR = useConvertToPurchaseOrder();
  const { hasActionPermission } = usePagePermissions();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    reviewNotes: '',
  });

  const handleReview = async () => {
    if (!id) return;

    try {
      await reviewPR.mutateAsync({ id, data: reviewData });
      toast.success(`Requisição ${reviewData.status === 'APPROVED' ? 'aprovada' : 'rejeitada'}!`);
      setShowReviewModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao revisar');
    }
  };

  const handleConvert = async () => {
    if (!id || !window.confirm('Converter esta requisição em Ordem de Compra?')) return;

    try {
      const result = await convertPR.mutateAsync(id);

      // Check if multiple orders were created
      const totalOrders = result?.data?.totalOrders || 1;
      const orders = result?.data?.orders || [];

      if (totalOrders > 1) {
        // Multiple orders created - show summary
        const ordersList = orders.map((o: any) =>
          `• ${o.orderNumber} - ${o.supplierName} (${o.itemCount} ${o.itemCount === 1 ? 'item' : 'itens'})`
        ).join('\n');

        toast.success(
          `Requisição convertida em ${totalOrders} Ordens de Compra (agrupadas por fornecedor):\n\n${ordersList}`,
          { duration: 8000 }
        );

        // Navigate to purchase orders list
        setTimeout(() => {
          navigate('/purchase-orders');
        }, 1000);
      } else {
        // Single order created
        toast.success('Requisição convertida em Ordem de Compra!');
        if (result?.data?.id) {
          setTimeout(() => {
            navigate(`/purchase-orders/${result.data.id}`);
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Erro na conversão:', error);
      toast.error(error.response?.data?.error?.message || error.message || 'Erro ao converter');
    }
  };

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

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Requisição não encontrada</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button onClick={() => navigate('/purchase-requests')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Voltar para Requisições
        </button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Requisição {request.requestNumber}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]
                }`}
              >
                {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
              </span>
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]
                }`}
              >
                Prioridade: {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {request.status === 'PENDING' && (
              <>
                <button
                  onClick={() => navigate(`/purchase-requests/${id}/edit`)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setReviewData({ status: 'APPROVED', reviewNotes: '' });
                    setShowReviewModal(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => {
                    setReviewData({ status: 'REJECTED', reviewNotes: '' });
                    setShowReviewModal(true);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Rejeitar
                </button>
              </>
            )}
            {request.status === 'APPROVED' && hasActionPermission('purchase_requests', 'convert') && (
              <button
                onClick={handleConvert}
                disabled={convertPR.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {convertPR.isPending ? 'Convertendo...' : 'Converter em Ordem de Compra'}
              </button>
            )}
            {request.status === 'CONVERTED' && request.convertedToPurchaseOrderId && (
              <button
                onClick={() => navigate(`/purchase-orders/${request.convertedToPurchaseOrderId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ver Ordem de Compra
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Nome</label>
            <p className="text-lg font-medium">{request.title}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Solicitante</label>
            <p className="text-lg">{request.requestedByUser?.name || '-'}</p>
            <p className="text-sm text-gray-500">{request.requestedByUser?.email || ''}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Departamento</label>
            <p className="text-lg">{request.department || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Data da Requisição</label>
            <p className="text-lg">{formatDate(request.requestedDate)}</p>
          </div>
          {request.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Descrição</label>
              <p className="text-lg">{request.description}</p>
            </div>
          )}
          {request.justification && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Justificativa</label>
              <p className="text-lg bg-blue-50 p-3 rounded">{request.justification}</p>
            </div>
          )}
        </div>
      </div>

      {(request.reviewedBy || request.reviewNotes) && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Revisão</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {request.reviewedByUser && (
              <div>
                <label className="block text-sm font-medium text-gray-600">Revisado por</label>
                <p className="text-lg">{request.reviewedByUser.name}</p>
                <p className="text-sm text-gray-500">{request.reviewedByUser.email}</p>
              </div>
            )}
            {request.reviewedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-600">Data da Revisão</label>
                <p className="text-lg">{formatDate(request.reviewedAt)}</p>
              </div>
            )}
            {request.reviewNotes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600">Observações da Revisão</label>
                <p className="text-lg bg-yellow-50 p-3 rounded">{request.reviewNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        <h2 className="text-xl font-semibold mb-4">Itens Solicitados</h2>
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
                  Observações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {request.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product?.name || '-'}</div>
                    <div className="text-sm text-gray-500">{item.product?.code || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.quantity}</div>
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

      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {reviewData.status === 'APPROVED' ? 'Aprovar' : 'Rejeitar'} Requisição
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Observações</label>
              <textarea
                value={reviewData.reviewNotes}
                onChange={(e) => setReviewData({ ...reviewData, reviewNotes: e.target.value })}
                rows={4}
                placeholder="Adicione observações sobre esta decisão..."
                className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReview}
                disabled={reviewPR.isPending}
                className={`flex-1 px-4 py-2 rounded text-white ${
                  reviewData.status === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {reviewPR.isPending ? 'Processando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
