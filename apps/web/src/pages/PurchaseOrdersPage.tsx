import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePurchaseOrders,
  useDeletePurchaseOrder,
  useConfirmPurchaseOrder,
  useCancelPurchaseOrder,
} from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useAuth } from '../hooks/useAuth';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { generatePurchaseOrderPdf } from '../services/purchaseOrderPdf';
import type { DocumentSettingsForPdf } from '../services/supplierOrderPdf';

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

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice, defaultCurrency } = useFormatPrice();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
    supplierId: supplierFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: documentSettings } = useDefaultDocumentSettings();
  const deletePO = useDeletePurchaseOrder();
  const confirmPO = useConfirmPurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta ordem de compra?')) {
      try {
        await deletePO.mutateAsync(id);
        toast.success('Ordem de compra excluída!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
      }
    }
  };

  const handleGeneratePdf = async (id: string) => {
    try {
      const { data } = await api.get(`/purchase-orders/${id}`);
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
      generatePurchaseOrderPdf(data.data, pdfSettings, defaultCurrency);
      toast.success('PDF gerado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao gerar PDF');
    }
  };

  const handleConfirm = async (id: string) => {
    if (window.confirm('Confirmar recebimento desta ordem pelo fornecedor?')) {
      try {
        await confirmPO.mutateAsync(id);
        toast.success('Ordem confirmada pelo fornecedor!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao confirmar');
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Tem certeza que deseja cancelar esta ordem de compra?')) {
      try {
        await cancelPO.mutateAsync(id);
        toast.success('Ordem de compra cancelada!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSupplierFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Ordens de Compra</h1>
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Nova Ordem de Compra
            </button>
          </div>

          <div className="bg-white shadow rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Número ou observações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="DRAFT">Rascunho</option>
                  <option value="SENT">Enviado</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="PARTIAL">Parcial</option>
                  <option value="RECEIVED">Recebido</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {suppliersData?.data.map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {(search || statusFilter || supplierFilter || startDate || endDate) && (
              <div className="mt-4">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fornecedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrega Prevista
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.data.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.name || order.purchaseRequest?.title || <span className="text-gray-400">-</span>}
                          </div>
                          {order.purchaseRequest && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-1" title={`Requisição: ${order.purchaseRequest.title}`}>
                              {order.purchaseRequest.requestNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.supplier?.name || <span className="text-gray-400 italic">Não definido</span>}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(order.orderDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPrice(order.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                            }`}
                          >
                            {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`/purchase-orders/${order.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalhes"
                            >
                              Ver
                            </button>

                            <button
                              onClick={() => handleGeneratePdf(order.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Gerar PDF"
                            >
                              PDF
                            </button>

                            {order.status === 'DRAFT' && (
                              <button
                                onClick={() => navigate(`/purchase-orders/${order.id}/edit`)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Editar"
                              >
                                Editar
                              </button>
                            )}

                            {order.status === 'SENT' && (
                              <button
                                onClick={() => handleConfirm(order.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Confirmar recebimento"
                              >
                                Confirmar
                              </button>
                            )}

                            {(order.status === 'DRAFT' || order.status === 'SENT') && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Cancelar ordem"
                              >
                                Cancelar
                              </button>
                            )}

                            {order.status === 'DRAFT' && isAdmin && (
                              <button
                                onClick={() => handleDelete(order.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {data?.data.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma ordem de compra encontrada.
                  </div>
                )}
              </div>

              {data && data.pagination && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.pagination.total)} de {data.pagination.total} ordens
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={!data.pagination.hasMore}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
