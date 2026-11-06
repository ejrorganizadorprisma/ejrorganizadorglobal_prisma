import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesOrders, useCancelSalesOrder, useDeleteSalesOrder, useReceiveSalesOrder, useToDeliverSalesOrder, useCompleteSalesOrder, useReleaseSeparation, useReturnToSeparation } from '../hooks/useSalesOrders';
import { SeparationModal } from '../components/sales-order/SeparationModal';
import { DeliveryModal } from '../components/sales-order/DeliveryModal';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { generateSalesOrderPDF } from '../utils/salesOrderPdfGenerator';
import { api } from '../lib/api';
import { SalesOrderStatus } from '@ejr/shared-types';
import {
  ClipboardList,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Search,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  XCircle,
  ArrowRightCircle,
  FileText,
  FileDown,
  Ban,
  CalendarClock,
  AlertTriangle,
  Undo2,
} from 'lucide-react';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { AppPage } from '@ejr/shared-types';
import { toast } from 'sonner';
import { ApproveSalesOrderModal } from '../components/ApproveSalesOrderModal';

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  DRAFT: { label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText },
  PENDING: { label: 'Pedido de venda', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  RECEIVED: { label: 'Pedido recebido', bg: 'bg-sky-50', text: 'text-sky-700', icon: CheckCircle },
  AWAITING_SEPARATION: { label: 'Aguardando separação', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  SEPARATING: { label: 'Em separação', bg: 'bg-violet-50', text: 'text-violet-700', icon: Clock },
  SEPARATED: { label: 'Separado (conferir)', bg: 'bg-violet-50', text: 'text-violet-700', icon: CheckCircle },
  APPROVED: { label: 'Venda autorizada', bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle },
  CONVERTING: { label: 'Faturando…', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: Clock },
  PARTIALLY_CONVERTED: { label: 'Parcialmente faturado', bg: 'bg-teal-50', text: 'text-teal-700', icon: ArrowRightCircle },
  CONVERTED: { label: 'Faturado', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: ArrowRightCircle },
  TO_DELIVER: { label: 'Venda a entregar', bg: 'bg-orange-50', text: 'text-orange-700', icon: ArrowRightCircle },
  DELIVERED: { label: 'Venda entregue', bg: 'bg-lime-50', text: 'text-lime-700', icon: CheckCircle },
  COMPLETED: { label: 'Venda concluída', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
};

/**
 * Config visual do status considerando o caso "Pedido de Venda | Pendência"
 * (pedido PENDING gerado do saldo de outro pedido). Cada status tem cor própria.
 */
function statusDisplay(order: any): { label: string; bg: string; text: string; icon: any; title: string } {
  const base = statusConfig[order.status] || statusConfig.PENDING;
  if (order.status === 'PENDING' && order.pendingOriginOrderId) {
    return {
      label: 'Pedido de Venda | Pendência',
      bg: 'bg-rose-100',
      text: 'text-rose-700',
      icon: AlertTriangle,
      title: order.pendingOriginNumber
        ? `Pendência do pedido ${order.pendingOriginNumber}`
        : 'Pendência de outro pedido',
    };
  }
  return { ...base, title: base.label };
}

type ForecastState = 'overdue' | 'today' | 'upcoming' | 'inflow';

/**
 * Interpreta a Previsão de Separação do pedido em relação a hoje.
 * - overdue: previsão venceu e o pedido ainda não foi liberado → prioridade máxima
 * - today: previsão é hoje
 * - upcoming: previsão no futuro
 * - inflow: já saiu do estágio de pedido (em separação/faturado) → informativo
 * Faz o parse por string (YYYY-MM-DD) para evitar deslocamento de fuso.
 */
function getForecastMeta(order: any): { state: ForecastState; days: number; label: string } | null {
  if (!order.separationForecastDate) return null;
  const s = String(order.separationForecastDate).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const fd = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((fd.getTime() - today.getTime()) / 86400000);
  const actionable = order.status === 'PENDING' || order.status === 'APPROVED' || order.status === 'RECEIVED';
  let state: ForecastState;
  if (!actionable) state = 'inflow';
  else if (days < 0) state = 'overdue';
  else if (days === 0) state = 'today';
  else state = 'upcoming';
  return { state, days, label: fd.toLocaleDateString('pt-BR') };
}

/** Versão compacta (1 linha) da previsão, para a tabela desktop. */
function ForecastChip({ meta }: { meta: { state: ForecastState; days: number; label: string } }) {
  const { state, days, label } = meta;
  const short = label.slice(0, 5); // dd/mm
  const styles: Record<ForecastState, string> = {
    overdue: 'bg-red-100 text-red-700',
    today: 'bg-amber-100 text-amber-700',
    upcoming: 'bg-slate-100 text-slate-600',
    inflow: 'bg-gray-100 text-gray-400',
  };
  const text =
    state === 'overdue' ? `${Math.abs(days)}d atraso` : state === 'today' ? 'hoje' : short;
  const title =
    state === 'overdue'
      ? `Separar · atrasado ${Math.abs(days)} dia(s) (previsão ${label})`
      : state === 'today'
        ? 'Separar hoje'
        : `Previsão de separação: ${label}`;
  const Icon = state === 'overdue' ? AlertTriangle : CalendarClock;
  return (
    <span title={title} className={`inline-flex items-center gap-0.5 px-1.5 py-px text-[10px] font-semibold rounded-full whitespace-nowrap ${styles[state]}`}>
      <Icon className="w-2.5 h-2.5" />
      {text}
    </span>
  );
}

function ForecastBadge({ meta }: { meta: { state: ForecastState; days: number; label: string } }) {
  const { state, days, label } = meta;
  if (state === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3" />
        Separar · atrasado {Math.abs(days)}d
      </span>
    );
  }
  if (state === 'today') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
        <CalendarClock className="w-3 h-3" />
        Separar hoje
      </span>
    );
  }
  if (state === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
        <CalendarClock className="w-3 h-3" />
        Prev: {label}{days <= 3 ? ` · ${days}d` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-400">
      <CalendarClock className="w-3 h-3" />
      Prev: {label}
    </span>
  );
}

export function SalesOrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalesOrderStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useSalesOrders({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const cancelOrder = useCancelSalesOrder();
  const deleteOrder = useDeleteSalesOrder();
  const { formatPrice } = useFormatPrice();
  const { data: systemSettings } = useSystemSettings();
  const defaultCurrency = systemSettings?.defaultCurrency || 'BRL';
  const { data: documentSettings } = useDefaultDocumentSettings();
  const { hasActionPermission } = usePagePermissions();
  const canEdit = hasActionPermission(AppPage.SALES, 'edit' as any);

  // Modal de aprovação compartilhado entre as linhas
  const [approveTarget, setApproveTarget] = useState<{ id: string; number: string } | null>(null);
  const [separatingId, setSeparatingId] = useState<string | null>(null);
  const [deliveringOrder, setDeliveringOrder] = useState<{ id: string; number: string } | null>(null);
  const receiveOrder = useReceiveSalesOrder();
  const toDeliverOrder = useToDeliverSalesOrder();
  const completeOrder = useCompleteSalesOrder();
  const releaseSeparation = useReleaseSeparation();
  const returnToSeparation = useReturnToSeparation();

  const doRelease = async (order: any) => {
    try {
      await releaseSeparation.mutateAsync({ id: order.id, body: {} });
      toast.success('Pedido liberado para o estoque separar!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao liberar separação');
    }
  };

  // Conferência reprovada pelo ADM: devolve o pedido separado para a fila de separação.
  const doReturnToSeparation = async (order: any) => {
    const note = window.prompt(`Devolver o pedido ${order.orderNumber} para separação.\nMotivo (opcional):`);
    if (note === null) return; // cancelou
    try {
      await returnToSeparation.mutateAsync({ id: order.id, body: { note: note || undefined } });
      toast.success('Pedido devolvido para a separação!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao devolver para separação');
    }
  };

  // Próxima etapa do workflow conforme o status
  const nextStep = (order: any): { label: string; short: string; color: string; run: () => void } | null => {
    const s = order.status;
    if (s === 'PENDING')
      return { label: 'Confirmar Recebimento', short: 'Receber', color: 'bg-sky-600 hover:bg-sky-700', run: () => navigate(`/sales-orders/${order.id}/edit`) };
    if (s === 'APPROVED' || s === 'RECEIVED')
      return { label: 'Liberar Separação', short: 'Liberar', color: 'bg-amber-600 hover:bg-amber-700', run: () => doRelease(order) };
    if (s === 'SEPARATED')
      return { label: 'Conferência OK', short: 'Conferência OK', color: 'bg-emerald-600 hover:bg-emerald-700', run: () => navigate(`/sales-orders/${order.id}/convert`) };
    if (s === 'PARTIALLY_CONVERTED')
      return { label: 'Faturar saldo', short: 'Faturar saldo', color: 'bg-teal-600 hover:bg-teal-700', run: () => navigate(`/sales-orders/${order.id}/convert`) };
    return null;
  };

  const handleCancel = async (id: string, number: string) => {
    const reason = window.prompt(`Motivo do cancelamento do pedido ${number}:`);
    if (reason === null) return;
    try {
      await cancelOrder.mutateAsync({ id, reason });
      toast.success('Pedido cancelado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar');
    }
  };

  const handleGeneratePDF = async (order: any) => {
    try {
      let target = order;
      // Se vier sem itens (defesa contra alteracao futura no backend), busca o pedido completo
      if (!target.items || target.items.length === 0) {
        const { data } = await api.get(`/sales-orders/${order.id}`);
        target = data?.data || target;
      }
      if (!target.customer) {
        toast.error('Dados do cliente nao disponiveis');
        return;
      }
      if (!target.items || target.items.length === 0) {
        toast.error('Pedido sem itens para gerar PDF');
        return;
      }
      generateSalesOrderPDF(target as any, target.customer as any, documentSettings, defaultCurrency, 'elegant');
      toast.success('PDF gerado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || 'desconhecido'));
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!window.confirm(`Deseja excluir o pedido ${number}?`)) return;
    try {
      await deleteOrder.mutateAsync(id);
      toast.success('Pedido excluido');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = search || status || startDate || endDate;
  const orders = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 0;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Pedidos de Venda</h1>
            <p className="hidden sm:block text-xs text-gray-500">Pedidos registrados por vendedores para faturamento</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/sales-orders/new')}
            className="shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border mb-4">
        <div className="p-2.5 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por numero, cliente, vendedor..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as SalesOrderStatus | ''); setPage(1); }}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Todos status</option>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 border-t pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Carregando pedidos...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">Nenhum pedido encontrado</p>
          <p className="text-sm text-gray-400">
            {hasActiveFilters ? 'Tente alterar os filtros' : 'Pedidos de vendedores aparecerao aqui'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table — compacta, 1 linha por pedido */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full min-w-[660px] table-fixed text-[13px]">
              <colgroup>
                <col className="w-[168px]" />
                <col />
                <col className="hidden xl:table-column w-[120px]" />
                <col className="hidden xl:table-column w-[80px]" />
                <col className="w-[120px]" />
                <col className="w-[118px]" />
                <col className="w-[188px]" />
              </colgroup>
              <thead>
                <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Pedido</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="hidden xl:table-cell px-3 py-2 text-left">Vendedor</th>
                  <th className="hidden xl:table-cell px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order: any) => {
                  const cfg = statusDisplay(order);
                  const StatusIcon = cfg.icon;
                  const fm = getForecastMeta(order);
                  const rowTint =
                    fm?.state === 'overdue' ? 'bg-red-50/60' : fm?.state === 'today' ? 'bg-amber-50/60' : '';
                  const step = nextStep(order);
                  const statusLabel = order.status === 'PENDING' && order.pendingOriginOrderId ? 'Pendência' : cfg.label;
                  return (
                    <tr key={order.id} className={`group transition-colors ${rowTint} hover:bg-indigo-50/40`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-semibold text-gray-900 whitespace-nowrap tabular-nums"
                            title={`${new Date(order.orderDate).toLocaleDateString('pt-BR')}${order.seller?.name ? ` · ${order.seller.name}` : ''}`}
                          >
                            {order.orderNumber}
                          </span>
                          {fm && <ForecastChip meta={fm} />}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-800 font-medium truncate" title={order.customer?.name}>
                        {order.customer?.name || '-'}
                      </td>
                      <td className="hidden xl:table-cell px-3 py-2 text-gray-500 truncate" title={order.seller?.name}>
                        {order.seller?.name || '-'}
                      </td>
                      <td className="hidden xl:table-cell px-3 py-2 text-gray-500 whitespace-nowrap tabular-nums">
                        {new Date(order.orderDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          title={cfg.title}
                          className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${cfg.bg} ${cfg.text} ${order.pendingOriginOrderId ? 'cursor-help' : ''}`}
                        >
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{statusLabel}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                          {step && (
                            <button
                              onClick={step.run}
                              className={`mr-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white transition-colors ${step.color}`}
                              title={`Próxima etapa: ${step.label}`}
                            >
                              {step.short} →
                            </button>
                          )}
                          {order.status === 'CONVERTED' && order.sale?.id && (
                            <button
                              onClick={() => navigate(`/sales/${order.sale.id}`)}
                              className="mr-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200 transition-colors tabular-nums"
                              title="Abrir a venda gerada (NF / Expedição / Coleta)"
                            >
                              {order.sale.saleNumber || 'Abrir Venda'} →
                            </button>
                          )}
                          {order.status === 'SEPARATED' && (
                            <button
                              onClick={() => doReturnToSeparation(order)}
                              className="p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors"
                              title="Devolver: conferência reprovada, o estoque re-separa"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleGeneratePDF(order)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Gerar PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && order.status !== 'CONVERTED' && order.status !== 'CANCELLED' && (
                            <button
                              onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Editar pedido"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(order.id, order.orderNumber)}
                              className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                              title="Cancelar pedido"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(order.status === 'DRAFT' ||
                            (order.status === 'PENDING' && order.pendingOriginOrderId)) && (
                            <button
                              onClick={() => handleDelete(order.id, order.orderNumber)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title={order.pendingOriginOrderId ? 'Excluir pedido de pendência' : 'Excluir rascunho'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {orders.map((order: any) => {
              const cfg = statusDisplay(order);
              const StatusIcon = cfg.icon;
              const fm = getForecastMeta(order);
              const cardTint =
                fm?.state === 'overdue'
                  ? 'border-red-200 bg-red-50'
                  : fm?.state === 'today'
                  ? 'border-amber-200 bg-amber-50'
                  : '';
              return (
                <div key={order.id} className={`rounded-xl shadow-sm border p-4 ${cardTint || 'bg-white'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                      <p className="text-sm text-gray-500">{order.customer?.name}</p>
                      {fm && <div className="mt-1"><ForecastBadge meta={fm} /></div>}
                    </div>
                    <span
                      title={cfg.title}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text} ${order.pendingOriginOrderId ? 'cursor-help' : ''}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">{order.seller?.name}</span>
                    <span className="text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleGeneratePDF(order)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        PDF
                      </button>
                      {canEdit && order.status !== 'CONVERTED' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      )}
                      {(() => {
                        const step = nextStep(order);
                        return step ? (
                          <button onClick={step.run} className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg flex items-center gap-1 ${step.color}`}>
                            {step.label} →
                          </button>
                        ) : null;
                      })()}
                      {order.status === 'CONVERTED' && order.sale?.id && (
                        <button
                          onClick={() => navigate(`/sales/${order.sale.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        >
                          Abrir Venda →
                        </button>
                      )}
                      {order.status === 'SEPARATED' && (
                        <button
                          onClick={() => doReturnToSeparation(order)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg"
                        >
                          ↩ Devolver
                        </button>
                      )}
                      {(order.status === 'DRAFT' ||
                        (order.status === 'PENDING' && order.pendingOriginOrderId)) && (
                        <button
                          onClick={() => handleDelete(order.id, order.orderNumber)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  {order.sale && (
                    <p className="text-xs text-emerald-600 mt-2">Venda: {order.sale.saleNumber}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} de {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de aprovação compartilhado entre desktop/mobile */}
      <ApproveSalesOrderModal
        isOpen={!!approveTarget}
        orderId={approveTarget?.id || null}
        orderNumber={approveTarget?.number || null}
        onClose={() => setApproveTarget(null)}
      />

      {separatingId && (
        <SeparationModal orderId={separatingId} onClose={() => setSeparatingId(null)} onDone={() => setSeparatingId(null)} />
      )}
      {deliveringOrder && (
        <DeliveryModal orderId={deliveringOrder.id} orderNumber={deliveringOrder.number} onClose={() => setDeliveringOrder(null)} onDone={() => setDeliveringOrder(null)} />
      )}
    </div>
  );
}
