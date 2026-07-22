import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Receipt, X, Clock } from 'lucide-react';
import { useNextNfNumber } from '../hooks/useSales';
import { useActiveCarriers } from '../hooks/useCarriers';
import { CurrencyInput } from './CurrencyInput';
import type { Currency } from '@ejr/shared-types';

export interface NfData {
  nfNumber: string;
  nfDate?: string;
  nfAmount?: number; // centavos
  carrierId?: string;
  file: File | null;
}

/**
 * Modal de Faturamento (NF de saída). Coleta os dados da NF e devolve via
 * onConfirm — o pai decide o que fazer (faturar uma venda existente OU converter
 * um pedido em venda e já lançar a NF).
 *
 * Data/hora e valor vêm automáticos; o número da NF vem sugerido (último + 1) e
 * editável (1º faturamento vem vazio). Mantém o anexo opcional da NF.
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

  const nowLabel = (() => {
    const d = new Date();
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  })();

  const submit = async () => {
    if (!nfNumber.trim()) { toast.error('Informe o número da NF'); return; }
    setSaving(true);
    try {
      await onConfirm({ nfNumber: nfNumber.trim(), nfDate: nfDate || undefined, nfAmount: nfAmount || undefined, carrierId: carrierId || undefined, file });
      // sucesso: o pai fecha/navega. Não mexemos mais no estado.
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Erro ao faturar');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600" /> Faturamento — {title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5" /> Data/hora do faturamento: <strong className="text-slate-700">{nowLabel}</strong> (automático)
          </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Data da NF</label>
              <input type="date" value={nfDate} onChange={(e) => setNfDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
            </div>
            <div>
              <CurrencyInput label="Valor da NF" value={nfAmount} currency={currency} onChange={(v) => setNfAmount(v)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Transportadora (opcional)</label>
            <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
              <option value="">Definir na expedição…</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Anexar arquivo da NF (PDF/imagem) — opcional</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Faturando…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
