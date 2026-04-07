import { useCashBox } from '../hooks/useCashBox';
import { useFormatPrice } from '../hooks/useFormatPrice';
import {
  Vault,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  ShieldCheck,
  Receipt,
  Percent,
} from 'lucide-react';
import type { CashBoxAlert, CashBoxDailyFlow } from '@ejr/shared-types';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
};

function AlertIcon({ type }: { type: CashBoxAlert['type'] }) {
  switch (type) {
    case 'DANGER':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'WARNING':
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    case 'INFO':
      return <Info className="w-5 h-5 text-blue-500" />;
    case 'SUCCESS':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
}

const alertStyles: Record<CashBoxAlert['type'], string> = {
  DANGER: 'bg-red-50 border-red-200 text-red-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  SUCCESS: 'bg-green-50 border-green-200 text-green-800',
};

function CashFlowChart({ data, formatPrice }: { data: CashBoxDailyFlow[]; formatPrice: (v: number) => string }) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-gray-400">Sem dados</div>;
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.receivable, d.payable, Math.abs(d.cumulativeBalance))),
    1
  );

  // Show cumulative balance line relative to chart
  const minBalance = Math.min(...data.map((d) => d.cumulativeBalance));
  const maxBalance = Math.max(...data.map((d) => d.cumulativeBalance));
  const balanceRange = maxBalance - minBalance || 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>A Receber</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>A Pagar</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Saldo Acumulado</span>
        </div>
      </div>
      <div className="h-48 flex items-end gap-px overflow-x-auto pb-6 relative">
        {data.map((day, i) => {
          const recH = maxValue > 0 ? (day.receivable / maxValue) * 100 : 0;
          const payH = maxValue > 0 ? (day.payable / maxValue) * 100 : 0;
          const isNegative = day.cumulativeBalance < 0;

          return (
            <div key={i} className="flex-1 min-w-[12px] flex flex-col items-center gap-px group relative">
              <div className="w-full flex flex-col items-center gap-px" style={{ height: '160px' }}>
                <div className="w-full flex items-end justify-center gap-px h-full">
                  <div
                    className="bg-green-400 hover:bg-green-500 rounded-t transition-colors"
                    style={{ height: `${Math.max(recH, 1)}%`, width: '40%' }}
                  />
                  <div
                    className="bg-red-400 hover:bg-red-500 rounded-t transition-colors"
                    style={{ height: `${Math.max(payH, 1)}%`, width: '40%' }}
                  />
                </div>
              </div>
              {/* Balance indicator dot */}
              <div
                className={`absolute w-2 h-2 rounded-full ${isNegative ? 'bg-red-600' : 'bg-blue-600'}`}
                style={{
                  bottom: `${24 + ((day.cumulativeBalance - minBalance) / balanceRange) * 80}px`,
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                <div>{formatDate(day.date)}</div>
                <div className="text-green-300">+ {formatPrice(day.receivable)}</div>
                <div className="text-red-300">- {formatPrice(day.payable)}</div>
                <div className={day.cumulativeBalance < 0 ? 'text-red-300' : 'text-blue-300'}>
                  Saldo: {formatPrice(day.cumulativeBalance)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CashBoxPage() {
  const { formatPrice } = useFormatPrice();
  const { data: cashBox, isLoading, refetch, isRefetching } = useCashBox();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Vault className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Caixa</h1>
        </div>
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!cashBox) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Vault className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Caixa</h1>
        </div>
        <div className="text-center py-12 text-gray-400">Erro ao carregar dados</div>
      </div>
    );
  }

  const { currentBalance, projections, dailyCashFlow, alerts, healthMetrics } = cashBox;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Vault className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Caixa</h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards - Saldo + Projeções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Saldo Estimado */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Saldo Estimado</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentBalance.estimatedBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <Vault className={`w-5 h-5 ${
                currentBalance.estimatedBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
          <div className={`text-xl lg:text-2xl font-bold ${
            currentBalance.estimatedBalance >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {formatPrice(currentBalance.estimatedBalance)}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Recebido</span>
              <span className="text-green-600">+{formatPrice(currentBalance.totalReceived)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cobranças</span>
              <span className="text-green-600">+{formatPrice(currentBalance.collectionsDeposited)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pago</span>
              <span className="text-red-600">-{formatPrice(currentBalance.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Comissões</span>
              <span className="text-red-600">-{formatPrice(currentBalance.commissionsPaid)}</span>
            </div>
          </div>
        </div>

        {/* Projeções */}
        {projections.map((proj) => {
          const label = proj.period === '7d' ? '7 Dias' : proj.period === '15d' ? '15 Dias' : '30 Dias';
          const isPositive = proj.projectedBalance >= 0;
          return (
            <div key={proj.period} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Projeção {label}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isPositive ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  {isPositive
                    ? <TrendingUp className="w-5 h-5 text-blue-600" />
                    : <TrendingDown className="w-5 h-5 text-red-600" />
                  }
                </div>
              </div>
              <div className={`text-xl lg:text-2xl font-bold ${isPositive ? 'text-blue-700' : 'text-red-700'}`}>
                {formatPrice(proj.projectedBalance)}
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Entradas</span>
                  <span className="text-green-600">+{formatPrice(proj.expectedIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saídas</span>
                  <span className="text-red-600">-{formatPrice(proj.expectedExpenses)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertas Inteligentes */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${alertStyles[alert.type]}`}
              >
                <AlertIcon type={alert.type} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{alert.title}</div>
                  <div className="text-xs mt-0.5 opacity-80">{alert.description}</div>
                  {alert.amount !== undefined && alert.type !== 'WARNING' && (
                    <div className="text-sm font-semibold mt-1">{formatPrice(Math.abs(alert.amount))}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico Fluxo de Caixa Projetado */}
      <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5 mb-6 min-w-0">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Fluxo de Caixa Projetado (30 dias)
        </h2>
        <CashFlowChart
          data={dailyCashFlow}
          formatPrice={formatPrice}
        />
      </div>

      {/* Métricas de Saúde + Movimentação Prevista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métricas de Saúde Financeira */}
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            Saúde Financeira
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Liquidez */}
            <div className="p-4 rounded-xl border bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">Índice de Liquidez</div>
              <div className={`text-2xl font-bold ${
                healthMetrics.liquidityRatio >= 1.5
                  ? 'text-green-700'
                  : healthMetrics.liquidityRatio >= 1
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}>
                {healthMetrics.liquidityRatio >= 999 ? '---' : `${healthMetrics.liquidityRatio.toFixed(1)}x`}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {healthMetrics.liquidityRatio >= 1.5
                  ? 'Saudável'
                  : healthMetrics.liquidityRatio >= 1
                  ? 'Atenção'
                  : 'Crítico'}
              </div>
            </div>

            {/* Prazo Médio */}
            <div className="p-4 rounded-xl border bg-gray-50">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Prazo Médio Recebimento
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {healthMetrics.averageDaysToReceive.toFixed(0)}d
              </div>
              <div className="text-xs text-gray-400 mt-1">Últimos 90 dias</div>
            </div>

            {/* Eficiência de Cobrança */}
            <div className="p-4 rounded-xl border bg-gray-50">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Receipt className="w-3 h-3" />
                Eficiência de Cobrança
              </div>
              <div className={`text-2xl font-bold ${
                healthMetrics.collectionEfficiency >= 0.8
                  ? 'text-green-700'
                  : healthMetrics.collectionEfficiency >= 0.5
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}>
                {(healthMetrics.collectionEfficiency * 100).toFixed(0)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    healthMetrics.collectionEfficiency >= 0.8
                      ? 'bg-green-500'
                      : healthMetrics.collectionEfficiency >= 0.5
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(healthMetrics.collectionEfficiency * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Inadimplência */}
            <div className="p-4 rounded-xl border bg-gray-50">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Taxa de Inadimplência
              </div>
              <div className={`text-2xl font-bold ${
                healthMetrics.overdueRatio <= 0.1
                  ? 'text-green-700'
                  : healthMetrics.overdueRatio <= 0.3
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}>
                {(healthMetrics.overdueRatio * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {healthMetrics.overdueRatio <= 0.1
                  ? 'Baixa'
                  : healthMetrics.overdueRatio <= 0.3
                  ? 'Moderada'
                  : 'Alta'}
              </div>
            </div>
          </div>
        </div>

        {/* Movimentação Prevista (Próx 7 dias) */}
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            Movimentação Prevista (7 dias)
          </h2>
          <div className="space-y-2">
            {dailyCashFlow.slice(0, 7).map((day) => {
              const hasMovement = day.receivable > 0 || day.payable > 0;
              return (
                <div
                  key={day.date}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    hasMovement ? 'bg-gray-50' : 'bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{formatDate(day.date)}</div>
                    <div className="flex gap-3 mt-0.5 text-xs">
                      {day.receivable > 0 && (
                        <span className="text-green-600 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          {formatPrice(day.receivable)}
                        </span>
                      )}
                      {day.payable > 0 && (
                        <span className="text-red-600 flex items-center gap-1">
                          <ArrowDownRight className="w-3 h-3" />
                          {formatPrice(day.payable)}
                        </span>
                      )}
                      {!hasMovement && (
                        <span className="text-gray-400">Sem movimentação</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${
                      day.cumulativeBalance >= 0 ? 'text-blue-700' : 'text-red-700'
                    }`}>
                      {formatPrice(day.cumulativeBalance)}
                    </div>
                    <div className="text-xs text-gray-400">saldo</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
