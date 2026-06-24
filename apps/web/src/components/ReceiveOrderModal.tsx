import { useState, useEffect, useMemo, useRef } from 'react';
import { useSupplierOrder } from '../hooks/useSupplierOrders';
import { useCreateGoodsReceipt, useApproveGoodsReceipt } from '../hooks/useGoodsReceipts';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { X, PackageCheck, Check, AlertTriangle, Ban, Receipt, CalendarDays, Plus, Trash2, History } from 'lucide-react';
import { formatPriceValue } from '../hooks/useFormatPrice';

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
  // Precificação (Guaraní): custo + 2 margens sobre o custo → atacado e varejo
  costPrice: string;
  marginWholesale: string; // margem custo → atacado
  wholesalePrice: string;  // Atacado
  margin: string;          // margem custo → varejo
  salePrice: string;       // Varejo
  // Histórico: último valor (atual) registrado no produto — só leitura, p/ comparação
  lastCost: string;
  lastMarginWholesale: string;
  lastWholesale: string;
  lastMargin: string;
  lastSale: string;
  hasHistory: boolean;
}

interface Boleto { amount: string; dueDate: string; notes: string; }

interface ReceiveOrderModalProps {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
// Data local em YYYY-MM-DD (evita off-by-one do toISOString em UTC)
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function ReceiveOrderModal({ orderId, onClose, onDone }: ReceiveOrderModalProps) {
  const { data: order, isLoading } = useSupplierOrder(orderId);
  const createReceipt = useCreateGoodsReceipt();
  const approveReceipt = useApproveGoodsReceipt();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<ConfItem[]>([]);
  const [saving, setSaving] = useState(false);
  // Quais itens estão exibindo a linha de histórico (último valor registrado)
  const [historyOpen, setHistoryOpen] = useState<Set<number>>(new Set());
  const toggleHistory = (idx: number) =>
    setHistoryOpen((s) => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  // Navegação por Enter: percorre os campos na ordem do DOM e termina no botão Confirmar
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const handleEnterNav = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT') return;
    e.preventDefault();
    const root = scrollRef.current;
    if (!root) return;
    const list = Array.from(
      root.querySelectorAll<HTMLInputElement>('input:not([type=hidden]):not([disabled]):not([readonly])')
    ).filter((el) => el.offsetParent !== null); // só visíveis
    const i = list.indexOf(target as HTMLInputElement);
    if (i >= 0 && i < list.length - 1) {
      const next = list[i + 1];
      next.focus();
      try { next.select(); } catch { /* date/number podem não suportar */ }
    } else {
      confirmRef.current?.focus(); // último campo → vai para Confirmar (Enter confirma)
    }
  };

  // ---- NF ----
  const [showNf, setShowNf] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BOLETO');
  const [splitCount, setSplitCount] = useState('1');
  const [intervalDays, setIntervalDays] = useState('30');
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  // === Conversão para Guaraní (mesmas taxas do orçamento) ===
  // Os preços do pedido ficam em centavos de BRL; aqui custo/venda são exibidos
  // em Guaraní (com R$/US$ abaixo) quando o orçamento tem câmbio cadastrado.
  const budgetData: any = (order as any)?.budget;
  const cr1 = budgetData?.exchangeRate1 || 0; // 1 BRL = X PYG
  const cr2 = budgetData?.exchangeRate2 || 0; // 1 USD = X PYG
  const cr3 = budgetData?.exchangeRate3 || 0; // 1 USD = X BRL
  const hasRates = cr1 > 0 && cr2 > 0 && cr3 > 0;
  const cRates: Record<string, number> | null = hasRates
    ? { BRL_PYG: cr1, PYG_BRL: 1 / cr1, USD_PYG: cr2, PYG_USD: 1 / cr2, USD_BRL: cr3, BRL_USD: 1 / cr3 }
    : null;
  const conv = (amt: number, from: string, to: string) => (from === to || !cRates) ? amt : amt * (cRates[`${from}_${to}`] ?? 1);
  const priceCur: 'PYG' | 'BRL' = hasRates ? 'PYG' : 'BRL';
  const priceSym = priceCur === 'PYG' ? '₲' : 'R$'; // ₲
  const fmtBRL = (amt: number) => formatPriceValue(Math.round(amt * 100), 'BRL');
  const fmtUSD = (amt: number) => formatPriceValue(Math.round(amt * 100), 'USD');
  // 2 moedas secundárias (R$ · US$) de um valor digitado na moeda de preço (PYG)
  const secOf = (val: string): string => {
    const n = parseFloat(val);
    if (!hasRates || !n) return '';
    return `${fmtBRL(conv(n, priceCur, 'BRL'))} · ${fmtUSD(conv(n, priceCur, 'USD'))}`;
  };
  // Valor digitado (na moeda de preço) → { value, currency } para gravar no produto.
  // Em modo Guaraní grava em PYG (inteiro); senão em BRL (centavos).
  const toStored = (val: string): { value: number; currency: string } => {
    const n = parseFloat(val) || 0;
    return priceCur === 'PYG'
      ? { value: Math.round(n), currency: 'PYG' }
      : { value: Math.round(n * 100), currency: 'BRL' };
  };

  // Preço armazenado no produto (value + currency) → número na moeda de preço (₲)
  const productPriceToCur = (value?: number, cur?: string): number => {
    if (!value) return 0;
    const c = cur || 'BRL';
    const amount = c === 'PYG' ? value : value / 100; // valor na moeda c
    const out = conv(amount, c, priceCur);
    return priceCur === 'PYG' ? Math.round(out) : Math.round(out * 100) / 100;
  };

  // Formata string numérica "crua" com separador de milhar pt-BR (₲ sem decimais)
  const grp = (plain: string): string => {
    if (plain === '' || plain == null) return '';
    if (priceCur === 'PYG') return (Math.round(parseFloat(plain) || 0)).toLocaleString('pt-BR');
    const [int, dec] = plain.split('.');
    const intFmt = (parseInt(int || '0', 10)).toLocaleString('pt-BR');
    return dec != null ? `${intFmt},${dec}` : intFmt;
  };
  // Texto digitado (com pontos/vírgula) → string numérica "crua" p/ o estado
  const parseGrp = (display: string): string => {
    if (priceCur === 'PYG') return display.replace(/\D/g, '');
    return display.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  };

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
            // Custo = preço unit. + custos adicionais, na moeda de preço (Guaraní quando há câmbio).
            // Converte a partir do valor exato (sem arredondar centavos antes) p/ o câmbio fechar.
            const withCostsBrl = it.unitPrice * mult; // centavos de BRL (fracionário)
            const cost = priceCur === 'PYG'
              ? Math.round(conv(withCostsBrl / 100, 'BRL', 'PYG'))
              : Math.round(withCostsBrl) / 100;
            const costStr = priceCur === 'PYG' ? String(cost) : cost.toFixed(2);
            // Varejo/Atacado = últimos valores do produto (convertidos p/ ₲)
            const varejo = productPriceToCur(it.product?.salePrice, it.product?.salePriceCurrency);
            const atacado = productPriceToCur(it.product?.wholesalePrice, it.product?.wholesalePriceCurrency);
            const varejoStr = varejo > 0 ? (priceCur === 'PYG' ? String(varejo) : varejo.toFixed(2)) : '';
            const atacadoStr = atacado > 0 ? (priceCur === 'PYG' ? String(atacado) : atacado.toFixed(2)) : '';
            const marginStr = cost > 0 && varejo > 0 ? (((varejo - cost) / cost) * 100).toFixed(1) : '';
            const marginWholesaleStr = cost > 0 && atacado > 0 ? (((atacado - cost) / cost) * 100).toFixed(1) : '';
            // Histórico = último valor (atual) registrado no produto: custo, atacado e varejo
            // anteriores + as margens que eles representavam sobre o custo anterior.
            const lastCostN = productPriceToCur(it.product?.costPrice, it.product?.costPriceCurrency);
            const lastCost = lastCostN > 0 ? (priceCur === 'PYG' ? String(lastCostN) : lastCostN.toFixed(2)) : '';
            const lastWholesale = atacadoStr; // atacado armazenado no produto
            const lastSale = varejoStr;       // varejo armazenado no produto
            const lastMargin = lastCostN > 0 && varejo > 0 ? (((varejo - lastCostN) / lastCostN) * 100).toFixed(1) : '';
            const lastMarginWholesale = lastCostN > 0 && atacado > 0 ? (((atacado - lastCostN) / lastCostN) * 100).toFixed(1) : '';
            return {
              supplierOrderItemId: it.id, productId: it.productId,
              productName: it.product?.name || '-', productCode: it.product?.code,
              quantityOrdered: it.quantity, quantityPending: pending, quantityReceived: pending,
              unitPrice: it.unitPrice, status: 'CONFORME' as ConfStatus, notes: '',
              costPrice: costStr, marginWholesale: marginWholesaleStr, wholesalePrice: atacadoStr,
              margin: marginStr, salePrice: varejoStr,
              lastCost, lastMarginWholesale, lastWholesale, lastMargin, lastSale,
              hasHistory: !!(lastCost || lastWholesale || lastSale),
            };
          })
      );
      if ((order as any).totalAmount && !finalAmount) setFinalAmount(((order as any).totalAmount / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Formata um valor na moeda de preço: Guaraní sem decimais, R$ com 2 casas
  const fmtPriceStr = (n: number) => (priceCur === 'PYG' ? String(Math.round(n)) : n.toFixed(2));

  // Cálculo automático: custo + margem(atacado) → atacado; custo + margem(varejo) → varejo
  const updatePricing = (idx: number, field: 'costPrice' | 'margin' | 'salePrice' | 'marginWholesale' | 'wholesalePrice', value: string) => {
    setItems((prev) => {
      const u = [...prev];
      const it = { ...u[idx], [field]: value };
      const cost = parseFloat(field === 'costPrice' ? value : it.costPrice) || 0;
      if (field === 'margin') {
        const m = parseFloat(value) || 0;
        it.salePrice = cost > 0 ? fmtPriceStr(cost * (1 + m / 100)) : it.salePrice;
      } else if (field === 'salePrice') {
        const sale = parseFloat(value) || 0;
        it.margin = cost > 0 && sale > 0 ? (((sale - cost) / cost) * 100).toFixed(1) : '';
      } else if (field === 'marginWholesale') {
        const mw = parseFloat(value) || 0;
        it.wholesalePrice = cost > 0 ? fmtPriceStr(cost * (1 + mw / 100)) : it.wholesalePrice;
      } else if (field === 'wholesalePrice') {
        const whole = parseFloat(value) || 0;
        it.marginWholesale = cost > 0 && whole > 0 ? (((whole - cost) / cost) * 100).toFixed(1) : '';
      } else {
        // mudou o custo: recalcula cada preço pela sua margem; se não tem margem, recalcula a margem pelo preço
        const m = parseFloat(it.margin);
        const sale = parseFloat(it.salePrice) || 0;
        if (!isNaN(m)) it.salePrice = cost > 0 ? fmtPriceStr(cost * (1 + m / 100)) : it.salePrice;
        else if (sale > 0 && cost > 0) it.margin = (((sale - cost) / cost) * 100).toFixed(1);
        const mw = parseFloat(it.marginWholesale);
        const whole = parseFloat(it.wholesalePrice) || 0;
        if (!isNaN(mw)) it.wholesalePrice = cost > 0 ? fmtPriceStr(cost * (1 + mw / 100)) : it.wholesalePrice;
        else if (whole > 0 && cost > 0) it.marginWholesale = (((whole - cost) / cost) * 100).toFixed(1);
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
      list.push({ amount: (cents / 100).toFixed(2), dueDate: localDate(d), notes: `Boleto ${i + 1}/${n}` });
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
        receiptDate: localDate(new Date()),
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
        const cost = toStored(item.costPrice);
        const varejo = toStored(item.salePrice);
        const atacado = toStored(item.wholesalePrice);
        if (item.productId && (cost.value > 0 || varejo.value > 0 || atacado.value > 0)) {
          try {
            await api.patch(`/products/${item.productId}`, {
              ...(cost.value > 0 ? { costPrice: cost.value, costPriceCurrency: cost.currency } : {}),
              ...(varejo.value > 0 ? { salePrice: varejo.value, salePriceCurrency: varejo.currency } : {}),
              ...(atacado.value > 0 ? { wholesalePrice: atacado.value, wholesalePriceCurrency: atacado.currency } : {}),
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

        <div ref={scrollRef} onKeyDown={handleEnterNav} className="flex-1 overflow-auto p-6 space-y-5 bg-slate-50">
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

              {/* Itens — layout compacto (2 linhas por item) */}
              <div className="space-y-1.5">
                {items.map((item, idx) => {
                  const b = badge(item.status); const BIcon = b.icon;
                  const statusColor = item.status === 'CONFORME' ? 'text-emerald-500' : item.status === 'DIVERGENCIA' ? 'text-amber-500' : 'text-red-500';
                  const pend = Math.max(0, item.quantityPending - item.quantityReceived);
                  return (
                    <div key={item.supplierOrderItemId} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                      {/* Linha 1: produto + quantidades */}
                      <div className="flex items-center gap-2">
                        <span className="shrink-0" title={b.label}><BIcon className={`w-3.5 h-3.5 ${statusColor}`} /></span>
                        <p className="text-[13px] font-medium text-slate-800 truncate flex-1 min-w-0">
                          {item.productName}
                          {item.productCode && <span className="text-[10px] text-slate-400 font-normal ml-1.5">{item.productCode}</span>}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] shrink-0">
                          <span className="text-slate-400">Ped</span><span className="font-bold text-slate-700">{item.quantityPending}</span>
                          <span className="text-slate-400 ml-1">Rec</span>
                          <input type="number" min={0} max={item.quantityPending} value={item.quantityReceived}
                            autoFocus={idx === 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(idx, 'quantityReceived', e.target.value)}
                            className="w-11 px-1 py-0.5 border border-blue-300 rounded text-center font-bold text-blue-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <span className="text-slate-400 ml-1">Pen</span>
                          <span className={`font-bold ${pend > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{pend}</span>
                        </div>
                      </div>
                      {/* Linha 2: preços em ₲ (R$/US$ no tooltip) — Custo · M%→Atacado · M%→Varejo */}
                      <div className="mt-1 flex items-end gap-1.5 flex-wrap">
                        <div className="w-[5.5rem]">
                          <label className="block text-[8px] uppercase tracking-wide text-slate-400 font-semibold leading-none mb-0.5">Custo {priceSym}</label>
                          <input type="text" inputMode="numeric" value={grp(item.costPrice)} title={secOf(item.costPrice) || undefined}
                            onChange={(e) => updatePricing(idx, 'costPrice', parseGrp(e.target.value))}
                            className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs text-right font-semibold" />
                        </div>
                        <div className="w-11">
                          <label className="block text-[8px] uppercase tracking-wide text-amber-600 font-semibold leading-none mb-0.5 text-center">Marg</label>
                          <div className="relative">
                            <input type="number" step="0.1" value={item.marginWholesale}
                              onChange={(e) => updatePricing(idx, 'marginWholesale', e.target.value)}
                              placeholder="0" className="w-full pl-1 pr-3.5 py-0.5 border border-amber-300 bg-amber-50/40 rounded text-xs text-right font-semibold text-amber-700" />
                            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-amber-600">%</span>
                          </div>
                        </div>
                        <div className="w-[5.5rem]">
                          <label className="block text-[8px] uppercase tracking-wide text-amber-600 font-semibold leading-none mb-0.5">Atac {priceSym}</label>
                          <input type="text" inputMode="numeric" value={grp(item.wholesalePrice)} title={secOf(item.wholesalePrice) || undefined}
                            onChange={(e) => updatePricing(idx, 'wholesalePrice', parseGrp(e.target.value))}
                            className="w-full px-1.5 py-0.5 border border-amber-300 rounded text-xs text-right font-semibold text-amber-700" />
                        </div>
                        <div className="w-11">
                          <label className="block text-[8px] uppercase tracking-wide text-emerald-600 font-semibold leading-none mb-0.5 text-center">Marg</label>
                          <div className="relative">
                            <input type="number" step="0.1" value={item.margin}
                              onChange={(e) => updatePricing(idx, 'margin', e.target.value)}
                              placeholder="0" className="w-full pl-1 pr-3.5 py-0.5 border border-emerald-300 bg-emerald-50/40 rounded text-xs text-right font-semibold text-emerald-700" />
                            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-emerald-600">%</span>
                          </div>
                        </div>
                        <div className="w-[5.5rem]">
                          <label className="block text-[8px] uppercase tracking-wide text-emerald-600 font-semibold leading-none mb-0.5">Varejo {priceSym}</label>
                          <input type="text" inputMode="numeric" value={grp(item.salePrice)} title={secOf(item.salePrice) || undefined}
                            onChange={(e) => updatePricing(idx, 'salePrice', parseGrp(e.target.value))}
                            className="w-full px-1.5 py-0.5 border border-emerald-300 rounded text-xs text-right font-semibold text-emerald-700" />
                        </div>
                        {/* Botão p/ revelar o último valor registrado (sob demanda) */}
                        <button type="button" onClick={() => toggleHistory(idx)}
                          title={item.hasHistory ? 'Mostrar/ocultar último valor registrado' : 'Sem histórico registrado'}
                          disabled={!item.hasHistory}
                          className={`shrink-0 p-1 rounded transition-colors ${historyOpen.has(idx) ? 'bg-slate-200 text-slate-600' : 'text-slate-400 hover:bg-slate-100'} disabled:opacity-30 disabled:cursor-not-allowed`}>
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Linha de histórico — último valor (atual) registrado, alinhada sob cada campo */}
                      {historyOpen.has(idx) && item.hasHistory && (
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[9px] font-bold leading-none">
                          <div className="w-[5.5rem] text-right text-slate-700" title="Último custo registrado no produto">{item.lastCost ? grp(item.lastCost) : '—'}</div>
                          <div className="w-11 text-right text-amber-600">{item.lastMarginWholesale ? `${item.lastMarginWholesale}%` : '—'}</div>
                          <div className="w-[5.5rem] text-right text-amber-700" title="Último atacado registrado">{item.lastWholesale ? grp(item.lastWholesale) : '—'}</div>
                          <div className="w-11 text-right text-emerald-600">{item.lastMargin ? `${item.lastMargin}%` : '—'}</div>
                          <div className="w-[5.5rem] text-right text-emerald-700" title="Último varejo registrado">{item.lastSale ? grp(item.lastSale) : '—'}</div>
                          <span className="text-[8px] uppercase tracking-wide font-bold text-indigo-500">último</span>
                        </div>
                      )}
                      {item.status !== 'CONFORME' && (
                        <input
                          type="text" value={item.notes} onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                          placeholder={item.status === 'REJEITADO' ? 'Motivo da recusa…' : item.quantityReceived < item.quantityPending ? 'Motivo (chegou menos)…' : 'Motivo da divergência…'}
                          className={`mt-1 w-full px-2 py-1 border rounded text-xs ${!item.notes ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300'}`}
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
          <button ref={confirmRef} onClick={handleConfirm} disabled={saving || isLoading || items.length === 0}
            className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm">
            <PackageCheck className="w-4 h-4" /> {saving ? 'Salvando…' : 'Confirmar recebimento'}
          </button>
        </div>
      </div>
    </div>
  );
}
