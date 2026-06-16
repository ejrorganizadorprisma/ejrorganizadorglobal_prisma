import { useState, useEffect, useMemo } from 'react';
import { useSupplierOrder } from '../hooks/useSupplierOrders';
import { useCreateGoodsReceipt, useApproveGoodsReceipt } from '../hooks/useGoodsReceipts';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { X, PackageCheck, Check, AlertTriangle, Ban, Receipt, CalendarDays, Plus, Trash2 } from 'lucide-react';

type ConfStatus = 'CONFORME' | 'DIVERGENCIA' | 'REJEITADO';

interface ConfItem {
  supplierOrderItemId: string;
  productId: string;
  productName: string;
  productCode?: string;
  quantityOrdered: number;
  quantityPending: number;
  quantityReceived: number;
  unitPrice: number;
  status: ConfStatus;
  notes: string;
  // Precificação (R$): custo ↔ margem% ↔ venda (cálculo automático)
  costPrice: string;
  margin: string;
  salePrice: string;
}

interface Boleto { amount: string; dueDate: string; notes: string; }

interface ReceiveOrderModalProps {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

export function ReceiveOrderModal({ orderId, onClose, onDone }: ReceiveOrderModalProps) {
  const { data: order, isLoading } = useSupplierOrder(orderId);
  const createReceipt = useCreateGoodsReceipt();
  const approveReceipt = useApproveGoodsReceipt();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<ConfItem[]>([]);
  const [saving, setSaving] = useState(false);

  // ---- NF ----
  const [showNf, setShowNf] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BOLETO');
  const [splitCount, setSplitCount] = useState('1');
  const [intervalDays, setIntervalDays] = useState('30');
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  useEffect(() => {
    if (order?.items) {
      // Custos adicionais (impostos etc.) embutidos no custo do produto
      const pct = ((order as any)?.budget?.additionalCosts || []).reduce((s: number, c: any) => s + (c?.percentage || 0), 0);
      const mult = 1 + pct / 100;
      setItems(
        order.items
          .filter((it: any) => (it.quantityPending ?? it.quantity) > 0)
          .map((it: any) => {
            const pending = it.quantityPending ?? it.quantity;
            const costCents = Math.round(it.unitPrice * mult);
            return {
              supplierOrderItemId: it.id, productId: it.productId,
              productName: it.product?.name || '-', productCode: it.product?.code,
              quantityOrdered: it.quantity, quantityPending: pending, quantityReceived: pending,
              unitPrice: it.unitPrice, status: 'CONFORME' as ConfStatus, notes: '',
              costPrice: (costCents / 100).toFixed(2), margin: '', salePrice: '',
            };
          })
      );
      if ((order as any).totalAmount && !finalAmount) setFinalAmount(((order as any).totalAmount / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Cálculo automático custo ↔ margem% ↔ venda
  const updatePricing = (idx: number, field: 'costPrice' | 'margin' | 'salePrice', value: string) => {
    setItems((prev) => {
      const u = [...prev];
      const it = { ...u[idx], [field]: value };
      const cost = parseFloat(field === 'costPrice' ? value : it.costPrice) || 0;
      if (field === 'margin') {
        const m = parseFloat(value) || 0;
        it.salePrice = cost > 0 ? (cost * (1 + m / 100)).toFixed(2) : it.salePrice;
      } else if (field === 'salePrice') {
        const sale = parseFloat(value) || 0;
        it.margin = cost > 0 && sale > 0 ? (((sale - cost) / cost) * 100).toFixed(1) : '';
      } else {
        // mudou o custo: se tem margem, recalcula venda; senão recalcula margem pela venda
        const m = parseFloat(it.margin);
        const sale = parseFloat(it.salePrice) || 0;
        if (!isNaN(m)) it.salePrice = cost > 0 ? (cost * (1 + m / 100)).toFixed(2) : it.salePrice;
        else if (sale > 0 && cost > 0) it.margin = (((sale - cost) / cost) * 100).toFixed(1);
      }
      u[idx] = it;
      return u;
    });
  };

  const summary = useMemo(() => ({
    conformes: items.filter((i) => i.status === 'CONFORME').length,
    divergentes: items.filter((i) => i.status === 'DIVERGENCIA').length,
    rejeitados: items.filter((i) => i.status === 'REJEITADO').length,
  }), [items]);

  const totalCents = Math.round((parseFloat(finalAmount) || 0) * 100);
  const boletosTotalCents = boletos.reduce((s, b) => s + Math.round((parseFloat(b.amount) || 0) * 100), 0);

  const updateItem = (idx: number, field: keyof ConfItem, value: any) => {
    setItems((prev) => {
      const u = [...prev];
      const item = { ...u[idx], [field]: value };
      if (field === 'quantityReceived') {
        const qty = parseInt(value, 10) || 0;
        item.quantityReceived = qty;
        item.status = qty === 0 ? 'REJEITADO' : qty !== item.quantityPending ? 'DIVERGENCIA' : 'CONFORME';
      }
      u[idx] = item;
      return u;
    });
  };

  const autoSplit = () => {
    const n = parseInt(splitCount, 10); const days = parseInt(intervalDays, 10) || 30;
    if (!n || n < 1) { toast.error('Informe a quantidade de boletos.'); return; }
    if (totalCents <= 0) { toast.error('Informe o valor total da NF.'); return; }
    const base = Math.floor(totalCents / n); const rest = totalCents - base * n;
    const today = new Date(); const list: Boleto[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(today); d.setDate(d.getDate() + days * (i + 1));
      const cents = base + (i < rest ? 1 : 0);
      list.push({ amount: (cents / 100).toFixed(2), dueDate: d.toISOString().split('T')[0], notes: `Boleto ${i + 1}/${n}` });
    }
    setBoletos(list);
  };
  const addBoleto = () => setBoletos((p) => [...p, { amount: '', dueDate: '', notes: '' }]);
  const removeBoleto = (i: number) => setBoletos((p) => p.filter((_, idx) => idx !== i));
  const updateBoleto = (i: number, f: keyof Boleto, v: string) => setBoletos((p) => p.map((b, idx) => (idx === i ? { ...b, [f]: v } : b)));

  const handleConfirm = async () => {
    if (!order) return;
    if (!items.some((i) => i.quantityReceived > 0 && i.status !== 'REJEITADO')) {
      toast.error('Informe a quantidade recebida de pelo menos um item.'); return;
    }
    if (items.some((i) => i.status !== 'CONFORME' && !i.notes.trim())) {
      toast.error('Preencha o motivo dos itens com divergência ou recusados.'); return;
    }
    if (boletos.length > 0) {
      if (boletos.some((b) => !b.dueDate || !b.amount || parseFloat(b.amount) <= 0)) {
        toast.error('Preencha valor e vencimento de todos os boletos.'); return;
      }
    }

    setSaving(true);
    try {
      const receipt = await createReceipt.mutateAsync({
        supplierOrderId: order.id, supplierId: order.supplierId,
        receiptDate: new Date().toISOString().split('T')[0],
        invoiceNumber: invoiceNumber || undefined,
        items: items.map((item) => ({
          supplierOrderItemId: item.supplierOrderItemId, productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.status === 'REJEITADO' ? 0 : item.quantityReceived,
          quantityAccepted: item.status === 'REJEITADO' ? 0 : item.quantityReceived,
          quantityRejected: item.status === 'REJEITADO' ? item.quantityOrdered : 0,
          unitPrice: item.unitPrice,
          qualityStatus: (item.status === 'CONFORME' ? 'APPROVED' : item.status === 'REJEITADO' ? 'REJECTED' : 'PENDING') as any,
          notes: item.notes || undefined,
        })),
      } as any);
      await approveReceipt.mutateAsync(receipt.id);

      // Atualiza o preço de custo e de venda dos produtos
      let pricedAny = false;
      for (const item of items) {
        const costCents = Math.round((parseFloat(item.costPrice) || 0) * 100);
        const saleCents = Math.round((parseFloat(item.salePrice) || 0) * 100);
        if (item.productId && (costCents > 0 || saleCents > 0)) {
          try {
            await api.patch(`/products/${item.productId}`, {
              ...(costCents > 0 ? { costPrice: costCents, costPriceCurrency: 'BRL' } : {}),
              ...(saleCents > 0 ? { salePrice: saleCents, salePriceCurrency: 'BRL' } : {}),
            });
            pricedAny = true;
          } catch { /* não bloqueia o recebimento */ }
        }
      }
      if (pricedAny) queryClient.invalidateQueries({ queryKey: ['products'] });

      // Registra NF + boletos em Contas a Pagar (se informados)
      if (boletos.length > 0 && (order as any).budget?.id) {
        await api.post(`/purchase-budgets/${(order as any).budget.id}/register-invoice`, {
          invoiceNumber: invoiceNumber || undefined,
          finalAmount: totalCents || undefined,
          paymentMethod,
          installments: boletos.map((b, i) => ({
            installmentNumber: i + 1,
            amount: Math.round((parseFloat(b.amount) || 0) * 100),
            dueDate: b.dueDate, notes: b.notes || undefined,
          })),
        });
        queryClient.invalidateQueries({ queryKey: ['payables'] });
        queryClient.invalidateQueries({ queryKey: ['financial'] });
      }
      toast.success(boletos.length > 0 ? 'Recebimento confirmado! Estoque atualizado e boletos em Contas a Pagar.' : 'Recebimento confirmado! Estoque atualizado.');
      onDone();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao confirmar recebimento.');
    } finally {
      setSaving(false);
    }
  };

  const badge = (s: ConfStatus) =>
    s === 'CONFORME' ? { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Check, label: 'Conforme' }
    : s === 'DIVERGENCIA' ? { cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: AlertTriangle, label: 'Divergência' }
    : { cls: 'bg-red-50 text-red-700 ring-red-200', icon: Ban, label: 'Recusado' };

  const Stat = ({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) => (
    <div className={`flex-1 rounded-lg px-2 py-1.5 text-center ${tone}`}>
      <div className="text-[9px] uppercase tracking-wide opacity-70 font-semibold">{label}</div>
      <div className="text-lg font-bold leading-tight">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold truncate">Recebimento do Pedido</h3>
            <p className="text-xs text-emerald-50/90 truncate">
              {(order as any)?.budget?.title ? `${(order as any).budget.title} · ` : ''}Pedido {order?.orderNumber || ''}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5 bg-slate-50">
          {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-400">Carregando itens…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">Nenhum item pendente de recebimento.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{summary.conformes} conformes</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{summary.divergentes} divergências</span>
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">{summary.rejeitados} recusados</span>
              </div>

              {/* Itens */}
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const b = badge(item.status); const BIcon = b.icon;
                  return (
                    <div key={item.supplierOrderItemId} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                          {item.productCode && <p className="text-[10px] text-slate-400">{item.productCode}</p>}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0 ring-1 ${b.cls}`}>
                          <BIcon className="w-3 h-3" /> {b.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stat label="Pedido" value={item.quantityPending} tone="bg-slate-100 text-slate-700" />
                        <div className="flex-1 rounded-lg px-2 py-1 text-center bg-blue-50">
                          <div className="text-[9px] uppercase tracking-wide text-blue-600/70 font-semibold">Recebido</div>
                          <input
                            type="number" min={0} max={item.quantityPending} value={item.quantityReceived}
                            onChange={(e) => updateItem(idx, 'quantityReceived', e.target.value)}
                            className="w-full bg-transparent text-lg font-bold text-blue-700 text-center focus:outline-none"
                          />
                        </div>
                        <Stat label="Pendente"
                          value={<span className={item.quantityPending - item.quantityReceived > 0 ? 'text-amber-600' : 'text-emerald-600'}>{Math.max(0, item.quantityPending - item.quantityReceived)}</span>}
                          tone="bg-slate-100" />
                      </div>
                      {/* Precificação: Custo ↔ Margem% ↔ Venda */}
                      <div className="mt-2.5 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] uppercase tracking-wide text-slate-400 font-semibold">Preço de Custo (R$)</label>
                          <input type="number" step="0.01" value={item.costPrice}
                            onChange={(e) => updatePricing(idx, 'costPrice', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-sm text-right" />
                        </div>
                        <div className="w-20">
                          <label className="block text-[9px] uppercase tracking-wide text-blue-500 font-semibold text-center">Margem %</label>
                          <input type="number" step="0.1" value={item.margin}
                            onChange={(e) => updatePricing(idx, 'margin', e.target.value)}
                            placeholder="%" className="w-full px-2 py-1 border border-blue-300 bg-blue-50/40 rounded-lg text-sm text-center font-semibold text-blue-700" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] uppercase tracking-wide text-emerald-600 font-semibold">Valor de Venda (R$)</label>
                          <input type="number" step="0.01" value={item.salePrice}
                            onChange={(e) => updatePricing(idx, 'salePrice', e.target.value)}
                            className="w-full px-2 py-1 border border-emerald-300 rounded-lg text-sm text-right font-semibold text-emerald-700" />
                        </div>
                      </div>
                      {item.status !== 'CONFORME' && (
                        <input
                          type="text" value={item.notes} onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                          placeholder={item.status === 'REJEITADO' ? 'Motivo da recusa…' : item.quantityReceived < item.quantityPending ? 'Motivo (chegou menos)…' : 'Motivo da divergência…'}
                          className={`mt-2.5 w-full px-3 py-1.5 border rounded-lg text-sm ${!item.notes ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* NF + boletos */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setShowNf((v) => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">Nota Fiscal e boletos</span>
                  <span className="text-[11px] text-slate-400">(Contas a Pagar)</span>
                  <span className="ml-auto text-slate-400 text-xs">{showNf ? '▲' : '▼'}</span>
                </button>
                {showNf && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Nº Nota Fiscal</label>
                        <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="123456" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Valor total NF (R$)</label>
                        <input type="number" step="0.01" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-right" placeholder="0,00" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Forma de pagamento</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
                          <option value="BOLETO">Boleto</option><option value="PIX">PIX</option>
                          <option value="TRANSFER">Transferência</option><option value="CHEQUE">Cheque</option><option value="CASH">Dinheiro</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap bg-slate-50 rounded-lg p-2.5">
                      <div><label className="block text-[10px] text-slate-500">Nº boletos</label><input type="number" min={1} value={splitCount} onChange={(e) => setSplitCount(e.target.value)} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center" /></div>
                      <div><label className="block text-[10px] text-slate-500">Intervalo (dias)</label><input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-center" /></div>
                      <button onClick={autoSplit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Gerar</button>
                      <button onClick={addBoleto} className="px-2 py-1.5 text-blue-600 text-xs flex items-center gap-1 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
                    </div>
                    {boletos.length > 0 && (
                      <div className="space-y-1.5">
                        {boletos.map((b, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4">{i + 1}.</span>
                            <input type="number" step="0.01" value={b.amount} onChange={(e) => updateBoleto(i, 'amount', e.target.value)} placeholder="R$" className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-right" />
                            <input type="date" value={b.dueDate} onChange={(e) => updateBoleto(i, 'dueDate', e.target.value)} className="px-2 py-1 border border-slate-300 rounded text-sm" />
                            <input type="text" value={b.notes} onChange={(e) => updateBoleto(i, 'notes', e.target.value)} placeholder="Obs." className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm" />
                            <button onClick={() => removeBoleto(i)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        <p className={`text-xs text-right ${Math.abs(boletosTotalCents - totalCents) > 1 ? 'text-amber-600' : 'text-slate-500'}`}>
                          Boletos: <strong>{brl(boletosTotalCents)}</strong> / NF: <strong>{brl(totalCents)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleConfirm} disabled={saving || isLoading || items.length === 0}
            className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm">
            <PackageCheck className="w-4 h-4" /> {saving ? 'Salvando…' : 'Confirmar recebimento'}
          </button>
        </div>
      </div>
    </div>
  );
}
