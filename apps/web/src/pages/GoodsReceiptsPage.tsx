import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGoodsReceipts,
  useDeleteGoodsReceipt,
  useApproveGoodsReceipt,
  useRejectGoodsReceipt,
} from '../hooks/useGoodsReceipts';
import { useSupplierOrders } from '../hooks/useSupplierOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { buildPurchaseMoney } from '../lib/purchaseMoney';
import { ReceiveOrderModal } from '../components/ReceiveOrderModal';
import { PackageCheck, MapPin, Receipt } from 'lucide-react';
import { logisticsStyle } from '../lib/logisticsStatus';
import { toast } from 'sonner';

const STATUS_LABELS = {
  PENDING: 'Pendente',
  INSPECTED: 'Inspecionado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  RETURNED: 'Devolvido',
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  INSPECTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-orange-100 text-orange-800',
};

const SO_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  CONFIRMED: 'Confirmado',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const SO_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const QUALITY_STATUS_LABELS = {
  PENDING: 'Pendente',
  PASSED: 'Aprovado',
  FAILED: 'Reprovado',
  PARTIAL: 'Parcial',
};

type TabType = 'pending' | 'receipts';

export function GoodsReceiptsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Buscar pedidos que podem receber mercadoria (SENT, CONFIRMED, PARTIAL)
  const { data: pendingOrdersData, isLoading: loadingOrders } = useSupplierOrders({
    page: 1,
    limit: 100,
  });

  const { data, isLoading } = useGoodsReceipts({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
    supplierId: supplierFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const deleteReceipt = useDeleteGoodsReceipt();
  const approveReceipt = useApproveGoodsReceipt();
  const rejectReceipt = useRejectGoodsReceipt();

  // Só aparece o card se AINDA há mercadoria a receber (saldo pendente > 0).
  // Assim, quando o recebimento é finalizado (tudo recebido), o card some na hora —
  // independente do rótulo de status. Cancelados também ficam de fora.
  const pendingOrders = pendingOrdersData?.data?.filter((so: any) =>
    so.status !== 'CANCELLED' && (so.qtyPending ?? 0) > 0
  ) || [];

  const pendingSummary = {
    total: pendingOrders.length,
    partials: pendingOrders.filter((o: any) => o.status === 'PARTIAL').length,
    unitsPending: pendingOrders.reduce((s: number, o: any) => s + (o.qtyPending ?? 0), 0),
  };

  // Data (YYYY-MM-DD/ISO) → dd/mm, sem off-by-one
  const shortDate = (s?: string) => (s ? `${String(s).slice(8, 10)}/${String(s).slice(5, 7)}` : '');

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este recebimento?')) {
      try {
        await deleteReceipt.mutateAsync(id);
        toast.success('Recebimento excluído!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
      }
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm('Aprovar este recebimento? O estoque será atualizado.')) {
      try {
        await approveReceipt.mutateAsync(id);
        toast.success('Recebimento aprovado! Estoque atualizado.');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao aprovar');
      }
    }
  };

  const handleReject = async (id: string) => {
    if (window.confirm('Tem certeza que deseja rejeitar este recebimento?')) {
      try {
        await rejectReceipt.mutateAsync(id);
        toast.success('Recebimento rejeitado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao rejeitar');
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
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Recebimento de Mercadorias</h1>
              <p className="hidden sm:block text-xs text-gray-500">
                Veja o que ainda há a receber e lance cada parcela direto pelo card do pedido
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4 overflow-x-auto">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Aguardando Recebimento
                {pendingOrders.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-800 py-0.5 px-2 rounded-full text-xs">
                    {pendingOrders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'receipts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recebimentos Registrados
                {data?.pagination?.total ? (
                  <span className="ml-2 bg-gray-100 text-gray-800 py-0.5 px-2 rounded-full text-xs">
                    {data.pagination.total}
                  </span>
                ) : null}
              </button>
            </nav>
          </div>

          {/* Tab: Pedidos Aguardando Recebimento */}
          {activeTab === 'pending' && (
            <div>
              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Tudo em dia! 🎉</h3>
                  <p className="text-gray-500 mb-4">
                    Nenhum pedido com recebimento em aberto. Pedidos aparecem aqui enquanto houver mercadoria a receber.
                  </p>
                  <button
                    onClick={() => navigate('/supplier-orders')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Ver Pedidos por Fornecedor
                  </button>
                </div>
              ) : (
                <>
                {/* Resumo inteligente do que falta receber */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                    <p className="text-2xl font-bold text-gray-900 leading-none">{pendingSummary.total}</p>
                    <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">aguardando</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                    <p className="text-2xl font-bold text-orange-600 leading-none">{pendingSummary.partials}</p>
                    <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">parciais</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                    <p className="text-2xl font-bold text-amber-600 leading-none">{pendingSummary.unitsPending}</p>
                    <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">unidades a receber</p>
                  </div>
                </div>
              </>
              )}
              {!loadingOrders && pendingOrders.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border-l-4 ${order.status === 'PARTIAL' ? 'border-orange-500' : 'border-blue-500'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate" title={order.budget?.title || order.orderNumber}>
                            {order.budget?.title || order.orderNumber}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{order.supplier?.name}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            SO_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {SO_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>Data do Pedido:</span>
                          <span className="font-medium text-gray-700">{formatDate(order.orderDate)}</span>
                        </div>
                        {order.expectedDeliveryDate && (
                          <div className="flex justify-between">
                            <span>Previsão Entrega:</span>
                            <span className="font-medium text-gray-700">{formatDate(order.expectedDeliveryDate)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Valor Total:</span>
                          <span className="font-medium text-gray-700">{buildPurchaseMoney((order as any).budget).fmt(order.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Itens:</span>
                          <span className="font-medium text-gray-700">{order.itemsTotal ?? order.items?.length ?? 0} produto(s)</span>
                        </div>
                        {/* Saldo pendente — destaque para recebimento parcial (em parcelas) */}
                        {(order.itemsPending ?? 0) > 0 && (order.status === 'PARTIAL' || (order.qtyPending ?? 0) < (order.qtyTotal ?? 0)) && (
                          <div className="flex justify-between text-amber-700">
                            <span className="font-medium">Falta receber:</span>
                            <span className="font-semibold">
                              {order.itemsPending} {order.itemsPending === 1 ? 'item' : 'itens'}
                              {(order.qtyPending ?? 0) > 0 && ` · ${order.qtyPending} un.`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Logística — última localização conhecida da mercadoria (cor por etapa) */}
                      {order.lastTracking && (() => {
                        const lg = logisticsStyle(order.lastTracking.location)!;
                        return (
                          <div className={`flex items-start gap-1.5 mb-3 -mt-1 px-2.5 py-1.5 rounded-lg ${lg.chip}`}>
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <div className="min-w-0 text-xs">
                              <span className="font-semibold">{order.lastTracking.location}</span>
                              <span className="opacity-60"> · {shortDate(order.lastTracking.trackingDate)}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Nota Fiscal já lançada no pedido */}
                      {(order.invoiceNumber || order.invoiceAmount != null || order.invoiceFileUrl) && (
                        <div className="flex items-center gap-1.5 mb-3 -mt-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs">
                          <Receipt className="w-3.5 h-3.5 shrink-0" />
                          <span className="min-w-0 truncate">
                            <span className="font-semibold">NF {order.invoiceNumber || '—'}</span>
                            {order.invoiceAmount != null && <span> · {buildPurchaseMoney((order as any).budget).fmt(order.invoiceAmount)}</span>}
                            {order.invoiceDate && <span className="opacity-60"> · {shortDate(order.invoiceDate)}</span>}
                          </span>
                          {order.invoiceFileUrl && (
                            <a href={order.invoiceFileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ml-auto shrink-0 underline hover:no-underline" title="Ver arquivo da NF">arquivo</a>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setReceivingOrderId(order.id)}
                          className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium flex items-center justify-center gap-1.5"
                        >
                          <PackageCheck className="w-4 h-4" />
                          {order.status === 'PARTIAL' ? 'Receber parcela' : 'Conferir e Receber'}
                        </button>
                        <button
                          onClick={() => navigate(`/supplier-orders/${order.id}`)}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                          title="Ver detalhes do pedido"
                        >
                          Ver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Recebimentos Registrados */}
          {activeTab === 'receipts' && (
            <>
              {/* Filtros */}
              <div className="bg-white shadow-sm border rounded-xl p-2.5 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                    <input
                      type="text"
                      placeholder="Número ou NF-e..."
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
                      <option value="INSPECTED">Inspecionado</option>
                      <option value="APPROVED">Aprovado</option>
                      <option value="REJECTED">Rejeitado</option>
                      <option value="RETURNED">Devolvido</option>
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
                    <table className="w-full min-w-[680px] table-fixed text-[13px]">
                      <colgroup>
                        <col className="w-[120px]" />
                        <col className="w-[120px]" />
                        <col />
                        <col className="w-[96px]" />
                        <col className="hidden xl:table-column w-[110px]" />
                        <col className="w-[110px]" />
                        <col className="hidden xl:table-column w-[110px]" />
                        <col className="w-[190px]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                          <th className="px-3 py-2 text-left">Número</th>
                          <th className="px-3 py-2 text-left">Pedido</th>
                          <th className="px-3 py-2 text-left">Fornecedor</th>
                          <th className="px-3 py-2 text-left">Data Receb.</th>
                          <th className="hidden xl:table-cell px-3 py-2 text-left">NF-e</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="hidden xl:table-cell px-3 py-2 text-left">Qualidade</th>
                          <th className="px-3 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data?.data.map((receipt: any) => (
                          <tr key={receipt.id} className="hover:bg-blue-50/40 transition-colors">
                            <td
                              className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 tabular-nums truncate"
                              title={`${receipt.receiptNumber}${receipt.invoiceNumber ? ` · NF-e ${receipt.invoiceNumber}` : ''}${receipt.qualityCheckStatus ? ` · Qualidade: ${QUALITY_STATUS_LABELS[receipt.qualityCheckStatus as keyof typeof QUALITY_STATUS_LABELS]}` : ''}`}
                            >
                              {receipt.receiptNumber}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700 tabular-nums truncate">
                              {receipt.supplierOrder?.orderNumber || receipt.purchaseOrder?.orderNumber || '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-700 truncate" title={receipt.supplier?.name || undefined}>
                              {receipt.supplier?.name || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-500 tabular-nums">{formatDate(receipt.receiptDate)}</td>
                            <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 truncate" title={receipt.invoiceNumber || undefined}>
                              {receipt.invoiceNumber || '-'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex max-w-full px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${
                                  STATUS_COLORS[receipt.status as keyof typeof STATUS_COLORS]
                                }`}
                              >
                                <span className="truncate">{STATUS_LABELS[receipt.status as keyof typeof STATUS_LABELS]}</span>
                              </span>
                            </td>
                            <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 truncate">
                              {receipt.qualityCheckStatus
                                ? QUALITY_STATUS_LABELS[receipt.qualityCheckStatus as keyof typeof QUALITY_STATUS_LABELS]
                                : '-'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-2 whitespace-nowrap text-[12px] font-medium">
                                <button
                                  onClick={() => navigate(`/goods-receipts/${receipt.id}`)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Ver detalhes"
                                >
                                  Ver
                                </button>

                                {receipt.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => navigate(`/goods-receipts/${receipt.id}/edit`)}
                                      className="text-yellow-600 hover:text-yellow-900"
                                      title="Editar"
                                    >
                                      Editar
                                    </button>
                                  </>
                                )}

                                {(receipt.status === 'PENDING' || receipt.status === 'INSPECTED') && (
                                  <button
                                    onClick={() => handleApprove(receipt.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Aprovar recebimento"
                                  >
                                    Aprovar
                                  </button>
                                )}

                                {(receipt.status === 'PENDING' || receipt.status === 'INSPECTED') && (
                                  <button
                                    onClick={() => handleReject(receipt.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Rejeitar recebimento"
                                  >
                                    Rejeitar
                                  </button>
                                )}

                                {receipt.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleDelete(receipt.id)}
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
                        <p className="mb-2">Nenhum recebimento encontrado.</p>
                        <button
                          onClick={() => setActiveTab('pending')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Ver pedidos aguardando recebimento
                        </button>
                      </div>
                    )}
                  </div>

                  {data && data.pagination && data.pagination.total > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-700">
                        Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.pagination.total)} de {data.pagination.total} recebimentos
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
            queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
          }}
        />
      )}
    </div>
  );
}
