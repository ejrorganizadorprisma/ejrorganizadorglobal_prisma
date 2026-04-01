import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePayables, usePayInstallment } from '../hooks/useFinancial';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  ArrowLeft,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FinancialEntry, FinancialFilters } from '@ejr/shared-types';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
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

export function FinancialPayablesPage() {
  const { formatPrice } = useFormatPrice();
  const [filters, setFilters] = useState<FinancialFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [payingEntry, setPayingEntry] = useState<FinancialEntry | null>(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = usePayables(filters);
  const payInstallment = usePayInstallment();
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
      await payInstallment.mutateAsync({
        budgetId: payingEntry.sourceId,
        installmentId: payingEntry.id,
        paidDate,
      });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Parcela marcada como paga');
      setPayingEntry(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao marcar como pago');
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/financial" className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <ArrowDownRight className="w-8 h-8 text-red-600" />
        <h1 className="text-2xl lg:text-3xl font-bold">Contas a Pagar</h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500 mb-1">Pendente</div>
          <div className="text-lg lg:text-xl font-bold text-yellow-600 truncate">{formatPrice(totals.pending)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500 mb-1">Pago</div>
          <div className="text-lg lg:text-xl font-bold text-green-600 truncate">{formatPrice(totals.paid)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500 mb-1">Atrasado</div>
          <div className="text-lg lg:text-xl font-bold text-red-600 truncate">{formatPrice(totals.overdue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500 mb-1">Total</div>
          <div className="text-lg lg:text-xl font-bold text-gray-800 truncate">{formatPrice(totals.total)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por orçamento ou fornecedor..."
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
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Orçamento</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fornecedor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Parcela</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Valor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Vencimento</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isOverdue = entry.status === 'OVERDUE';
                return (
                  <tr key={entry.id} className={`border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link to={`/purchase-budgets/${entry.sourceId}`} className="text-sm text-blue-600 hover:underline font-medium">
                        {entry.sourceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.entityName}</td>
                    <td className="px-4 py-3 text-sm text-center">{entry.installmentNumber}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-700">
                      {formatPrice(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{formatDate(entry.dueDate)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[entry.status] || 'bg-gray-100'}`}>
                        {statusLabel[entry.status] || entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(entry.status === 'PENDING' || entry.status === 'OVERDUE') && (
                        <button
                          onClick={() => handleMarkPaid(entry)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                        >
                          <Check className="w-3 h-3" />
                          Pagar
                        </button>
                      )}
                      {entry.status === 'PAID' && entry.paidDate && (
                        <span className="text-xs text-gray-500">
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
              <h3 className="text-lg font-semibold">Confirmar Pagamento</h3>
              <button onClick={() => setPayingEntry(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Orçamento</span>
                <span>{payingEntry.sourceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fornecedor</span>
                <span>{payingEntry.entityName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Parcela</span>
                <span>{payingEntry.installmentNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor</span>
                <span className="font-bold text-red-700">{formatPrice(payingEntry.amount)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data do Pagamento</label>
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
                disabled={payInstallment.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {payInstallment.isPending ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
