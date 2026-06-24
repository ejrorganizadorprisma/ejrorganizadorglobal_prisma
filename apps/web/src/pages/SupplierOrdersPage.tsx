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
import { PackageCheck, Receipt, Eye, FileText, Check, Ban, Trash2, Pencil, MapPin, Truck, Clock } from 'lucide-react';
import { ReceiveOrderModal } from '../components/ReceiveOrderModal';
import { useFormatPrice, formatPriceValue } from '../hooks/useFormatPrice';

// Multiplicador dos custos adicionais (impostos etc.) do orçamento de origem.
// No pedido, os custos ficam EMBUTIDOS em todos os valores.
function orderCostMult(order: any): number {
  const pct = (order.budget?.additionalCosts || []).reduce((s: number, c: any) => s + (c?.percentage || 0), 0);
  return 1 + pct / 100;
}

// Converte o valor do pedido (centavos BRL, JÁ com custos embutidos) para a moeda do orçamento
function formatOrderValue(order: any): string {
  const cents = Math.round((order.totalAmount || 0) * orderCostMult(order));
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

// Valor do pedido nas DUAS outras moedas (diferentes da moeda do orçamento)
function orderAmountIn(order: any, cur: 'BRL' | 'USD' | 'PYG'): string | null {
  const cents = Math.round((order.totalAmount || 0) * orderCostMult(order));
  const brl = cents / 100;
  if (cur === 'BRL') return formatPriceValue(cents, 'BRL');
  if (cur === 'USD') {
    const r3 = order.budget?.exchangeRate3 || 0; // 1 USD = r3 BRL
    return r3 > 0 ? formatPriceValue(Math.round((brl / r3) * 100), 'USD') : null;
  }
  const r1 = order.budget?.exchangeRate1 || 0; // 1 BRL = r1 PYG
  return r1 > 0 ? formatPriceValue(Math.round(brl * r1), 'PYG') : null;
}

function formatOrderSecondaries(order: any): string | null {
  const primary = (order.budget?.currency || 'BRL') as 'BRL' | 'USD' | 'PYG';
  const others = (['BRL', 'USD', 'PYG'] as const).filter((c) => c !== primary);
  const vals = others.map((c) => orderAmountIn(order, c)).filter(Boolean);
  return vals.length ? vals.join(' · ') : null;
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
  // Tooltip de logística (posição fixa p/ não ser cortado pelo overflow da tabela)
  const [trackTip, setTrackTip] = useState<{ x: number; y: number; order: any } | null>(null);

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
  const [uploadingNf, setUploadingNf] = useState<string | null>(null);

  const handleUploadNf = async (orderId: string, file?: File | null) => {
    if (!file) return;
    setUploadingNf(orderId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/supplier-orders/${orderId}/invoice-file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Nota fiscal anexada ao pedido.');
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao anexar nota fiscal.');
    } finally {
      setUploadingNf(null);
    }
  };

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
                          <div className="text-sm text-gray-500">
                            {formatDate(order.orderDate)}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatOrderValue(order)}
                          </div>
                          {formatOrderSecondaries(order) && (
                            <div className="text-[10px] text-gray-400">{formatOrderSecondaries(order)}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {(() => {
                            const inProgress = !['RECEIVED', 'CANCELLED'].includes(order.status);
                            const showTip = (e: React.MouseEvent) => {
                              if (!inProgress) return;
                              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setTrackTip({ x: r.left, y: r.bottom + 6, order });
                            };
                            return (
                              <span
                                className={`inline-flex items-center gap-1 ${inProgress ? 'cursor-help' : ''}`}
                                onMouseEnter={showTip}
                                onMouseLeave={() => setTrackTip(null)}
                              >
                                <span
                                  className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${
                                    STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {STATUS_LABELS[order.status] || order.status}
                                </span>
                                {inProgress && order.lastTracking && (
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                )}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                          <div className="flex justify-end gap-1.5 items-center">
                            {['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status) && (
                              <button
                                onClick={() => setReceivingOrderId(order.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-semibold shadow-sm"
                                title="Receber pedido — conferência e entrada no estoque"
                              >
                                <PackageCheck className="w-3.5 h-3.5" /> Receber
                              </button>
                            )}

                            {order.status !== 'CANCELLED' && (
                              order.invoiceFileUrl ? (
                                <a
                                  href={order.invoiceFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-xs font-semibold"
                                  title="Ver Nota Fiscal anexada"
                                >
                                  <Receipt className="w-3.5 h-3.5" /> NF ✓
                                </a>
                              ) : (
                                <label
                                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-blue-600 text-blue-700 rounded-md hover:bg-blue-50 text-xs font-semibold cursor-pointer"
                                  title="Anexar Nota Fiscal (PDF ou foto)"
                                >
                                  <Receipt className="w-3.5 h-3.5" /> {uploadingNf === order.id ? '…' : 'NF'}
                                  <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={(e) => handleUploadNf(order.id, e.target.files?.[0])}
                                  />
                                </label>
                              )
                            )}

                            <button
                              onClick={() => navigate(`/supplier-orders/${order.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status) && (
                              <button
                                onClick={() => navigate(`/supplier-orders/${order.id}?edit=1`)}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Editar pedido (itens, valores, observações)"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleGeneratePdf(order.id)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                              title="Gerar PDF do pedido"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {order.status === 'SENT' && (
                              <button
                                onClick={() => handleConfirm(order.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Confirmar recebimento"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {(order.status === 'PENDING' || order.status === 'SENT') && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                                title="Cancelar pedido"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            {order.status === 'PENDING' && isAdmin && (
                              <button
                                onClick={() => handleDelete(order.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
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

      {/* Tooltip de logística — última atualização do pedido (posição fixa) */}
      {trackTip && (
        <div
          className="fixed z-[80] w-72 max-w-[calc(100vw-1rem)] pointer-events-none"
          style={{ left: Math.min(trackTip.x, window.innerWidth - 300), top: trackTip.y }}
        >
          <div className="rounded-xl bg-slate-900 text-white shadow-2xl ring-1 ring-black/5 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-300 mb-1.5">
              <Truck className="w-3.5 h-3.5" /> Logística
            </div>
            {trackTip.order.lastTracking ? (
              <>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-300 mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold leading-snug">{trackTip.order.lastTracking.location}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-1 ml-5">
                  <Clock className="w-3 h-3" />
                  {String(trackTip.order.lastTracking.trackingDate).slice(8, 10)}/
                  {String(trackTip.order.lastTracking.trackingDate).slice(5, 7)}/
                  {String(trackTip.order.lastTracking.trackingDate).slice(0, 4)}
                </div>
                {trackTip.order.lastTracking.notes && (
                  <p className="text-xs text-slate-300 mt-1.5 ml-5 leading-snug">{trackTip.order.lastTracking.notes}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">Sem atualização de logística ainda. Abra o pedido para registrar onde a mercadoria está.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
