import { useState } from 'react';
import { toast } from 'sonner';
import { Receipt, X, Sparkles } from 'lucide-react';
import { useInvoiceSale, useUploadSaleFile } from '../hooks/useSales';
import { useActiveCarriers } from '../hooks/useCarriers';
import type { Sale } from '@ejr/shared-types';

/**
 * Modal de Faturamento (NF de saída). A NF é GERADA AUTOMATICAMENTE ao faturar
 * (nº sequencial NF-AAAA-NNNN, data = hoje, valor = total da venda). O usuário
 * pode ajustar data/valor e, se quiser, informar um número manual.
 * Move a venda CONFERRED → IN_EXPEDITION. Compartilhado entre lista e detalhe da Venda.
 */
export function InvoiceModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const invoice = useInvoiceSale();
  const upload = useUploadSaleFile();
  const { data: carriers = [] } = useActiveCarriers();
  const [nfNumber, setNfNumber] = useState('');
  const [nfDate, setNfDate] = useState(new Date().toISOString().slice(0, 10));
  const [nfAmount, setNfAmount] = useState(((sale.total ?? 0) / 100).toFixed(2).replace('.', ','));
  const [carrierId, setCarrierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const amountCents = nfAmount ? Math.round(parseFloat(nfAmount.replace(',', '.')) * 100) : undefined;
      await invoice.mutateAsync({
        id: sale.id,
        data: {
          nfNumber: nfNumber.trim() || undefined, // vazio → backend gera automaticamente
          nfDate: nfDate || undefined,
          nfAmount: amountCents,
          carrierId: carrierId || undefined,
        },
      });
      if (file) await upload.mutateAsync({ id: sale.id, endpoint: 'invoice-file', file });
      toast.success('NF gerada! Venda enviada para expedição.');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao faturar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600" /> Faturamento — {sale.saleNumber}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>A NF será <strong>gerada automaticamente</strong> (número sequencial, data de hoje e valor da venda). Ajuste abaixo se precisar.</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Data da NF</label>
              <input type="date" value={nfDate} onChange={(e) => setNfDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Valor da NF</label>
              <input value={nfAmount} onChange={(e) => setNfAmount(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Transportadora (opcional)</label>
            <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
              <option value="">Definir na expedição…</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!showManual ? (
            <button type="button" onClick={() => setShowManual(true)} className="text-xs text-slate-500 hover:text-slate-700 underline">
              Informar número da NF manualmente
            </button>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Número da NF (manual)</label>
              <input autoFocus value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} placeholder="Deixe em branco para gerar automaticamente" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Arquivo da NF (PDF/imagem) — opcional</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> {saving ? 'Faturando…' : 'Faturar e gerar NF'}
          </button>
        </div>
      </div>
    </div>
  );
}
