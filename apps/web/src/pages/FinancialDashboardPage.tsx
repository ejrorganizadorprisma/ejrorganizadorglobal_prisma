import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinancialSummary, useCashFlow } from '../hooks/useFinancial';
import { useFormatPrice } from '../hooks/useFormatPrice';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Users,
} from 'lucide-react';
import type { FinancialEntry } from '@ejr/shared-types';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
};

const daysUntil = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const paymentMethodLabel: Record<string, string> = {
  CASH: 'Dinheiro', CREDIT_CARD: 'Credito', DEBIT_CARD: 'Debito',
  BANK_TRANSFER: 'Transferencia', PIX: 'PIX', CHECK: 'Cheque',
  PROMISSORY: 'Promissoria', BOLETO: 'Boleto', OTHER: 'Outro',
};

function EntryRow({ entry }: { entry: FinancialEntry }) {
  const { formatPrice } = useFormatPrice();
  const days = daysUntil(entry.dueDate);
  const isOverdue = entry.status === 'OVERDUE' || (entry.status === 'PENDING' && days < 0);
  const isToday = days === 0;
  const isReceivable = entry.direction === 'RECEIVABLE';

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-4 rounded-lg ${
      isOverdue ? 'bg-red-50' : isToday ? 'bg-amber-50' : 'bg-gray-50'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isReceivable ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{entry.entityName}</span>
            <span className="text-xs text-gray-500">{entry.sourceNumber}</span>
          </div>
          <div className="text-xs text-gray-500">
            Parcela {entry.installmentNumber} - Venc. {formatDate(entry.dueDate)}
            {isOverdue && <span className="text-red-600 font-medium ml-2">{Math.abs(days)}d atrasado</span>}
            {isToday && <span className="text-amber-600 font-medium ml-2">Hoje</span>}
            {!isOverdue && !isToday && days > 0 && <span className="text-gray-400 ml-2">em {days}d</span>}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-semibold text-sm ${isReceivable ? 'text-green-700' : 'text-red-700'}`}>
          {isReceivable ? '+' : '-'} {formatPrice(entry.amount)}
        </div>
        <Link
          to={isReceivable ? '/financial/receivables' : '/financial/payables'}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver detalhes
        </Link>
      </div>
    </div>
  );
}

function CashFlowChart({ days: periodDays }: { days: number }) {
  const { formatPrice } = useFormatPrice();
  const { data: cashFlow, isLoading } = useCashFlow(periodDays);

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-gray-400">Carregando gráfico...</div>;
  }

  if (!cashFlow || cashFlow.days.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">Sem dados para o período</div>;
  }

  const maxValue = Math.max(
    ...cashFlow.days.map(d => Math.max(d.receivable, d.payable, Math.abs(d.cumulativeBalance))),
    1
  );

  // Agrupar por semana para melhor visualização
  const grouped: Array<{ label: string; receivable: number; payable: number; balance: number }> = [];
  const groupSize = periodDays <= 30 ? 1 : periodDays <= 60 ? 3 : 7;

  for (let i = 0; i < cashFlow.days.length; i += groupSize) {
    const chunk = cashFlow.days.slice(i, i + groupSize);
    const receivable = chunk.reduce((s, d) => s + d.receivable, 0);
    const payable = chunk.reduce((s, d) => s + d.payable, 0);
    const lastDay = chunk[chunk.length - 1];
    grouped.push({
      label: formatDate(chunk[0].date),
      receivable,
      payable,
      balance: lastDay.cumulativeBalance,
    });
  }

  const displayDays = grouped.slice(0, 30); // max 30 bars

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 lg:gap-6 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>A Receber: {formatPrice(cashFlow.totalReceivable)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>A Pagar: {formatPrice(cashFlow.totalPayable)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Saldo: {formatPrice(cashFlow.netBalance)}</span>
        </div>
      </div>
      <div className="h-48 flex items-end gap-px overflow-x-auto pb-6 relative">
        {displayDays.map((day, i) => {
          const recH = maxValue > 0 ? (day.receivable / maxValue) * 100 : 0;
          const payH = maxValue > 0 ? (day.payable / maxValue) * 100 : 0;
          return (
            <div key={i} className="flex-1 min-w-[12px] flex flex-col items-center gap-px group relative">
              <div className="w-full flex flex-col items-center gap-px" style={{ height: '160px' }}>
                <div className="w-full flex items-end justify-center gap-px h-full">
                  <div
                    className="bg-green-400 hover:bg-green-500 rounded-t transition-colors"
                    style={{ height: `${Math.max(recH, 1)}%`, width: '45%' }}
                    title={`Receber: ${formatPrice(day.receivable)}`}
                  />
                  <div
                    className="bg-red-400 hover:bg-red-500 rounded-t transition-colors"
                    style={{ height: `${Math.max(payH, 1)}%`, width: '45%' }}
                    title={`Pagar: ${formatPrice(day.payable)}`}
                  />
                </div>
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                <div>{day.label}</div>
                <div className="text-green-300">+ {formatPrice(day.receivable)}</div>
                <div className="text-red-300">- {formatPrice(day.payable)}</div>
                <div className="text-blue-300">Saldo: {formatPrice(day.balance)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FinancialDashboardPage() {
  const { formatPrice } = useFormatPrice();
  const { data: summary, isLoading } = useFinancialSummary();
  const [cashFlowPeriod, setCashFlowPeriod] = useState(30);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 lg:px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Financeiro</h1>
        </div>
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      </div>
    );
  }

  const s = summary || {
    totalReceivable: 0,
    totalPayable: 0,
    projectedBalance: 0,
    overdueReceivable: 0,
    overduePayable: 0,
    dueTodayReceivable: 0,
    dueTodayPayable: 0,
    upcomingEntries: [],
    overdueEntries: [],
    receivableByStatus: {},
    payableByStatus: {},
  };

  const totalDueToday = s.dueTodayReceivable + s.dueTodayPayable;
  const totalOverdue = s.overdueReceivable + s.overduePayable;

  return (
    <div className="container mx-auto px-4 lg:px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Financeiro</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/financial/calendar"
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm"
          >
            <Calendar className="w-4 h-4" />
            Calendário
          </Link>
          <Link
            to="/financial/receivables"
            className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-sm text-green-700"
          >
            <ArrowUpRight className="w-4 h-4" />
            A Receber
          </Link>
          <Link
            to="/financial/payables"
            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-sm text-red-700"
          >
            <ArrowDownRight className="w-4 h-4" />
            A Pagar
          </Link>
          <Link
            to="/financial/debtors"
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 text-sm font-medium text-amber-700"
          >
            <Users className="w-4 h-4" />
            Devedores
          </Link>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total a Receber</span>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-green-700">{formatPrice(s.totalReceivable)}</div>
          {s.overdueReceivable > 0 && (
            <div className="text-xs text-red-500 mt-1">
              {formatPrice(s.overdueReceivable)} atrasado
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total a Pagar</span>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-red-700">{formatPrice(s.totalPayable)}</div>
          {s.overduePayable > 0 && (
            <div className="text-xs text-red-500 mt-1">
              {formatPrice(s.overduePayable)} atrasado
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Saldo Previsto</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              s.projectedBalance >= 0 ? 'bg-blue-100' : 'bg-amber-100'
            }`}>
              <Wallet className={`w-5 h-5 ${s.projectedBalance >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <div className={`text-xl lg:text-2xl font-bold ${s.projectedBalance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatPrice(s.projectedBalance)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Receber - Pagar</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Vencimentos Hoje</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              totalDueToday > 0 ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              <Clock className={`w-5 h-5 ${totalDueToday > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-bold">
            {formatPrice(totalDueToday)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {s.dueTodayReceivable > 0 && <span className="text-green-600">+{formatPrice(s.dueTodayReceivable)} </span>}
            {s.dueTodayPayable > 0 && <span className="text-red-600">-{formatPrice(s.dueTodayPayable)}</span>}
            {totalDueToday === 0 && 'Nenhum vencimento'}
          </div>
        </div>

        {summary?.salesToday !== undefined && (
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="text-sm text-gray-500">Vendas Hoje</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.salesToday}</div>
            {summary.revenueTodayTotal ? (
              <div className="text-xs text-gray-400 mt-1">{formatPrice(summary.revenueTodayTotal)}</div>
            ) : null}
          </div>
        )}
      </div>

      {/* Analise de Vencimento */}
      {summary?.receivableAging && (
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analise de Vencimento (A Receber)</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-700">{formatPrice(summary.receivableAging.current)}</div>
              <div className="text-xs text-gray-500 mt-1">0-30 dias</div>
              <div className="text-xs text-green-600">{summary.receivableAging.currentCount} parcelas</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-700">{formatPrice(summary.receivableAging.days30)}</div>
              <div className="text-xs text-gray-500 mt-1">31-60 dias</div>
              <div className="text-xs text-yellow-600">{summary.receivableAging.days30Count} parcelas</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="text-2xl font-bold text-orange-700">{formatPrice(summary.receivableAging.days60)}</div>
              <div className="text-xs text-gray-500 mt-1">61-90 dias</div>
              <div className="text-xs text-orange-600">{summary.receivableAging.days60Count} parcelas</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="text-2xl font-bold text-red-700">{formatPrice(summary.receivableAging.days90plus)}</div>
              <div className="text-xs text-gray-500 mt-1">90+ dias</div>
              <div className="text-xs text-red-600">{summary.receivableAging.days90plusCount} parcelas</div>
            </div>
          </div>
        </div>
      )}

      {/* Por Metodo de Pagamento */}
      {summary?.paymentMethodBreakdown && summary.paymentMethodBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Por Metodo de Pagamento</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {summary.paymentMethodBreakdown.map((pm) => (
              <div key={pm.method} className="p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                <div className="text-sm font-medium text-gray-700">{paymentMethodLabel[pm.method] || pm.method}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">{formatPrice(pm.totalAmount)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{pm.count} parcelas</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-green-600">{formatPrice(pm.paidAmount)}</span>
                  <span className="text-yellow-600">{formatPrice(pm.pendingAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fluxo de Caixa */}
      <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5 mb-6 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Fluxo de Caixa</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setCashFlowPeriod(d)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  cashFlowPeriod === d ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <CashFlowChart days={cashFlowPeriod} />
      </div>

      {/* Próximos Vencimentos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Vencimentos */}
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Próximos Vencimentos
            </h2>
            <Link to="/financial/calendar" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver calendário <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {s.upcomingEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum vencimento próximo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {s.upcomingEntries.slice(0, 8).map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        {/* Alertas Atrasados */}
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${totalOverdue > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              Atrasados
              {totalOverdue > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">
                  {formatPrice(totalOverdue)}
                </span>
              )}
            </h2>
          </div>
          {s.overdueEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma parcela atrasada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {s.overdueEntries.slice(0, 8).map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Maiores Devedores */}
      {summary?.topDebtors && summary.topDebtors.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Maiores Devedores
            </h2>
            <Link to="/financial/debtors" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {summary.topDebtors.map((debtor) => (
              <div key={debtor.customerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium text-sm text-gray-900">{debtor.customerName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {debtor.totalSales} vendas
                    {debtor.daysOverdue > 0 && <span className="text-red-500 ml-2">{debtor.daysOverdue}d atrasado</span>}
                    {debtor.isCreditExceeded && <span className="text-red-700 ml-2 font-semibold">Credito excedido</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-700 text-sm">{formatPrice(debtor.totalDebt)}</div>
                  {debtor.overdueAmount > 0 && (
                    <div className="text-xs text-red-500">{formatPrice(debtor.overdueAmount)} atrasado</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
