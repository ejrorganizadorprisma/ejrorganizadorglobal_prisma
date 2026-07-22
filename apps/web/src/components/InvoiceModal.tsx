import { useState } from 'react';
import { toast } from 'sonner';
import { Receipt, X } from 'lucide-react';
import { useInvoiceSale, useUploadSaleFile } from '../hooks/useSales';
import { useActiveCarriers } from '../hooks/useCarriers';
import type { Sale } from '@ejr/shared-types';

/**
 * Modal de Faturamento (NF de saída). Lança nº/data/valor + transportadora
 * opcional e (opcional) o arquivo da NF. Move a venda CONFERRED → IN_EXPEDITION.
 * Compartilhado entre a lista de Vendas e o detalhe da Venda.
 */
export function InvoiceModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const invoice = useInvoiceSale();
  const upload = useUploadSaleFile();
  const { data: carriers = [] } = useActiveCarriers();
  const [nfNumber, setNfNumber] = useState('');
  const [nfDate, setNfDate] = useState('');
  const [nfAmount, setNfAmount] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!nfNumber.trim()) { toast.error('Informe o número da NF'); return; }
    setSaving(true);
    try {
      const amountCents = nfAmount ? Math.round(parseFloat(nfAmount.replace(',', '.')) * 100) : undefined;
      await invoice.mutateAsync({ id: sale.id, data: { nfNumber: nfNumber.trim(), nfDate: nfDate || undefined, nfAmount: amountCents, carrierId: carrierId || undefined } });
      if (file) await upload.mutateAsync({ id: sale.id, endpoint: 'invoice-file', file });
      toast.success('Venda faturada! Enviada para expedição.');
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
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Número da NF *</label>
            <input autoFocus value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
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
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Arquivo da NF (PDF/imagem)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Faturando…' : 'Faturar'}</button>
        </div>
      </div>
    </div>
  );
}
