import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesOrders, useCancelSalesOrder, useDeleteSalesOrder } from '../hooks/useSalesOrders';
import { useFormatPrice } from '../hooks/useFormatPrice';
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
  Ban,
} from 'lucide-react';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { AppPage } from '@ejr/shared-types';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  DRAFT: { label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText },
  PENDING: { label: 'Pendente', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  APPROVED: { label: 'Aprovado', bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle },
  CONVERTED: { label: 'Faturado', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: ArrowRightCircle },
  CANCELLED: { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
};

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
  const { hasActionPermission } = usePagePermissions();
  const canEdit = hasActionPermission(AppPage.SALES, 'edit' as any);

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
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos de Venda</h1>
            <p className="text-sm text-gray-500">Pedidos registrados por vendedores para faturamento</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/sales-orders/new')}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por numero, cliente, vendedor..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as SalesOrderStatus | ''); setPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Todos status</option>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2.5 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
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
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order: any) => {
                  const cfg = statusConfig[order.status] || statusConfig.PENDING;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                        {order.sale && (
                          <span className="ml-2 text-xs text-emerald-600">
                            → {order.sale.saleNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.customer?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{order.seller?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && order.status !== 'CONVERTED' && order.status !== 'CANCELLED' && (
                            <button
                              onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar pedido"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {(order.status === 'PENDING' || order.status === 'APPROVED') && (
                            <button
                              onClick={() => navigate(`/sales-orders/${order.id}/convert`)}
                              className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Faturar (converter em venda)"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                            </button>
                          )}
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(order.id, order.orderNumber)}
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Cancelar pedido"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {order.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDelete(order.id, order.orderNumber)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir rascunho"
                            >
                              <Trash2 className="w-4 h-4" />
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
              const cfg = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = cfg.icon;
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                      <p className="text-sm text-gray-500">{order.customer?.name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
                    <div className="flex items-center gap-2">
                      {canEdit && order.status !== 'CONVERTED' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      )}
                      {(order.status === 'PENDING' || order.status === 'APPROVED') && (
                        <button
                          onClick={() => navigate(`/sales-orders/${order.id}/convert`)}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 flex items-center gap-1"
                        >
                          <ArrowRightCircle className="w-3.5 h-3.5" />
                          Faturar
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
    </div>
  );
}
