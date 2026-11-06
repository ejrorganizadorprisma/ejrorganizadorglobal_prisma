import { useState, useEffect, useRef } from 'react';
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
import { PackageCheck, Receipt, Eye, FileText, Check, Ban, Trash2, Pencil, MapPin, Truck, Clock, MoreHorizontal } from 'lucide-react';
import { ReceiveOrderModal } from '../components/ReceiveOrderModal';
import { useFormatPrice, formatPriceValue } from '../hooks/useFormatPrice';

// Converte o valor TOTAL do pedido (centavos BRL, SEM os custos adicionais) para a moeda do orçamento
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

// Valor do pedido nas DUAS outras moedas (diferentes da moeda do orçamento) — SEM custos adicionais
function orderAmountIn(order: any, cur: 'BRL' | 'USD' | 'PYG'): string | null {
  const cents = order.totalAmount || 0;
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
import { logisticsStyle } from '../lib/logisticsStatus';

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
  // Menu "⋯" das ações secundárias — mantém a coluna estreita para o Status não
  // ficar escondido embaixo da coluna fixa de ações em telas menores.
  // Posição fixa (como o tooltip de logística) p/ não ser cortado pelo overflow da tabela.
  const [actionMenu, setActionMenu] = useState<{ x: number; y: number; order: any } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Chip de status — fica ao lado do nome do pedido. A cor acompanha a etapa da
  // logística enquanto o pedido está em andamento; hover abre o tooltip de rastreio.
  const statusChip = (order: any) => {
    const inProgress = !['RECEIVED', 'CANCELLED'].includes(order.status);
    const lg = inProgress ? logisticsStyle(order.lastTracking?.location) : null;
    return (
      <span
        onMouseEnter={(e) => {
          if (!inProgress) return;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setTrackTip({ x: r.left, y: r.bottom + 6, order });
        }}
        onMouseLeave={() => setTrackTip(null)}
        title={lg ? order.lastTracking?.location : undefined}
        className={`shrink-0 px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full whitespace-nowrap ${inProgress ? 'cursor-help ' : ''}${
          lg ? lg.chip : (STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800')
        }`}
      >
        {STATUS_LABELS[order.status] || order.status}
      </span>
    );
  };

  const toggleActionMenu = (e: React.MouseEvent, order: any) => {
    if (actionMenu?.order.id === order.id) { setActionMenu(null); return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenu({ x: r.right, y: r.bottom + 4, order });
  };

  useEffect(() => {
    if (!actionMenu) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // O próprio "⋯" não fecha aqui — deixa o onClick fazer o toggle
      if (t.closest('[data-action-menu-trigger]')) return;
      if (menuRef.current && !menuRef.current.contains(t)) setActionMenu(null);
    };
    const onScrollOrResize = () => setActionMenu(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [actionMenu]);

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
      <div className="max-w-7xl mx-auto py-4 sm:px-4">
        <div className="px-3 sm:px-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Pedidos por Fornecedor</h1>
              <p className="hidden sm:block text-xs text-gray-500">Pedidos gerados a partir de ordens de compra</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white shadow-sm border rounded-xl p-2.5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Número, grupo..."
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
                  <option value="PENDING">Pendente</option>
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
              <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed text-[13px]">
                  <colgroup>
                    <col />
                    <col className="w-[136px]" />
                    <col className="hidden xl:table-column w-[84px]" />
                    <col className="w-[120px]" />
                    <col className="w-[108px]" />
                    <col className="w-[176px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Pedido</th>
                      <th className="px-3 py-2 text-left">Fornecedor</th>
                      <th className="hidden xl:table-cell px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right sticky right-0 bg-gray-50 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.data.map((order: any) => (
                      <tr key={order.id} className="group hover:bg-blue-50/40 transition-colors">
                        <td className="px-3 py-2">
                          <div
                            className="flex items-baseline gap-1.5 min-w-0"
                            title={`${order.budget?.title || order.orderNumber} · ${order.orderNumber}${order.budget?.budgetNumber ? ` · ${order.budget.budgetNumber}` : ''} · ${formatDate(order.orderDate)}`}
                          >
                            <span className="font-medium text-gray-900 truncate">{order.budget?.title || order.orderNumber}</span>
                            <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">{order.orderNumber}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 truncate" title={order.supplier?.name || undefined}>
                          {order.supplier?.name || '-'}
                        </td>
                        <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 tabular-nums">
                          {formatDate(order.orderDate)}
                        </td>
                        <td
                          className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-900 tabular-nums truncate"
                          title={formatOrderSecondaries(order) || undefined}
                        >
                          {formatOrderValue(order)}
                        </td>
                        <td className="px-3 py-2">{statusChip(order)}</td>
                        <td className="px-3 py-2 sticky right-0 bg-white group-hover:bg-blue-50 shadow-[-6px_0_6px_-4px_rgba(0,0,0,0.08)]">
                          <div className="flex justify-end gap-0.5 items-center whitespace-nowrap">
                            {['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status) && (
                              <button
                                onClick={() => setReceivingOrderId(order.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-[11px] font-semibold shadow-sm"
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-[11px] font-semibold"
                                  title="Ver Nota Fiscal anexada"
                                >
                                  <Receipt className="w-3.5 h-3.5" /> NF ✓
                                </a>
                              ) : (
                                <label
                                  className="inline-flex items-center gap-1 px-2 py-0.5 border border-blue-600 text-blue-700 rounded-md hover:bg-blue-50 text-[11px] font-semibold cursor-pointer"
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
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Ações secundárias no menu "⋯" — sem ele a coluna
                                fixa ficava larga e cobria a coluna Status. */}
                            <button
                              data-action-menu-trigger
                              onClick={(e) => toggleActionMenu(e, order)}
                              className={`p-1 rounded-md ${actionMenu?.order.id === order.id ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                              title="Mais ações"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
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

      {/* Menu de ações secundárias — posição fixa para não ser cortado pelo overflow da tabela */}
      {actionMenu && (() => {
        const order = actionMenu.order;
        const canEdit = ['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status);
        const item = 'w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left';
        return (
          <div
            ref={menuRef}
            className="fixed z-[80] w-56 max-w-[calc(100vw-1rem)] py-1 bg-white rounded-lg shadow-2xl ring-1 ring-black/5"
            style={{ left: Math.max(8, Math.min(actionMenu.x - 224, window.innerWidth - 232)), top: actionMenu.y }}
          >
            {canEdit && (
              <button onClick={() => { setActionMenu(null); navigate(`/supplier-orders/${order.id}?edit=1`); }} className={item}>
                <Pencil className="w-4 h-4 text-yellow-600" /> Editar pedido
              </button>
            )}
            <button onClick={() => { setActionMenu(null); handleGeneratePdf(order.id); }} className={item}>
              <FileText className="w-4 h-4 text-gray-500" /> Gerar PDF
            </button>
            {order.status === 'SENT' && (
              <button onClick={() => { setActionMenu(null); handleConfirm(order.id); }} className={item}>
                <Check className="w-4 h-4 text-green-600" /> Confirmar pelo fornecedor
              </button>
            )}
            {(order.status === 'PENDING' || order.status === 'SENT') && (
              <button onClick={() => { setActionMenu(null); handleCancel(order.id); }} className={item}>
                <Ban className="w-4 h-4 text-orange-600" /> Cancelar pedido
              </button>
            )}
            {order.status === 'PENDING' && isAdmin && (
              <button
                onClick={() => { setActionMenu(null); handleDelete(order.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            )}
          </div>
        );
      })()}

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
