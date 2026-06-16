import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { X, Receipt, Plus, Trash2, CalendarDays } from 'lucide-react';

interface Boleto {
  amount: string;   // R$ (string)
  dueDate: string;  // yyyy-mm-dd
  notes: string;
}

interface RegisterInvoiceModalProps {
  budgetId: string;
  /** Valor sugerido (centavos BRL) para pré-preencher o total da NF */
  suggestedTotalCents?: number;
  orderLabel?: string;
  onClose: () => void;
  onDone: () => void;
}

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

export function RegisterInvoiceModal({ budgetId, suggestedTotalCents = 0, orderLabel, onClose, onDone }: RegisterInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [finalAmount, setFinalAmount] = useState(suggestedTotalCents ? (suggestedTotalCents / 100).toFixed(2) : '');
  const [paymentMethod, setPaymentMethod] = useState('BOLETO');
  const [splitCount, setSplitCount] = useState('1');
  const [intervalDays, setIntervalDays] = useState('30');
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [saving, setSaving] = useState(false);

  const totalCents = Math.round((parseFloat(finalAmount) || 0) * 100);
  const boletosTotalCents = boletos.reduce((s, b) => s + Math.round((parseFloat(b.amount) || 0) * 100), 0);
  const diff = boletosTotalCents - totalCents;

  const autoSplit = () => {
    const n = parseInt(splitCount, 10);
    const days = parseInt(intervalDays, 10) || 30;
    if (!n || n < 1) { toast.error('Informe a quantidade de boletos.'); return; }
    if (totalCents <= 0) { toast.error('Informe o valor total da NF antes de dividir.'); return; }
    const base = Math.floor(totalCents / n);
    const rest = totalCents - base * n;
    const today = new Date();
    const list: Boleto[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + days * (i + 1));
      const cents = base + (i < rest ? 1 : 0);
      list.push({ amount: (cents / 100).toFixed(2), dueDate: d.toISOString().split('T')[0], notes: `Boleto ${i + 1}/${n}` });
    }
    setBoletos(list);
  };

  const addBoleto = () => setBoletos((p) => [...p, { amount: '', dueDate: '', notes: '' }]);
  const removeBoleto = (i: number) => setBoletos((p) => p.filter((_, idx) => idx !== i));
  const updateBoleto = (i: number, field: keyof Boleto, value: string) =>
    setBoletos((p) => p.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));

  const handleSave = async () => {
    if (boletos.length === 0) { toast.error('Adicione ao menos um vencimento (boleto).'); return; }
    for (const b of boletos) {
      if (!b.dueDate) { toast.error('Preencha o vencimento de todos os boletos.'); return; }
      if (!b.amount || parseFloat(b.amount) <= 0) { toast.error('Preencha o valor de todos os boletos.'); return; }
    }
    setSaving(true);
    try {
      await api.post(`/purchase-budgets/${budgetId}/register-invoice`, {
        invoiceNumber: invoiceNumber || undefined,
        finalAmount: totalCents || undefined,
        paymentMethod,
        installments: boletos.map((b, i) => ({
          installmentNumber: i + 1,
          amount: Math.round((parseFloat(b.amount) || 0) * 100),
          dueDate: b.dueDate,
          notes: b.notes || undefined,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      toast.success('Nota fiscal registrada! Boletos lançados em Contas a Pagar.');
      onDone();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao registrar nota fiscal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900">Registrar Nota Fiscal</h3>
            {orderLabel && <p className="text-xs text-gray-500 truncate">{orderLabel}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Nº Nota Fiscal</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Ex: 123456" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Valor total da NF (R$)</label>
              <input type="number" step="0.01" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Forma de pagamento</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="BOLETO">Boleto</option>
                <option value="PIX">PIX</option>
                <option value="TRANSFER">Transferência</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Dinheiro</option>
              </select>
            </div>
          </div>

          {/* Auto-split */}
          <div className="flex items-end gap-2 flex-wrap bg-gray-50 rounded-lg p-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Nº de boletos</label>
              <input type="number" min={1} value={splitCount} onChange={(e) => setSplitCount(e.target.value)} className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Intervalo (dias)</label>
              <input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
            </div>
            <button onClick={autoSplit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1">
              <CalendarDays className="w-4 h-4" /> Gerar boletos
            </button>
          </div>

          {/* Boletos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Vencimentos dos boletos</span>
              <button onClick={addBoleto} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
            </div>
            {boletos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Use "Gerar boletos" ou adicione manualmente.</p>
            ) : (
              <div className="space-y-2">
                {boletos.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <input type="number" step="0.01" value={b.amount} onChange={(e) => updateBoleto(i, 'amount', e.target.value)} placeholder="Valor R$" className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    <input type="date" value={b.dueDate} onChange={(e) => updateBoleto(i, 'dueDate', e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm" />
                    <input type="text" value={b.notes} onChange={(e) => updateBoleto(i, 'notes', e.target.value)} placeholder="Obs." className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                    <button onClick={() => removeBoleto(i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <div className={`text-xs text-right ${Math.abs(diff) > 1 ? 'text-amber-600' : 'text-gray-500'}`}>
                  Soma boletos: <strong>{brl(boletosTotalCents)}</strong> / NF: <strong>{brl(totalCents)}</strong>
                  {Math.abs(diff) > 1 && <span className="ml-1">(dif. {brl(Math.abs(diff))})</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> {saving ? 'Salvando…' : 'Registrar NF'}
          </button>
        </div>
      </div>
    </div>
  );
}
