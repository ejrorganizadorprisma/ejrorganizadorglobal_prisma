import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReceivables } from '../hooks/useFinancial';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useUpdatePayment } from '../hooks/useSales';
import { useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  ArrowLeft,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentStatus, type FinancialEntry, type FinancialFilters } from '@ejr/shared-types';

const formatDate = (dateStr: string) => {
  // Aceita 'YYYY-MM-DD' e também 'YYYY-MM-DD HH:MM:SS+00' (timestamptz das vendas):
  // usa só a parte da data, ao meio-dia, para não deslocar o dia pelo fuso.
  if (!dateStr) return '-';
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
  CANCELLED: 'Cancelado',
};

const statusBadge: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function FinancialReceivablesPage() {
  const { formatPrice } = useFormatPrice();
  const [filters, setFilters] = useState<FinancialFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [payingEntry, setPayingEntry] = useState<FinancialEntry | null>(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useReceivables(filters);
  const updatePayment = useUpdatePayment();
  const queryClient = useQueryClient();

  const entries = data?.data || [];
  const total = data?.total || 0;
  const totals = data?.totals || { pending: 0, paid: 0, overdue: 0, cancelled: 0, total: 0 };
  const totalPages = Math.ceil(total / (filters.limit || 20));

  const handleSearch = () => {
    setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }));
  };

  const handleMarkPaid = (entry: FinancialEntry) => {
    setPayingEntry(entry);
    setPaidDate(new Date().toISOString().split('T')[0]);
  };

  const confirmMarkPaid = async () => {
    if (!payingEntry) return;
    try {
      await updatePayment.mutateAsync({
        saleId: payingEntry.sourceId,
        paymentId: payingEntry.id,
        data: { status: PaymentStatus.PAID, paidDate },
      });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Parcela marcada como paga');
      setPayingEntry(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao marcar como pago');
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Link to="/financial" className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <ArrowUpRight className="w-6 h-6 text-green-600" />
        <h1 className="text-lg sm:text-xl font-bold leading-tight">Contas a Receber</h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl shadow-sm border p-3">
          <div className="text-xs text-gray-500 mb-0.5">Pendente</div>
          <div className="text-lg lg:text-xl font-bold tabular-nums text-yellow-600 truncate">{formatPrice(totals.pending)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-3">
          <div className="text-xs text-gray-500 mb-0.5">Recebido</div>
          <div className="text-lg lg:text-xl font-bold text-green-600 truncate">{formatPrice(totals.paid)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-3">
          <div className="text-xs text-gray-500 mb-0.5">Atrasado</div>
          <div className="text-lg lg:text-xl font-bold text-red-600 truncate">{formatPrice(totals.overdue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-3">
          <div className="text-xs text-gray-500 mb-0.5">Total</div>
          <div className="text-lg lg:text-xl font-bold text-gray-800 truncate">{formatPrice(totals.total)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por venda ou cliente..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Todos Status</option>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago</option>
            <option value="OVERDUE">Atrasado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined, page: 1 }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            title="Data inicial"
          />
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined, page: 1 }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            title="Data final"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleSearch} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Buscar
            </button>
            {(filters.search || filters.status || filters.startDate || filters.endDate) && (
              <button
                onClick={() => { setFilters({ page: 1, limit: 20 }); setSearchInput(''); }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Carregando...</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma parcela encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          {/* Tabela compacta — 1 linha por parcela */}
          <table className="w-full min-w-[720px] table-fixed text-[13px]">
            <colgroup>
              <col className="w-[120px]" />
              <col />
              <col className="w-[52px]" />
              <col className="w-[116px]" />
              <col className="w-[100px]" />
              <col className="hidden xl:table-column w-[64px]" />
              <col className="w-[96px]" />
              <col className="hidden xl:table-column w-[84px]" />
              <col className="w-[132px]" />
            </colgroup>
            <thead>
              <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Venda</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-center">Parcela</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="hidden xl:table-cell px-3 py-2 text-center">Dias</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="hidden xl:table-cell px-3 py-2 text-center">Credito</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => {
                const isOverdue = entry.status === 'OVERDUE';
                const isCreditExceeded = entry.isCreditExceeded === true;
                const daysLate = entry.daysOverdue && entry.daysOverdue > 0 ? entry.daysOverdue : 0;
                return (
                  <tr key={entry.id} className={`transition-colors hover:bg-blue-50/40 ${isOverdue || isCreditExceeded ? 'bg-red-50/60' : ''}`}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link to={`/sales/${entry.sourceId}`} className="text-blue-600 hover:underline font-semibold tabular-nums">
                        {entry.sourceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 truncate font-medium text-gray-800" title={entry.entityName}>{entry.entityName}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{entry.installmentNumber}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700 whitespace-nowrap tabular-nums">
                      {formatPrice(entry.amount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums text-gray-600">
                      {formatDate(entry.dueDate)}
                      {daysLate > 0 && (
                        <span className="xl:hidden ml-1 text-[10.5px] font-semibold text-red-700" title={`${daysLate} dias em atraso`}>{daysLate}d</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2 text-center">
                      {daysLate > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800 tabular-nums">
                          {daysLate}d
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${statusBadge[entry.status] || 'bg-gray-100'}`}>
                        {statusLabel[entry.status] || entry.status}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2 text-center">
                      {entry.customerCreditMaxDays ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                          entry.isCreditExceeded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-700'
                        }`}>
                          {entry.isCreditExceeded ? 'Excedido' : `${entry.customerCreditMaxDays}d`}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {(entry.status === 'PENDING' || entry.status === 'OVERDUE') && (
                        <button
                          onClick={() => handleMarkPaid(entry)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-[11px] font-semibold rounded-md hover:bg-green-700"
                        >
                          <Check className="w-3 h-3" />
                          Receber
                        </button>
                      )}
                      {entry.status === 'PAID' && entry.paidDate && (
                        <span className="text-[11px] text-gray-500 tabular-nums">
                          Pago em {formatDate(entry.paidDate)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
              {total} parcela{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
                disabled={(filters.page || 1) <= 1}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Página {filters.page || 1} de {totalPages}
              </span>
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
                disabled={(filters.page || 1) >= totalPages}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog confirmar pagamento */}
      {payingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Confirmar Recebimento</h3>
              <button onClick={() => setPayingEntry(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Venda</span>
                <span>{payingEntry.sourceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cliente</span>
                <span>{payingEntry.entityName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Parcela</span>
                <span>{payingEntry.installmentNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor</span>
                <span className="font-bold text-green-700">{formatPrice(payingEntry.amount)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data do Recebimento</label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPayingEntry(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmMarkPaid}
                disabled={updatePayment.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updatePayment.isPending ? 'Processando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
