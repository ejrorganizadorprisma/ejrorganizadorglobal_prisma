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
import { buildPurchaseMoney } from '../lib/purchaseMoney';
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
  const { defaultCurrency } = useFormatPrice();
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
      <div className="max-w-7xl mx-auto py-4 sm:px-4">
        <div className="px-3 sm:px-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">Ordens de Compra</h1>
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Nova Ordem de Compra
            </button>
          </div>

          <div className="bg-white shadow-sm border rounded-xl p-2.5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Número ou observações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor</label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {(search || statusFilter || supplierFilter || startDate || endDate) && (
              <div className="mt-2">
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
              <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed text-[13px]">
                  <colgroup>
                    <col />
                    <col className="w-[170px]" />
                    <col className="w-[80px]" />
                    <col className="hidden xl:table-column w-[96px]" />
                    <col className="w-[130px]" />
                    <col className="w-[104px]" />
                    <col className="w-[230px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Fornecedor</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="hidden xl:table-cell px-3 py-2 text-left">Entrega Prevista</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.data.map((order: any) => (
                      <tr key={order.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="font-medium text-gray-900 truncate"
                              title={`${order.name || order.purchaseRequest?.title || ''}${order.expectedDeliveryDate ? ` · Entrega prevista: ${formatDate(order.expectedDeliveryDate)}` : ''}`}
                            >
                              {order.name || order.purchaseRequest?.title || <span className="text-gray-400">-</span>}
                            </span>
                            {order.purchaseRequest && (
                              <span className="shrink-0 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-px rounded-full whitespace-nowrap" title={`Requisição: ${order.purchaseRequest.title}`}>
                                {order.purchaseRequest.requestNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 truncate" title={order.supplier?.name || undefined}>
                          {order.supplier?.name || <span className="text-gray-400 italic">Não definido</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500 tabular-nums">{formatDate(order.orderDate)}</td>
                        <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 tabular-nums">
                          {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-900 tabular-nums">
                          {buildPurchaseMoney((order as any).budget).fmt(order.totalAmount)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex max-w-full px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${
                              STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                            }`}
                          >
                            <span className="truncate">{STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2 whitespace-nowrap text-[12px] font-medium">
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
