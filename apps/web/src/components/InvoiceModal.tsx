import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Receipt, X, Clock, FileText, FileX2, Info } from 'lucide-react';
import { useNextNfNumber } from '../hooks/useSales';
import { useActiveCarriers } from '../hooks/useCarriers';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { CurrencyInput } from './CurrencyInput';
import type { Currency } from '@ejr/shared-types';

export interface NfData {
  /** true = faturar SEM Nota Fiscal (não consome a numeração de NF). */
  withoutNf: boolean;
  nfNumber: string;
  nfDate?: string;
  nfAmount?: number; // centavos
  carrierId?: string;
  file: File | null;
}

/** Corpo do POST /sales/:id/invoice a partir do que o modal devolveu. */
export function invoicePayload(nf: NfData) {
  if (nf.withoutNf) return { withoutNf: true, carrierId: nf.carrierId };
  return { nfNumber: nf.nfNumber, nfDate: nf.nfDate, nfAmount: nf.nfAmount, carrierId: nf.carrierId };
}

/**
 * Modal de Faturamento. Coleta os dados da NF de saída e devolve via onConfirm —
 * o pai decide o que fazer (faturar uma venda existente OU converter um pedido
 * em venda e já faturar).
 *
 * Se o admin habilitou "Faturamento sem Nota Fiscal" (Configurações do Sistema),
 * aparece a escolha Com NF / Sem NF. Sem NF não pede número/data/valor/anexo e
 * não avança a sequência de numeração das NFs.
 */
export function InvoiceModal({
  title,
  defaultAmountCents,
  currency,
  confirmLabel = 'Confirmar faturamento',
  onClose,
  onConfirm,
}: {
  title: string;
  defaultAmountCents: number; // valor total no formato de armazenamento da moeda (PYG inteiro; BRL/USD centavos)
  currency: Currency;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (nf: NfData) => Promise<void>;
}) {
  const { data: carriers = [] } = useActiveCarriers();
  const { data: suggestedNf } = useNextNfNumber();
  const { data: settings } = useSystemSettings();
  const allowWithoutNf = !!settings?.invoiceWithoutNfEnabled;

  const [withoutNf, setWithoutNf] = useState(false);
  const [nfNumber, setNfNumber] = useState('');
  const [nfDate, setNfDate] = useState(new Date().toISOString().slice(0, 10));
  const [nfAmount, setNfAmount] = useState<number>(defaultAmountCents ?? 0);
  const [carrierId, setCarrierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Pré-preenche o número sugerido só enquanto o campo estiver vazio.
  useEffect(() => {
    if (suggestedNf) setNfNumber((prev) => prev || suggestedNf);
  }, [suggestedNf]);

  // Se a opção for desabilitada pelo admin, volta para "Com NF".
  useEffect(() => {
    if (!allowWithoutNf) setWithoutNf(false);
  }, [allowWithoutNf]);

  const nowLabel = (() => {
    const d = new Date();
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  })();

  const submit = async () => {
    if (!withoutNf && !nfNumber.trim()) { toast.error('Informe o número da NF'); return; }
    setSaving(true);
    try {
      await onConfirm(
        withoutNf
          ? { withoutNf: true, nfNumber: '', carrierId: carrierId || undefined, file: null }
          : { withoutNf: false, nfNumber: nfNumber.trim(), nfDate: nfDate || undefined, nfAmount: nfAmount || undefined, carrierId: carrierId || undefined, file }
      );
      // sucesso: o pai fecha/navega. Não mexemos mais no estado.
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Erro ao faturar');
      setSaving(false);
    }
  };

  const modes = [
    { key: false, label: 'Com Nota Fiscal', hint: 'Lança a NF de saída', Icon: FileText },
    { key: true, label: 'Sem Nota Fiscal', hint: 'Não usa numeração', Icon: FileX2 },
  ] as const;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2 min-w-0">
            <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="truncate">Faturamento — {title}</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          {/* Com NF / Sem NF (só quando o admin habilitou) */}
          {allowWithoutNf && (
            <div role="radiogroup" aria-label="Tipo de faturamento" className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              {modes.map(({ key, label, hint, Icon }) => {
                const active = withoutNf === key;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setWithoutNf(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                      active
                        ? key
                          ? 'bg-white shadow-sm ring-1 ring-amber-300 text-amber-700'
                          : 'bg-white shadow-sm ring-1 ring-emerald-300 text-emerald-700'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{label}</span>
                      <span className="block text-[10.5px] opacity-75 leading-tight">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Data/hora do faturamento: <strong className="text-slate-700">{nowLabel}</strong> (automático)
          </div>

          {withoutNf ? (
            <div className="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <Info className="w-4 h-4 shrink-0 mt-px" />
              <span>
                A venda será faturada <strong>sem Nota Fiscal</strong> e seguirá para a expedição. A numeração das NFs
                não é alterada{suggestedNf ? <> — a próxima NF continua sendo <strong>{suggestedNf}</strong></> : null}.
              </span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Número da NF *</label>
                <input
                  autoFocus
                  value={nfNumber}
                  onChange={(e) => setNfNumber(e.target.value)}
                  placeholder={suggestedNf ? '' : 'Lance o número da NF'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {suggestedNf ? 'Sugerido a partir do último (editável).' : 'Primeiro faturamento — o próximo já virá sugerido.'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Data da NF</label>
                  <input type="date" value={nfDate} onChange={(e) => setNfDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <CurrencyInput label="Valor da NF" value={nfAmount} currency={currency} onChange={(v) => setNfAmount(v)} />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Transportadora (opcional)</label>
            <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
              <option value="">Definir na expedição…</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {!withoutNf && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Anexar arquivo da NF (PDF/imagem) — opcional</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button
            onClick={submit}
            disabled={saving}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${withoutNf ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {saving ? 'Faturando…' : withoutNf ? 'Faturar sem NF' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
