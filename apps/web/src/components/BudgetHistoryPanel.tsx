import { useBudgetHistory, type BudgetHistoryEntry } from '../hooks/usePurchaseBudgets';
import { History, Plus, Pencil, Trash2, Check, RefreshCw, FileText } from 'lucide-react';

interface BudgetHistoryPanelProps {
  budgetId: string;
}

const ACTION_META: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  BUDGET_UPDATE: { icon: Pencil, color: 'text-blue-500', label: 'Orçamento alterado' },
  ITEM_ADD: { icon: Plus, color: 'text-emerald-500', label: 'Item adicionado' },
  ITEM_UPDATE: { icon: Pencil, color: 'text-amber-500', label: 'Item alterado' },
  ITEM_DELETE: { icon: Trash2, color: 'text-red-500', label: 'Item removido' },
  QUOTE_ADD: { icon: Plus, color: 'text-emerald-500', label: 'Cotação adicionada' },
  QUOTE_UPDATE: { icon: Pencil, color: 'text-amber-500', label: 'Cotação alterada' },
  QUOTE_DELETE: { icon: Trash2, color: 'text-red-500', label: 'Cotação removida' },
  QUOTE_SELECT: { icon: Check, color: 'text-blue-500', label: 'Cotação selecionada' },
  STATUS_CHANGE: { icon: RefreshCw, color: 'text-purple-500', label: 'Status alterado' },
};

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export function BudgetHistoryPanel({ budgetId }: BudgetHistoryPanelProps) {
  const { data: history, isLoading } = useBudgetHistory(budgetId);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">Histórico de Alterações</h3>
        {history && history.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{history.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400 flex flex-col items-center gap-1">
          <FileText className="w-6 h-6 opacity-30" />
          Nenhuma alteração registrada ainda.
        </div>
      ) : (
        <ol className="relative border-l border-gray-200 ml-2 space-y-3">
          {history.map((h: BudgetHistoryEntry) => {
            const meta = ACTION_META[h.action] || { icon: FileText, color: 'text-gray-400', label: h.action };
            const Icon = meta.icon;
            return (
              <li key={h.id} className="ml-4">
                <span className={`absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white border border-gray-200`}>
                  <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">{meta.label}</p>
                    {h.description && <p className="text-xs text-gray-500">{h.description}</p>}
                    {!h.description && h.field && (h.oldValue || h.newValue) && (
                      <p className="text-xs text-gray-500">
                        {h.field}: <span className="line-through text-gray-400">{h.oldValue ?? '—'}</span> → <strong>{h.newValue ?? '—'}</strong>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400">{fmtDateTime(h.createdAt)}</p>
                    {h.userName && <p className="text-[10px] text-gray-400">{h.userName}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
