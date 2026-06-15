import type { ReactNode } from 'react';
import { useLastPurchase, type LastPurchaseRecord } from '../hooks/usePurchaseBudgets';
import { convertPrice } from '../lib/currency';
import type { Currency } from '@ejr/shared-types';
import { History, TrendingUp, TrendingDown, Minus, Building2, Truck, FileText, Receipt, Calendar, Package, X } from 'lucide-react';

interface ExchangeSettings {
  exchangeRateBrlToUsd: number;
  exchangeRateBrlToPyg: number;
}

interface LastPurchasePanelProps {
  productId: string;
  /** Taxas para converter o custo atual (em sua moeda) para BRL e calcular a variação. */
  exchangeSettings?: ExchangeSettings | null;
  onClose?: () => void;
}

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
};

export function LastPurchasePanel({ productId, exchangeSettings, onClose }: LastPurchasePanelProps) {
  const { data, isLoading } = useLastPurchase(productId);

  if (isLoading) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-emerald-200 rounded" />
          <div className="h-4 w-40 bg-emerald-200 rounded" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="h-12 bg-emerald-100 rounded" />
          <div className="h-12 bg-emerald-100 rounded" />
          <div className="h-12 bg-emerald-100 rounded" />
        </div>
      </div>
    );
  }

  // Sem histórico de compra
  if (!data || !data.last) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Package className="w-4 h-4 text-gray-400" />
        Primeira compra deste produto.
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const last = data.last;
  const previous = data.previous;

  // Variação vs. preço de custo atual cadastrado (convertido para BRL).
  let variation: number | null = null;
  if (data.currentCost && data.currentCost.value > 0 && last.unitPrice > 0) {
    const currentBRL = convertPrice(
      data.currentCost.value,
      (data.currentCost.currency as Currency) || 'BRL',
      'BRL',
      exchangeSettings,
    );
    variation = ((currentBRL - last.unitPrice) / last.unitPrice) * 100;
  }

  const VarIcon = variation == null ? Minus : variation > 0 ? TrendingUp : variation < 0 ? TrendingDown : Minus;
  // Cores discretas: alta em âmbar, queda em verde, estável em cinza.
  const varColor =
    variation == null || Math.abs(variation) < 0.01
      ? 'text-gray-500 bg-gray-100'
      : variation > 0
      ? 'text-amber-700 bg-amber-100'
      : 'text-emerald-700 bg-emerald-100';

  const Detail = ({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: ReactNode }) => (
    <div className="flex items-start gap-1.5">
      <Icon className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
        <div className="text-xs font-medium text-gray-700 truncate">{value ?? '—'}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-800">Última compra</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{last.budgetNumber}</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preço + variação */}
      <div className="flex items-end gap-4 flex-wrap mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Valor unitário</div>
          <div className="text-2xl font-bold text-gray-800">{brl(last.unitPrice)}</div>
        </div>
        {variation != null && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${varColor}`}>
            <VarIcon className="w-4 h-4" />
            {variation > 0 ? '+' : ''}
            {variation.toFixed(2)}%
            <span className="text-[10px] font-normal opacity-70">vs. custo atual</span>
          </div>
        )}
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Valor total ({last.quantity} un.)</div>
          <div className="text-base font-semibold text-gray-700">{brl(last.totalValue)}</div>
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 border-t border-emerald-100 pt-3">
        <Detail icon={Calendar} label="Data" value={fmtDate(last.date)} />
        <Detail icon={Building2} label="Fornecedor" value={last.supplierName} />
        <Detail icon={Package} label="Indústria" value={last.manufacturer} />
        <Detail icon={Truck} label="Prazo" value={last.leadTimeDays != null ? `${last.leadTimeDays} dias` : last.paymentTerms} />
        <Detail icon={Receipt} label="Nota fiscal" value={last.invoiceNumber} />
        <Detail icon={FileText} label="Moeda" value={last.currency} />
      </div>

      {/* Penúltima compra (opcional) */}
      {previous && (
        <div className="mt-3 pt-2 border-t border-emerald-100 flex items-center gap-2 text-xs text-gray-500">
          <History className="w-3.5 h-3.5 text-gray-400" />
          <span>Penúltima: <strong className="text-gray-600">{brl(previous.unitPrice)}</strong></span>
          <span className="text-gray-300">·</span>
          <span>{fmtDate(previous.date)}</span>
          {previous.supplierName && <span className="text-gray-400">· {previous.supplierName}</span>}
          {previous.unitPrice > 0 && (
            <span className={`ml-auto ${last.unitPrice > previous.unitPrice ? 'text-amber-600' : last.unitPrice < previous.unitPrice ? 'text-emerald-600' : 'text-gray-400'}`}>
              {last.unitPrice >= previous.unitPrice ? '+' : ''}
              {(((last.unitPrice - previous.unitPrice) / previous.unitPrice) * 100).toFixed(2)}% na última
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export type { LastPurchaseRecord };
