import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales, useSaleStats, useDeleteSale } from '../hooks/useSales';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { SaleStatus } from '@ejr/shared-types';
import {
  DollarSign,
  Eye,
  Trash2,
  Plus,
  Search,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<SaleStatus, { label: string; bg: string; text: string; icon: any }> = {
  PENDING: { label: 'Pendente', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  PAID: { label: 'Pago', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  PARTIAL: { label: 'Parcial', bg: 'bg-blue-50', text: 'text-blue-700', icon: TrendingUp },
  OVERDUE: { label: 'Atrasado', bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-500', icon: X },
};

export function SalesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SaleStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useSales({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: stats } = useSaleStats();
  const deleteSale = useDeleteSale();
  const { formatPrice } = useFormatPrice();

  const handleDelete = async (id: string, number: string) => {
    if (window.confirm(`Deseja realmente excluir a venda ${number}?`)) {
      try {
        await deleteSale.mutateAsync(id);
        toast.success('Venda excluida com sucesso');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Erro ao excluir venda');
      }
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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
            <p className="text-sm text-gray-500">Gerencie suas vendas e pagamentos</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/sales/new')}
          className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nova Venda
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Total Vendas</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalSales}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Faturamento</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Recebido</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatPrice(stats.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">A Receber</span>
            </div>
            <p className="text-xl font-bold text-red-600">{formatPrice(stats.totalPending)}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por numero, cliente..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as SaleStatus | ''); setPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="px-4 pb-4 border-t pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Carregando vendas...</p>
          </div>
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">Nenhuma venda encontrada</p>
          <p className="text-sm text-gray-400">
            {hasActiveFilters ? 'Tente alterar os filtros' : 'Crie sua primeira venda'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Venda</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pago</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendente</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((sale: any) => {
                  const cfg = statusConfig[sale.status as SaleStatus];
                  const StatusIcon = cfg?.icon;
                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/sales/${sale.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{sale.saleNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{sale.customer?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatPrice(sale.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {formatPrice(sale.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {sale.totalPending > 0 ? formatPrice(sale.totalPending) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${cfg?.bg} ${cfg?.text}`}>
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                          {cfg?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/sales/${sale.id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {sale.status === 'PENDING' && (
                            <button
                              onClick={() => handleDelete(sale.id, sale.saleNumber)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
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
            {data?.data?.map((sale: any) => {
              const cfg = statusConfig[sale.status as SaleStatus];
              const StatusIcon = cfg?.icon;
              const paidPercent = sale.total > 0 ? Math.round((sale.totalPaid / sale.total) * 100) : 0;

              return (
                <div
                  key={sale.id}
                  className="bg-white rounded-xl shadow-sm border p-4 active:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-semibold text-gray-900">{sale.saleNumber}</span>
                      <p className="text-sm text-gray-500">{sale.customer?.name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg?.bg} ${cfg?.text}`}>
                      {StatusIcon && <StatusIcon className="w-3 h-3" />}
                      {cfg?.label}
                    </span>
                  </div>

                  {/* Payment progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</span>
                      <span className="text-gray-500">{paidPercent}% pago</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          paidPercent >= 100 ? 'bg-emerald-500' : paidPercent > 0 ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                        style={{ width: `${Math.min(paidPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">{formatPrice(sale.total)}</span>
                    {sale.totalPending > 0 && (
                      <span className="text-sm text-red-600 font-medium">
                        Falta: {formatPrice(sale.totalPending)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {(page - 1) * 20 + 1}-{Math.min(page * 20, data.total)} de {data.total}
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
                  disabled={page * 20 >= data.total}
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
