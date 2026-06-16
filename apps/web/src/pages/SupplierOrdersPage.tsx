import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSupplierOrders,
  useConfirmSupplierOrder,
  useCancelSupplierOrder,
  useDeleteSupplierOrder,
} from '../hooks/useSupplierOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { ReceiveOrderModal } from '../components/ReceiveOrderModal';
import { useFormatPrice, formatPriceValue } from '../hooks/useFormatPrice';

// Converte o valor do pedido (centavos BRL) para a moeda do orçamento de origem
function formatOrderValue(order: any): string {
  const cents = order.totalAmount || 0;
  const cur = (order.budget?.currency || 'BRL') as 'BRL' | 'USD' | 'PYG';
  if (cur === 'BRL') return formatPriceValue(cents, 'BRL');
  const brl = cents / 100;
  if (cur === 'USD') {
    const r3 = order.budget?.exchangeRate3 || 0; // 1 USD = r3 BRL
    if (r3 <= 0) return formatPriceValue(cents, 'BRL');
    return formatPriceValue(Math.round((brl / r3) * 100), 'USD');
  }
  // PYG
  const r1 = order.budget?.exchangeRate1 || 0; // 1 BRL = r1 PYG
  if (r1 <= 0) return formatPriceValue(cents, 'BRL');
  return formatPriceValue(Math.round(brl * r1), 'PYG');
}
import { toast } from 'sonner';
import { api } from '../lib/api';
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

export function SupplierOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const { data, isLoading } = useSupplierOrders({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
    supplierId: supplierFilter || undefined,
  });

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: documentSettings } = useDefaultDocumentSettings();
  const confirmOrder = useConfirmSupplierOrder();
  const cancelOrder = useCancelSupplierOrder();
  const deleteOrder = useDeleteSupplierOrder();
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const handleGeneratePdf = async (id: string) => {
    try {
      const { data } = await api.get(`/supplier-orders/${id}`);
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
      generateSupplierOrderPdf(data.data, pdfSettings, defaultCurrency);
      toast.success('PDF gerado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao gerar PDF');
    }
  };

  const handleConfirm = async (id: string) => {
    if (window.confirm('Confirmar recebimento deste pedido pelo fornecedor?')) {
      try {
        await confirmOrder.mutateAsync(id);
        toast.success('Pedido confirmado pelo fornecedor!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao confirmar');
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await cancelOrder.mutateAsync(id);
        toast.success('Pedido cancelado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      try {
        await deleteOrder.mutateAsync(id);
        toast.success('Pedido excluído!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
      }
    }
  };

  const { defaultCurrency } = useFormatPrice();
  const queryClient = useQueryClient();
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSupplierFilter('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Pedidos por Fornecedor</h1>
              <p className="text-sm text-gray-500 mt-1">Pedidos gerados a partir de ordens de compra</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white shadow rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Número, grupo..."
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
                  <option value="PENDING">Pendente</option>
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

              <div className="flex items-end">
                {(search || statusFilter || supplierFilter) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fornecedor
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ordem de Compra
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.data.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[220px]" title={order.budget?.title || order.orderNumber}>
                            {order.budget?.title || order.orderNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.orderNumber}
                            {order.budget?.budgetNumber && (
                              <span className="ml-1 text-gray-400">· {order.budget.budgetNumber}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.supplier?.name || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.purchaseOrder?.orderNumber || '-'}
                          </div>
                          {order.purchaseOrder?.name && (
                            <div className="text-xs text-gray-500 truncate max-w-[150px]" title={order.purchaseOrder.name}>
                              {order.purchaseOrder.name}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(order.orderDate)}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatOrderValue(order)}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                          <div className="flex justify-end gap-2 items-center">
                            <button
                              onClick={() => navigate(`/supplier-orders/${order.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalhes"
                            >
                              Ver
                            </button>

                            <button
                              onClick={() => handleGeneratePdf(order.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Gerar PDF do pedido"
                            >
                              PDF
                            </button>

                            {['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status) && (
                              <button
                                onClick={() => setReceivingOrderId(order.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-semibold shadow-sm"
                                title="Receber pedido — conferência e entrada no estoque"
                              >
                                <PackageCheck className="w-3.5 h-3.5" /> Receber
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

                            {(order.status === 'PENDING' || order.status === 'SENT') && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Cancelar pedido"
                              >
                                Cancelar
                              </button>
                            )}

                            {order.status === 'PENDING' && isAdmin && (
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
                    Nenhum pedido encontrado.
                  </div>
                )}
              </div>

              {data && data.pagination && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.pagination.total)} de {data.pagination.total} pedidos
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

      {receivingOrderId && (
        <ReceiveOrderModal
          orderId={receivingOrderId}
          onClose={() => setReceivingOrderId(null)}
          onDone={() => {
            setReceivingOrderId(null);
            queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
          }}
        />
      )}
    </div>
  );
}
