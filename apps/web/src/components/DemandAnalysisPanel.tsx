import { useEffect, useState } from 'react';
import { useDemandAnalysis } from '../hooks/useDemandAnalysis';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, Package, BarChart3, Clock, ShieldCheck } from 'lucide-react';
import type { AbcClassification, ConsumptionTrend, DemandAnalysisPeriod } from '@ejr/shared-types';

interface DemandAnalysisPanelProps {
  productId: string;
  onSuggestedQuantity?: (qty: number) => void;
  onClose?: () => void;
}

const ABC_STYLES: Record<AbcClassification, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-red-100', text: 'text-red-700', label: 'A - Crítico' },
  B: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'B - Importante' },
  C: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'C - Baixo impacto' },
};

const TREND_CONFIG: Record<ConsumptionTrend, { icon: typeof TrendingUp; color: string; label: string }> = {
  INCREASING: { icon: TrendingUp, color: 'text-green-600', label: 'Em alta' },
  STABLE: { icon: Minus, color: 'text-gray-500', label: 'Estável' },
  DECREASING: { icon: TrendingDown, color: 'text-red-500', label: 'Em queda' },
};

const PERIOD_OPTIONS: { value: DemandAnalysisPeriod; label: string }[] = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
];

export function DemandAnalysisPanel({ productId, onSuggestedQuantity, onClose }: DemandAnalysisPanelProps) {
  const [period, setPeriod] = useState<DemandAnalysisPeriod>(6);
  const { data: analysis, isLoading, error } = useDemandAnalysis(productId, period);

  useEffect(() => {
    if (analysis && analysis.suggestedQuantity > 0 && onSuggestedQuantity) {
      onSuggestedQuantity(analysis.suggestedQuantity);
    }
  }, [analysis, onSuggestedQuantity]);

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-blue-200 rounded" />
          <div className="h-4 w-48 bg-blue-200 rounded" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="h-16 bg-blue-100 rounded" />
          <div className="h-16 bg-blue-100 rounded" />
          <div className="h-16 bg-blue-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !analysis) return null;

  const abc = ABC_STYLES[analysis.abcClass];
  const trendCfg = TREND_CONFIG[analysis.trend];
  const TrendIcon = trendCfg.icon;

  // Stock level percentage
  const stockPercentage = analysis.minimumStock > 0
    ? (analysis.currentStock / analysis.minimumStock) * 100
    : analysis.currentStock > 0 ? 100 : 0;

  const stockBarColor = stockPercentage > 100
    ? 'bg-green-500' : stockPercentage >= 50
    ? 'bg-yellow-500' : 'bg-red-500';

  const stockStatusLabel = stockPercentage > 100
    ? 'Adequado' : stockPercentage >= 50
    ? 'Atenção' : 'Crítico';

  // Days coverage status
  const coverageColor = analysis.daysOfStockRemaining > 30
    ? 'text-green-600' : analysis.daysOfStockRemaining > 14
    ? 'text-yellow-600' : 'text-red-600';

  // Mini bar chart for monthly breakdown
  const monthsToShow = Math.min(period, analysis.monthlyBreakdown.length);
  const visibleMonths = analysis.monthlyBreakdown.slice(-monthsToShow);
  const maxConsumption = Math.max(...visibleMonths.map(m => m.quantity), 1);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-100/60">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-bold rounded ${abc.bg} ${abc.text}`}>
            {analysis.abcClass}
          </span>
          <span className="text-sm font-semibold text-gray-700">
            Análise de Demanda
          </span>
          <span className="text-xs text-gray-500">
            {analysis.productCode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-white rounded-md border border-blue-200 overflow-hidden">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-blue-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-blue-200 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Stock Level */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Estoque</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {analysis.currentStock}
              <span className="text-xs font-normal text-gray-400">/{analysis.minimumStock} mín</span>
            </div>
            <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${stockBarColor} transition-all`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              />
            </div>
            <span className={`text-[10px] ${stockPercentage > 100 ? 'text-green-600' : stockPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {stockStatusLabel}
            </span>
          </div>

          {/* Consumption */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Consumo</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {Math.round(analysis.avgMonthlyConsumption)}
              <span className="text-xs font-normal text-gray-400"> un/mês</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon className={`w-3.5 h-3.5 ${trendCfg.color}`} />
              <span className={`text-xs ${trendCfg.color}`}>
                {analysis.trendPercentage > 0 ? '+' : ''}{analysis.trendPercentage}% {trendCfg.label}
              </span>
            </div>
          </div>

          {/* Coverage */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Cobertura</span>
            </div>
            <div className={`text-lg font-bold ${coverageColor}`}>
              {analysis.daysOfStockRemaining > 365 ? '365+' : analysis.daysOfStockRemaining}
              <span className="text-xs font-normal text-gray-400"> dias</span>
            </div>
            {analysis.daysOfStockRemaining <= 14 && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-[10px] text-red-500 font-medium">Reposição urgente</span>
              </div>
            )}
          </div>

          {/* Safety Info */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Segurança</span>
            </div>
            <div className="space-y-0.5 text-xs text-gray-600">
              <div>Est. Segurança: <span className="font-semibold">{analysis.safetyStock}</span></div>
              <div>Pto. Reposição: <span className="font-semibold">{analysis.reorderPoint}</span></div>
              <div>Prazo Entrega: <span className="font-semibold">{analysis.leadTimeDays}d</span></div>
            </div>
          </div>
        </div>

        {/* Suggestion + Chart Row */}
        <div className="mt-3 flex flex-col md:flex-row gap-3">
          {/* Suggestion Banner */}
          <div className={`flex-1 rounded-lg p-3 flex items-center gap-3 ${
            analysis.suggestedQuantity > 0
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className={`text-2xl ${analysis.suggestedQuantity > 0 ? '💡' : '✅'}`}>
              {analysis.suggestedQuantity > 0 ? '💡' : '✅'}
            </div>
            <div>
              {analysis.suggestedQuantity > 0 ? (
                <>
                  <div className="text-sm font-semibold text-amber-800">
                    Sugestão: {analysis.suggestedQuantity} unidades
                  </div>
                  <div className="text-xs text-amber-600">
                    Classe {analysis.abcClass} | Prazo {analysis.leadTimeDays}d | Seg. {analysis.safetyStock}
                    {analysis.activeReservations > 0 && ` | ${analysis.activeReservations} reservadas`}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-green-800">
                    Estoque adequado
                  </div>
                  <div className="text-xs text-green-600">
                    Nível atual atende a demanda prevista
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mini Chart */}
          {visibleMonths.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm min-w-[200px]">
              <div className="text-[10px] text-gray-400 uppercase mb-1">
                Consumo {period} Meses
              </div>
              <div className="flex items-end gap-1 h-10">
                {visibleMonths.map((m, i) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        i === visibleMonths.length - 1 ? 'bg-blue-500' : 'bg-blue-200'
                      }`}
                      style={{ height: `${(m.quantity / maxConsumption) * 100}%`, minHeight: m.quantity > 0 ? '2px' : '0px' }}
                    />
                    <span className="text-[8px] text-gray-400">
                      {m.month.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preferred supplier */}
        {analysis.preferredSupplier && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5 px-1">
            <span>Fornecedor preferido:</span>
            <span className="font-medium text-gray-700">{analysis.preferredSupplier.name}</span>
            <span className="text-gray-300">|</span>
            <span>Prazo: {analysis.preferredSupplier.leadTimeDays}d</span>
            <span className="text-gray-300">|</span>
            <span>Mín.: {analysis.preferredSupplier.minimumQuantity} un</span>
          </div>
        )}
      </div>
    </div>
  );
}
