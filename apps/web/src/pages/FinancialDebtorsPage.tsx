import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDebtors } from '../hooks/useFinancial';
import { useFormatPrice } from '../hooks/useFormatPrice';
import {
  ArrowLeft,
  Search,
  Users,
  DollarSign,
  AlertTriangle,
  ShieldX,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
} from 'lucide-react';
import type { Debtor } from '@ejr/shared-types';

const sortOptions = [
  { value: 'debt', label: 'Maior Divida' },
  { value: 'overdue', label: 'Maior Atraso' },
  { value: 'daysOverdue', label: 'Mais Dias' },
  { value: 'name', label: 'Nome' },
] as const;

type SortBy = 'debt' | 'overdue' | 'daysOverdue' | 'name';

function AgingBar({ aging }: { aging: Debtor['aging'] }) {
  const total = aging.current + aging.days30 + aging.days60 + aging.days90plus;
  if (total === 0) return <div className="flex gap-0.5"><div className="w-2 h-2 rounded-full bg-gray-200" /><div className="w-2 h-2 rounded-full bg-gray-200" /><div className="w-2 h-2 rounded-full bg-gray-200" /><div className="w-2 h-2 rounded-full bg-gray-200" /></div>;
  return (
    <div className="flex gap-0.5" title={`0-30d: ${Math.round((aging.current / total) * 100)}% | 31-60d: ${Math.round((aging.days30 / total) * 100)}% | 61-90d: ${Math.round((aging.days60 / total) * 100)}% | 90+d: ${Math.round((aging.days90plus / total) * 100)}%`}>
      <div className={`w-2 h-2 rounded-full ${aging.current > 0 ? 'bg-green-400' : 'bg-gray-200'}`} />
      <div className={`w-2 h-2 rounded-full ${aging.days30 > 0 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
      <div className={`w-2 h-2 rounded-full ${aging.days60 > 0 ? 'bg-orange-400' : 'bg-gray-200'}`} />
      <div className={`w-2 h-2 rounded-full ${aging.days90plus > 0 ? 'bg-red-500' : 'bg-gray-200'}`} />
    </div>
  );
}

function getStatusBadge(debtor: Debtor) {
  if (debtor.creditMaxDays === null || debtor.creditMaxDays === undefined) {
    return { label: 'Sem Limite', className: 'bg-gray-100 text-gray-600' };
  }
  if (debtor.isCreditExceeded) {
    return { label: 'Excedido', className: 'bg-red-100 text-red-800' };
  }
  if (debtor.creditExpiresInDays !== null && debtor.creditExpiresInDays !== undefined && debtor.creditExpiresInDays <= 7) {
    return { label: 'Proximo', className: 'bg-yellow-100 text-yellow-800' };
  }
  return { label: 'OK', className: 'bg-green-100 text-green-800' };
}

export function FinancialDebtorsPage() {
  const { formatPrice } = useFormatPrice();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyCreditExceeded, setOnlyCreditExceeded] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('debt');
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useDebtors({
    search,
    onlyOverdue,
    onlyCreditExceeded,
    sortBy,
    sortOrder: 'desc',
    page,
    limit: 20,
  });

  const debtors: Debtor[] = data?.data || [];
  const total = data?.total || 0;
  const totals = data?.totals || { totalDebt: 0, totalOverdue: 0, totalPending: 0, debtorCount: 0 };
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/financial" className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <Users className="w-8 h-8 text-amber-600" />
        <h1 className="text-2xl lg:text-3xl font-bold">Devedores</h1>
        {totals.debtorCount > 0 && (
          <span className="ml-2 px-2.5 py-0.5 text-sm font-medium bg-amber-100 text-amber-800 rounded-full">
            {totals.debtorCount}
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">Total Devedores</span>
          </div>
          <div className="text-lg lg:text-xl font-bold text-blue-600">{totals.debtorCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-500">Divida Total</span>
          </div>
          <div className="text-lg lg:text-xl font-bold text-amber-600 truncate">{formatPrice(totals.totalDebt)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-500">Atrasado</span>
          </div>
          <div className="text-lg lg:text-xl font-bold text-red-600 truncate">{formatPrice(totals.totalOverdue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldX className="w-4 h-4 text-red-700" />
            <span className="text-sm text-gray-500">Credito Excedido</span>
          </div>
          <div className="text-lg lg:text-xl font-bold text-red-700">
            {debtors.filter(d => d.isCreditExceeded).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome do cliente..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Toggle Buttons */}
          <button
            onClick={() => { setOnlyOverdue(!onlyOverdue); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              onlyOverdue
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Apenas Atrasados
            </span>
          </button>

          <button
            onClick={() => { setOnlyCreditExceeded(!onlyCreditExceeded); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              onlyCreditExceeded
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ShieldX className="w-3.5 h-3.5" />
              Credito Excedido
            </span>
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Carregando...</div>
        ) : debtors.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum devedor encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Cliente</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Divida Total</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Atrasado</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Dias</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Prazo Credito</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Aging</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.map((debtor) => {
                    const status = getStatusBadge(debtor);
                    return (
                      <tr key={debtor.customerId} className={`border-b hover:bg-gray-50 ${debtor.isCreditExceeded ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{debtor.customerName}</div>
                          {debtor.customerPhone && (
                            <div className="text-xs text-gray-400">{debtor.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-700">
                          {formatPrice(debtor.totalDebt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {debtor.overdueAmount > 0 ? (
                            <span className="font-medium text-red-600">{formatPrice(debtor.overdueAmount)}</span>
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {debtor.daysOverdue > 0 ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              {debtor.daysOverdue}d
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {debtor.creditMaxDays !== null && debtor.creditMaxDays !== undefined
                            ? `${debtor.creditMaxDays}d`
                            : 'Sem limite'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <AgingBar aging={debtor.aging} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/sales?customerId=${debtor.customerId}`}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Vendas
                            </Link>
                            <Link
                              to={`/financial/receivables?entityId=${debtor.customerId}`}
                              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Receber
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y">
              {debtors.map((debtor) => {
                const status = getStatusBadge(debtor);
                return (
                  <div key={debtor.customerId} className={`p-4 ${debtor.isCreditExceeded ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{debtor.customerName}</div>
                        {debtor.customerPhone && (
                          <div className="text-xs text-gray-400">{debtor.customerPhone}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 text-xs">Divida Total</span>
                        <div className="font-medium text-green-700">{formatPrice(debtor.totalDebt)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Atrasado</span>
                        <div className={debtor.overdueAmount > 0 ? 'font-medium text-red-600' : 'text-gray-300'}>
                          {debtor.overdueAmount > 0 ? formatPrice(debtor.overdueAmount) : '\u2014'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Dias Atraso</span>
                        <div>
                          {debtor.daysOverdue > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              {debtor.daysOverdue}d
                            </span>
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Prazo Credito</span>
                        <div className="text-gray-600">
                          {debtor.creditMaxDays !== null && debtor.creditMaxDays !== undefined
                            ? `${debtor.creditMaxDays}d`
                            : 'Sem limite'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <AgingBar aging={debtor.aging} />
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/sales?customerId=${debtor.customerId}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Vendas
                        </Link>
                        <Link
                          to={`/financial/receivables?entityId=${debtor.customerId}`}
                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Receber
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
              {total} devedor{total !== 1 ? 'es' : ''} encontrado{total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Pagina {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
