import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ScanBarcode, Search, Trash2, Minus, Plus, User, UserSearch, Percent, CreditCard, Banknote, QrCode,
  Landmark, Receipt, FileText, HandCoins, CircleEllipsis, Wallet, X, Check, Printer, Lock, LogOut,
  ArrowDownCircle, ArrowUpCircle, History, Store, Loader2, ShoppingCart, Keyboard, ArrowLeft, Clock, UserPlus, Smartphone,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useNextNfNumber } from '../hooks/useSales';
import { PAYMENT_METHOD_LABELS } from '../lib/payment-methods';
import { resolveCustomerPrice, priceTierLabel } from '@ejr/shared-types';
import { UnknownBarcodeModal } from '../components/pos/UnknownBarcodeModal';
import { StockBadge } from '../components/pos/StockBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export type CartItem = {
  productId: string;
  name: string;
  code?: string;
  barcode?: string;
  unit?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  stock?: number;
  minimumStock?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  priceCurrency?: string;
};
export type PosCustomer = {
  id: string; name: string; allowedPaymentMethods?: string[] | null; creditMaxDays?: number | null; document?: string;
  priceTier?: string; priceAdjustmentPct?: number | null;
};
export type Payment = { method: string; amount: number };
export type Totals = {
  openingAmount: number; salesCount: number; salesTotal: number; discountTotal: number; cancelledCount: number;
  byMethod: { method: string; amount: number; count: number }[];
  supplies: number; withdrawals: number; cashSales: number; expectedCash: number;
  movements: { id: string; type: string; amount: number; reason?: string; userName?: string; createdAt: string }[];
};
export type Session = { id: string; sessionNumber: number; operatorName?: string; openedAt: string; openingAmount: number; totals: Totals };
export type ReceiptData = {
  id: string; saleNumber: string; createdAt: string; sessionNumber?: number; operatorName?: string;
  customerName: string; customerDocument?: string; subtotal: number; discount: number; total: number;
  changeAmount: number; nfNumber?: string; status: string;
  items: { name: string; code?: string; unit?: string; quantity: number; unitPrice: number; discount: number; total: number }[];
  payments: { method: string; amount: number; status: string; dueDate?: string }[];
};

export const POS_PRINT_CSS = `@media print { @page { size: 80mm auto; margin: 3mm; } body * { visibility: hidden; } #pos-print, #pos-print *, #pos-print-close, #pos-print-close * { visibility: visible; } #pos-print, #pos-print-close { position: absolute; left: 0; top: 0; width: 72mm; background: #fff; } body.pos-printing-close #pos-print { display: none !important; } }`;
export const CONSUMER: PosCustomer = { id: 'cust-consumidor-final', name: 'Consumidor Final', allowedPaymentMethods: null };
export const METHOD_ORDER = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'CREDIT', 'PROMISSORY', 'BOLETO', 'OTHER'];
export const METHOD_ICONS: Record<string, any> = {
  CASH: Banknote, PIX: QrCode, DEBIT_CARD: CreditCard, CREDIT_CARD: CreditCard, BANK_TRANSFER: Landmark,
  CHECK: FileText, CREDIT: HandCoins, PROMISSORY: FileText, BOLETO: Receipt, OTHER: CircleEllipsis,
};
export const label = (m: string) => PAYMENT_METHOD_LABELS[m] || m;
export const errMsg = (e: any, fb: string) => e?.response?.data?.error?.message || e?.response?.data?.message || fb;
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ─────────────────────────────────────────────────────────────────────────────
// Campo de dinheiro (PYG inteiro; BRL/USD centavos)
// ─────────────────────────────────────────────────────────────────────────────
export function MoneyField({
  value, onChange, decimals, autoFocus, onEnter, className = '', inputRef,
}: {
  value: number; onChange: (v: number) => void; decimals: number; autoFocus?: boolean;
  onEnter?: () => void; className?: string; inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const text = decimals === 0
    ? (value ? value.toLocaleString('es-PY') : '')
    : (value ? (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
  return (
    <input
      ref={inputRef}
      inputMode="numeric"
      autoFocus={autoFocus}
      value={text}
      placeholder="0"
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(digits ? parseInt(digits.slice(0, 15), 10) : 0);
      }}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
      className={`w-full text-right tabular-nums font-semibold outline-none border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 ${className}`}
    />
  );
}

export function Modal({ title, icon: Icon, onClose, children, wide }: { title: string; icon?: any; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-4" onMouseDown={onClose}>
      <div
        className={`bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'} max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">{Icon && <Icon className="w-5 h-5 text-emerald-600" />}{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" title="Fechar (Esc)"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center justify-center min-w-[1.6rem] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-semibold text-slate-200 border border-slate-600">{children}</kbd>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cupom (impressão térmica 80mm)
// ─────────────────────────────────────────────────────────────────────────────
export function ReceiptPrint({ data, fmt, company }: { data: ReceiptData | null; fmt: (v: number) => string; company: string }) {
  if (!data) return null;
  const d = new Date(data.createdAt);
  return (
    <div id="pos-print" className="hidden print:block text-black" style={{ width: '72mm', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '11px', lineHeight: 1.35 }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>{company}</div>
      <div style={{ textAlign: 'center' }}>CUPOM NÃO FISCAL</div>
      <div style={{ textAlign: 'center' }}>{d.toLocaleDateString('pt-BR')} {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div>Venda: <b>{data.saleNumber}</b>{data.sessionNumber ? ` · Caixa ${data.sessionNumber}` : ''}</div>
      <div>Cliente: {data.customerName}{data.customerDocument ? ` (${data.customerDocument})` : ''}</div>
      {data.operatorName && <div>Operador: {data.operatorName}</div>}
      {data.nfNumber && <div>NF: {data.nfNumber}</div>}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      {data.items.map((it, i) => (
        <div key={i} style={{ marginBottom: '3px' }}>
          <div>{String(i + 1).padStart(2, '0')} {it.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>&nbsp;&nbsp;{it.quantity} {!it.unit || it.unit === 'UNIT' ? 'un' : it.unit.toLowerCase()} x {fmt(it.unitPrice)}{it.discount ? ` -${fmt(it.discount)}` : ''}</span>
            <span>{fmt(it.total)}</span>
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{fmt(data.subtotal)}</span></div>
      {data.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Desconto</span><span>-{fmt(data.discount)}</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px' }}><span>TOTAL</span><span>{fmt(data.total)}</span></div>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{label(p.method)}{p.status === 'PENDING' && p.dueDate ? ` (venc. ${new Date(p.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})` : ''}</span>
          <span>{fmt(p.amount + (p.method === 'CASH' ? data.changeAmount : 0))}</span>
        </div>
      ))}
      {data.changeAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>TROCO</span><span>{fmt(data.changeAmount)}</span></div>}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ textAlign: 'center' }}>Obrigado pela preferência!</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────
export function PosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const { formatPrice: fmt, defaultCurrency } = useFormatPrice();
  const decimals = defaultCurrency === 'PYG' ? 0 : 2;
  const isCashier = user?.role === 'CASHIER';
  const storageKey = `pos-cart-v1:${user?.id || 'anon'}`;

  // Sessão (turno) do caixa
  const sessionQ = useQuery({
    queryKey: ['pos-session'],
    queryFn: async () => (await api.get('/pos/session/current')).data.data as Session | null,
    staleTime: 0,
  });
  const session = sessionQ.data || null;

  // Carrinho persistido (caixa "sempre aberto": sobrevive a F5/queda)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').cart || []; } catch { return []; }
  });
  const [customer, setCustomer] = useState<PosCustomer>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').customer || CONSUMER; } catch { return CONSUMER; }
  });
  const [globalDiscount, setGlobalDiscount] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').discount || 0; } catch { return 0; }
  });
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ cart, customer, discount: globalDiscount }));
  }, [cart, customer, globalDiscount, storageKey]);

  // Trocou o cliente → recalcula os preços pela tabela dele (Varejo/Atacado/Especial)
  const customerRef = useRef(customer);
  customerRef.current = customer;
  const tierKey = `${customer.id}|${customer.priceTier || 'RETAIL'}|${customer.priceAdjustmentPct ?? ''}`;
  const prevTierKey = useRef(tierKey);
  useEffect(() => {
    if (prevTierKey.current === tierKey) return;
    prevTierKey.current = tierKey;
    setCart((prev) => prev.map((i) => (i.retailPrice == null ? i : {
      ...i,
      unitPrice: resolveCustomerPrice({ salePrice: i.retailPrice, wholesalePrice: i.wholesalePrice, salePriceCurrency: i.priceCurrency }, customer).price,
    })));
    if (cart.length) toast.success(`Preços pela tabela ${priceTierLabel(customer)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierKey]);

  const [selected, setSelected] = useState<number>(-1);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sugIndex, setSugIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [modal, setModal] = useState<null | 'pay' | 'customer' | 'discount' | 'qty' | 'supply' | 'withdraw' | 'close' | 'sales' | 'help'>(null);
  const [lastSale, setLastSale] = useState<ReceiptData | null>(null);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [printData, setPrintData] = useState<ReceiptData | null>(null);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('pos-auto-print') === '1');
  const [now, setNow] = useState(new Date());
  const scanRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  // Celular/tablet em pé → PDV móvel (câmera). "Versão computador" grava a preferência.
  useEffect(() => {
    if (window.innerWidth < 768 && localStorage.getItem('pos-prefer-desktop') !== '1') navigate('/pdv/movel', { replace: true });
  }, [navigate]);
  useEffect(() => { localStorage.setItem('pos-auto-print', autoPrint ? '1' : '0'); }, [autoPrint]);

  const focusScan = useCallback(() => setTimeout(() => scanRef.current?.focus(), 30), []);
  useEffect(() => { if (!modal && !lastSale && !unknownCode) focusScan(); }, [modal, lastSale, unknownCode, focusScan]);

  // Totais do carrinho
  const subtotal = cart.reduce((a, i) => a + Math.max(0, i.unitPrice * i.quantity - i.discount), 0);
  const discount = Math.min(globalDiscount, subtotal);
  const total = subtotal - discount;
  const itemsQty = cart.reduce((a, i) => a + i.quantity, 0);
  const lastItem = selected >= 0 ? cart[selected] : cart[cart.length - 1];

  // ── Produtos ──────────────────────────────────────────────────────────────
  const addProduct = useCallback((p: any, qty = 1) => {
    if (!p) return;
    // Preço pela tabela do cliente (o servidor recalcula igual ao finalizar)
    const price = resolveCustomerPrice(p, customerRef.current).price;
    if (!Number(p.salePrice || 0)) toast.warning(`${p.name} está sem preço de venda cadastrado`);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === p.id);
      let next: CartItem[];
      if (idx >= 0) {
        next = prev.map((i, k) => (k === idx ? { ...i, quantity: i.quantity + qty } : i));
        setSelected(idx);
      } else {
        next = [...prev, {
          productId: p.id, name: p.name, code: p.code, barcode: p.barcode, unit: p.unit,
          unitPrice: price, quantity: qty, discount: 0, stock: p.currentStock, minimumStock: p.minimumStock,
          retailPrice: Number(p.salePrice || 0), wholesalePrice: Number(p.wholesalePrice || 0), priceCurrency: p.salePriceCurrency,
        }];
        setSelected(next.length - 1);
      }
      const it = next.find((i) => i.productId === p.id)!;
      if (it.stock != null && it.quantity > it.stock) toast.warning(`Estoque de ${p.name}: ${it.stock} — a venda será recusada se faltar`);
      return next;
    });
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, []);

  const searchProducts = useCallback(async (term: string) => {
    const { data } = await api.get('/products', { params: { search: term, limit: 8, status: 'ACTIVE' } });
    return (data?.data || []) as any[];
  }, []);

  // Sugestões enquanto digita (nome/código)
  useEffect(() => {
    const raw = query.trim();
    const term = raw.includes('*') ? raw.split('*').slice(1).join('*').trim() : raw;
    if (term.length < 2 || /^\d{8,}$/.test(term)) { setSuggestions([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const r = await searchProducts(term);
        if (alive) { setSuggestions(r); setSugIndex(0); }
      } finally { if (alive) setSearching(false); }
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [query, searchProducts]);

  const submitScan = async () => {
    const raw = query.trim();
    if (!raw) { if (cart.length) setModal('pay'); return; }
    let qty = 1;
    let term = raw;
    const m = raw.match(/^(\d+)\s*\*\s*(.+)$/);
    if (m) { qty = Math.max(1, parseInt(m[1], 10)); term = m[2].trim(); }

    // Sugestão destacada (setas) tem prioridade
    if (suggestions.length && sugIndex >= 0 && suggestions[sugIndex] && !/^\d{8,}$/.test(term)) {
      const exact = suggestions.find((p) => [p.barcode, p.code].some((c: any) => c && String(c).toLowerCase() === term.toLowerCase()));
      addProduct(exact || suggestions[sugIndex], qty);
      setQuery(''); setSuggestions([]);
      return;
    }
    try {
      setSearching(true);
      const r = await searchProducts(term);
      const exact = r.find((p) => [p.barcode, p.code].some((c: any) => c && String(c).toLowerCase() === term.toLowerCase()));
      if (exact || r.length === 1) { addProduct(exact || r[0], qty); setQuery(''); setSuggestions([]); }
      else if (r.length === 0) {
        // Código de barras desconhecido → oferece vincular / cadastrar
        if (/^[0-9A-Za-z\-.]{6,}$/.test(term) && /\d{6,}/.test(term)) { setUnknownCode(term); setQuery(''); }
        else { toast.error(`Produto não encontrado: ${term}`); scanRef.current?.select(); }
      }
      else { setSuggestions(r); setSugIndex(0); }
    } catch (e: any) {
      toast.error(errMsg(e, 'Erro ao buscar produto'));
    } finally { setSearching(false); }
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) { removeItem(idx); return; }
    setCart((prev) => prev.map((i, k) => (k === idx ? { ...i, quantity: qty } : i)));
  };
  const removeItem = (idx: number) => {
    setCart((prev) => prev.filter((_, k) => k !== idx));
    setSelected(-1);
  };
  const clearSale = () => { setCart([]); setGlobalDiscount(0); setCustomer(CONSUMER); setSelected(-1); setQuery(''); };

  // ── Atalhos globais ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!session) return;
      if (lastSale) {
        if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setLastSale(null); }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); doPrint(lastSale); }
        return;
      }
      if (modal || unknownCode) return;
      const map: Record<string, () => void> = {
        F1: () => setModal('help'),
        F2: () => { scanRef.current?.focus(); scanRef.current?.select(); },
        F4: () => cart.length && setModal('qty'),
        F6: () => cart.length && setModal('discount'),
        F7: () => setModal('sales'),
        F8: () => { if (cart.length) removeItem(selected >= 0 ? selected : cart.length - 1); },
        F9: () => setModal('customer'),
        F10: () => cart.length && setModal('pay'),
        F12: () => cart.length && setModal('pay'),
      };
      if (map[e.key]) { e.preventDefault(); map[e.key](); return; }
      if (e.key === 'Delete' && e.ctrlKey && cart.length) {
        e.preventDefault();
        if (window.confirm('Cancelar a venda atual?')) clearSale();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // ── Impressão ────────────────────────────────────────────────────────────
  const doPrint = (data: ReceiptData) => {
    setPrintData(data);
    setTimeout(() => window.print(), 80);
  };

  const companyName = 'Prisma';

  // ── Telas ────────────────────────────────────────────────────────────────
  if (sessionQ.isLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-emerald-400" /></div>;
  }

  if (!session) {
    return <OpenSessionScreen fmt={fmt} decimals={decimals} userName={user?.name} isCashier={isCashier}
      onBack={() => navigate('/dashboard')} onLogout={async () => { await logout(); navigate('/login'); }}
      onOpened={() => qc.invalidateQueries({ queryKey: ['pos-session'] })} />;
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-slate-100 text-slate-900 lg:overflow-hidden print:h-auto print:bg-white">
      <style>{POS_PRINT_CSS}</style>
      <ReceiptPrint data={printData} fmt={fmt} company={companyName} />

      {/* Barra superior */}
      <header className="print:hidden shrink-0 sticky top-0 z-40 bg-slate-950 text-white px-3 sm:px-5 py-2.5 flex items-center gap-3">
        {!isCashier && (
          <button onClick={() => navigate('/sales')} className="p-2 rounded-lg hover:bg-white/10" title="Voltar ao sistema"><ArrowLeft className="w-5 h-5" /></button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0"><Store className="w-5 h-5" /></div>
          <div className="min-w-0 leading-tight">
            <div className="font-bold tracking-tight">PDV · Caixa {session.sessionNumber}</div>
            <div className="text-[11px] text-slate-400 truncate">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Aberto</span>
              {' · '}{session.operatorName || user?.name}
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 ml-4 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5" />{now.toLocaleDateString('pt-BR')} {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <HeaderBtn icon={History} label="Vendas" kbd="F7" onClick={() => setModal('sales')} />
          <HeaderBtn icon={ArrowUpCircle} label="Suprimento" onClick={() => setModal('supply')} />
          <HeaderBtn icon={ArrowDownCircle} label="Sangria" onClick={() => setModal('withdraw')} />
          <HeaderBtn icon={Lock} label="Fechar caixa" onClick={() => setModal('close')} accent />
          <HeaderBtn icon={Smartphone} label="Versão celular" onClick={() => { localStorage.removeItem('pos-prefer-desktop'); navigate('/pdv/movel'); }} />
          <HeaderBtn icon={Keyboard} label="Atalhos" kbd="F1" onClick={() => setModal('help')} />
          {isCashier && <HeaderBtn icon={LogOut} label="Sair" onClick={async () => { await logout(); navigate('/login'); }} />}
        </div>
      </header>

      <div className="print:hidden flex-1 lg:min-h-0 flex flex-col lg:flex-row gap-3 p-3">
        {/* Coluna esquerda: leitura + itens */}
        <section className="flex-1 min-h-[55vh] lg:min-h-0 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 relative">
            <div className="relative">
              <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />
              <input
                ref={scanRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); submitScan(); }
                  else if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setSugIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
                  else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setSugIndex((i) => Math.max(i - 1, 0)); }
                  else if (e.key === 'Escape') { setQuery(''); setSuggestions([]); }
                }}
                placeholder="Leia o código de barras ou digite código / nome  ·  3*código = quantidade"
                className="w-full pl-14 pr-12 py-4 text-lg rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none placeholder:text-slate-400"
                autoComplete="off"
              />
              {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-slate-400" />}
            </div>
            {suggestions.length > 0 && query.trim() && (
              <div className="absolute left-3 right-3 top-full mt-1 z-30 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                {suggestions.map((p, i) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); const m = query.match(/^(\d+)\s*\*/); addProduct(p, m ? parseInt(m[1], 10) : 1); setQuery(''); setSuggestions([]); focusScan(); }}
                    onMouseEnter={() => setSugIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === sugIndex ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                        <StockBadge stock={p.currentStock} minimum={p.minimumStock} size="xs" />
                        <span className="truncate">{p.code}{p.barcode ? ` · ${p.barcode}` : ''}</span>
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums text-slate-800 whitespace-nowrap">{fmt(p.salePrice || 0)}</div>
                  </button>
                ))}
                <div className="px-4 py-1.5 text-[11px] text-slate-400 bg-slate-50 border-t">↑ ↓ para escolher · Enter para adicionar · Esc para limpar</div>
              </div>
            )}
          </div>

          {/* Itens */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none">
                <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-4"><ShoppingCart className="w-11 h-11 text-emerald-500" /></div>
                <div className="text-2xl font-bold text-slate-700">Caixa livre</div>
                <div className="mt-1 text-sm">Passe o produto no leitor ou digite o código para começar.</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-400 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">#</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-center w-36">Qtd</th>
                    <th className="px-3 py-2 text-right w-28 hidden sm:table-cell">Unitário</th>
                    <th className="px-3 py-2 text-right w-32">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((it, idx) => {
                    const active = idx === (selected >= 0 ? selected : cart.length - 1);
                                    return (
                      <tr key={it.productId} onClick={() => setSelected(idx)} className={`cursor-pointer transition-colors ${active ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2.5 text-slate-400 tabular-nums">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="px-3 py-2.5 min-w-0">
                          <div className="font-medium text-slate-800 truncate max-w-[40vw] lg:max-w-[34vw]">{it.name}</div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            <StockBadge stock={it.stock} minimum={it.minimumStock} inCart={it.quantity} size="xs" />
                            <span className="truncate">{it.code}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); updateQty(idx, it.quantity - 1); }} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                            <input
                              value={it.quantity}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateQty(idx, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
                              onKeyDown={(e) => { if (e.key === 'Enter') focusScan(); }}
                              className="w-12 text-center tabular-nums font-semibold border border-slate-200 rounded-lg py-1"
                            />
                            <button onClick={(e) => { e.stopPropagation(); updateQty(idx, it.quantity + 1); }} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 hidden sm:table-cell whitespace-nowrap">{fmt(it.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap">{fmt(it.unitPrice * it.quantity - it.discount)}</td>
                        <td className="px-2">
                          <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }} className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50" title="Remover (F8)"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div ref={listEndRef} />
          </div>

          {/* Atalhos (rodapé) */}
          <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-slate-900 text-slate-300 text-[11px]">
            {[['F2', 'Buscar'], ['F4', 'Quantidade'], ['F6', 'Desconto'], ['F8', 'Remover item'], ['F9', 'Cliente'], ['F10', 'Pagamento'], ['Ctrl+Del', 'Cancelar venda']].map(([k, t]) => (
              <span key={k} className="inline-flex items-center gap-1.5"><Kbd>{k}</Kbd>{t}</span>
            ))}
          </div>
        </section>

        {/* Coluna direita: cliente + totais */}
        <aside className="lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-3">
          <button onClick={() => setModal('customer')} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 text-left hover:border-emerald-300 transition-colors">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${customer.id === CONSUMER.id ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}><User className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Cliente</div>
              <div className="font-semibold text-slate-800 truncate">{customer.name}</div>
              {customer.priceTier && customer.priceTier !== 'RETAIL' && (
                <div className="text-[11px] font-semibold text-violet-600">Tabela {priceTierLabel(customer)}</div>
              )}
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Kbd>F9</Kbd></span>
          </button>

          {lastItem && (
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Item atual</div>
              <div className="font-semibold text-slate-800 text-lg leading-snug line-clamp-2">{lastItem.name}</div>
              <div className="mt-1"><StockBadge stock={lastItem.stock} minimum={lastItem.minimumStock} inCart={lastItem.quantity} /></div>
              <div className="mt-1 flex items-baseline justify-between text-slate-500 tabular-nums">
                <span>{lastItem.quantity} × {fmt(lastItem.unitPrice)}</span>
                <span className="text-xl font-bold text-slate-900">{fmt(lastItem.unitPrice * lastItem.quantity - lastItem.discount)}</span>
              </div>
            </div>
          )}

          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Itens</span><span className="tabular-nums">{cart.length} · {itemsQty} un</span></div>
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
              <button onClick={() => cart.length && setModal('discount')} className="w-full flex justify-between text-slate-500 hover:text-emerald-700">
                <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" />Desconto <Kbd>F6</Kbd></span>
                <span className="tabular-nums">{discount ? `- ${fmt(discount)}` : '—'}</span>
              </button>
            </div>
            <div className="mt-auto pt-4">
              <div className="rounded-2xl bg-slate-950 text-white p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Total</div>
                <div className="text-4xl xl:text-5xl font-extrabold tabular-nums tracking-tight break-all">{fmt(total)}</div>
              </div>
              <button
                onClick={() => cart.length && setModal('pay')}
                disabled={!cart.length}
                className="mt-3 w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-colors"
              >
                <Wallet className="w-5 h-5" /> Finalizar venda <span className="ml-1 text-emerald-100 text-sm font-semibold">F10</span>
              </button>
              {cart.length > 0 && (
                <button onClick={() => window.confirm('Cancelar a venda atual?') && clearSale()} className="mt-2 w-full py-2 text-sm text-slate-500 hover:text-red-600">
                  Cancelar venda (Ctrl+Del)
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modais */}
      {modal === 'pay' && (
        <PaymentModal
          total={total} customer={customer} fmt={fmt} decimals={decimals}
          onClose={() => setModal(null)}
          onConfirm={async ({ payments, withNf, nfNumber, creditDueDate }) => {
            const { data } = await api.post('/pos/sales', {
              sessionId: session.id,
              customerId: customer.id,
              items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, discount: i.discount })),
              discount,
              payments,
              withNf,
              nfNumber,
              creditDueDate,
            });
            const receipt = data.data as ReceiptData;
            clearSale();
            setModal(null);
            setLastSale(receipt);
            qc.invalidateQueries({ queryKey: ['pos-session'] });
            qc.invalidateQueries({ queryKey: ['next-nf-number'] });
            if (autoPrint) doPrint(receipt);
          }}
        />
      )}
      {modal === 'customer' && (
        <CustomerModal onClose={() => setModal(null)} onPick={(c) => { setCustomer(c); setModal(null); }} current={customer} />
      )}
      {modal === 'discount' && (
        <DiscountModal subtotal={subtotal} value={discount} fmt={fmt} decimals={decimals} onClose={() => setModal(null)} onApply={(v) => { setGlobalDiscount(v); setModal(null); }} />
      )}
      {modal === 'qty' && lastItem && (
        <QtyModal item={lastItem} onClose={() => setModal(null)} onApply={(q) => { updateQty(cart.indexOf(lastItem), q); setModal(null); }} />
      )}
      {(modal === 'supply' || modal === 'withdraw') && (
        <MovementModal type={modal === 'supply' ? 'SUPPLY' : 'WITHDRAWAL'} sessionId={session.id} fmt={fmt} decimals={decimals}
          available={session.totals.expectedCash}
          onClose={() => setModal(null)} onDone={() => { setModal(null); qc.invalidateQueries({ queryKey: ['pos-session'] }); }} />
      )}
      {modal === 'close' && (
        <CloseModal session={session} fmt={fmt} decimals={decimals} pendingCart={cart.length > 0}
          onClose={() => setModal(null)}
          onClosed={() => { setModal(null); clearSale(); qc.invalidateQueries({ queryKey: ['pos-session'] }); }} />
      )}
      {modal === 'sales' && (
        <SessionSalesModal sessionId={session.id} fmt={fmt} onClose={() => setModal(null)}
          onReprint={async (id) => { const { data } = await api.get(`/pos/sales/${id}/receipt`); doPrint(data.data); }} />
      )}
      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
      {unknownCode && (
        <UnknownBarcodeModal
          code={unknownCode}
          isManager={['OWNER', 'DIRECTOR', 'MANAGER'].includes(user?.role || '')}
          fmt={fmt}
          decimals={decimals}
          onClose={() => { setUnknownCode(null); focusScan(); }}
          onAdded={(p) => { addProduct(p, 1); setUnknownCode(null); focusScan(); }}
        />
      )}

      {/* Venda concluída */}
      {lastSale && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-9 h-9 text-emerald-600" /></div>
            <div className="mt-3 text-xl font-bold text-slate-800">Venda concluída</div>
            <div className="text-sm text-slate-500">{lastSale.saleNumber} · {fmt(lastSale.total)}{lastSale.nfNumber ? ` · NF ${lastSale.nfNumber}` : ' · sem NF'}</div>
            {lastSale.changeAmount > 0 && (
              <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-700">Troco</div>
                <div className="text-4xl font-extrabold tabular-nums text-amber-700">{fmt(lastSale.changeAmount)}</div>
              </div>
            )}
            <label className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 select-none">
              <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} /> Imprimir cupom automaticamente
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => doPrint(lastSale)} className="py-3 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Cupom (P)</button>
              <button autoFocus onClick={() => setLastSale(null)} className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Nova venda (Enter)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderBtn({ icon: Icon, label, kbd, onClick, accent }: { icon: any; label: string; kbd?: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} title={kbd ? `${label} (${kbd})` : label}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${accent ? 'text-amber-300 hover:bg-amber-400/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
      <Icon className="w-4 h-4" /><span className="hidden xl:inline">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Abertura de caixa
// ─────────────────────────────────────────────────────────────────────────────
export function OpenSessionScreen({ fmt, decimals, userName, isCashier, onBack, onLogout, onOpened }: {
  fmt: (v: number) => string; decimals: number; userName?: string; isCashier: boolean;
  onBack: () => void; onLogout: () => void; onOpened: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const open = async () => {
    setSaving(true);
    try { await api.post('/pos/session/open', { openingAmount: amount }); toast.success('Caixa aberto!'); onOpened(); }
    catch (e: any) { toast.error(errMsg(e, 'Erro ao abrir o caixa')); setSaving(false); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6 text-white">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center"><Store className="w-6 h-6" /></div>
          <div><div className="text-2xl font-bold">PDV · Caixa</div><div className="text-sm text-slate-400">Olá, {userName}</div></div>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="font-semibold text-slate-800 text-lg">Abrir caixa</div>
          <p className="text-sm text-slate-500 mb-4">Informe o fundo de troco que está na gaveta.</p>
          <label className="text-xs font-medium text-slate-500">Fundo de troco</label>
          <MoneyField value={amount} onChange={setAmount} decimals={decimals} autoFocus onEnter={open} className="text-3xl mt-1" />
          <p className="mt-1 text-right text-xs text-slate-400">{fmt(amount)}</p>
          <button onClick={open} disabled={saving} className="mt-4 w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-lg">
            {saving ? 'Abrindo…' : 'Abrir caixa (Enter)'}
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-4 text-sm text-slate-400">
          {!isCashier && <button onClick={onBack} className="hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Voltar ao sistema</button>}
          <button onClick={onLogout} className="hover:text-white flex items-center gap-1"><LogOut className="w-4 h-4" />Sair</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagamento
// ─────────────────────────────────────────────────────────────────────────────
export function PaymentModal({ total, customer, fmt, decimals, onClose, onConfirm }: {
  total: number; customer: PosCustomer; fmt: (v: number) => string; decimals: number; onClose: () => void;
  onConfirm: (d: { payments: Payment[]; withNf: boolean; nfNumber?: string; creditDueDate?: string }) => Promise<void>;
}) {
  const isConsumer = customer.id === CONSUMER.id;
  const allowed = (customer.allowedPaymentMethods || []).length > 0 && !isConsumer ? customer.allowedPaymentMethods! : METHOD_ORDER;
  const methods = METHOD_ORDER.filter((m) => allowed.includes(m) && !(isConsumer && m === 'CREDIT'));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState(methods[0] || 'CASH');
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const remaining = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  const [amount, setAmount] = useState(total);
  const [withNf, setWithNf] = useState(false);
  const { data: suggestedNf } = useNextNfNumber();
  const [nfNumber, setNfNumber] = useState('');
  useEffect(() => { if (suggestedNf) setNfNumber((p) => p || suggestedNf); }, [suggestedNf]);
  const hasCredit = payments.some((p) => p.method === 'CREDIT') || method === 'CREDIT';
  const [dueDate, setDueDate] = useState(() => localDate(new Date(Date.now() + (customer.creditMaxDays || 30) * 86400000)));
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setAmount(remaining); }, [remaining]);

  const addPayment = (m = method, value = amount) => {
    if (value <= 0) return;
    if (m !== 'CASH' && value > remaining) { toast.error('Só dinheiro pode passar do total (troco)'); return; }
    setPayments((prev) => {
      const i = prev.findIndex((p) => p.method === m);
      return i >= 0 ? prev.map((p, k) => (k === i ? { ...p, amount: p.amount + value } : p)) : [...prev, { method: m, amount: value }];
    });
  };

  const finish = async (list = payments) => {
    const sum = list.reduce((a, p) => a + p.amount, 0);
    if (sum < total) { toast.error('Falta pagamento'); return; }
    if (withNf && !nfNumber.trim()) { toast.error('Informe o número da NF'); return; }
    setSaving(true);
    try {
      await onConfirm({ payments: list, withNf, nfNumber: withNf ? nfNumber.trim() : undefined, creditDueDate: list.some((p) => p.method === 'CREDIT') ? dueDate : undefined });
    } catch (e: any) {
      toast.error(errMsg(e, 'Erro ao finalizar a venda'));
      setSaving(false);
    }
  };

  // Enter: adiciona o valor digitado; se já cobre o total, finaliza.
  const onEnter = () => {
    if (saving) return;
    if (remaining === 0) { finish(); return; }
    if (amount <= 0) return;
    const next = (() => {
      const i = payments.findIndex((p) => p.method === method);
      if (method !== 'CASH' && amount > remaining) return null;
      return i >= 0 ? payments.map((p, k) => (k === i ? { ...p, amount: p.amount + amount } : p)) : [...payments, { method, amount }];
    })();
    if (!next) { toast.error('Só dinheiro pode passar do total (troco)'); return; }
    setPayments(next);
    if (next.reduce((a, p) => a + p.amount, 0) >= total) finish(next);
  };

  // Teclas 1..9 escolhem a forma (quando o foco não está num campo de texto livre)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.dataset?.free === '1') return;
      const n = parseInt(e.key, 10);
      if (e.altKey && n >= 1 && n <= methods.length) { e.preventDefault(); setMethod(methods[n - 1]); amountRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [methods]);

  const quickCash = useMemo(() => {
    if (method !== 'CASH' || remaining <= 0) return [];
    const notes = decimals === 0 ? [5000, 10000, 20000, 50000, 100000] : [1000, 2000, 5000, 10000, 20000];
    const set = new Set<number>([remaining]);
    for (const n of notes) { const v = Math.ceil(remaining / n) * n; if (v > remaining) set.add(v); }
    return Array.from(set).sort((a, b) => a - b).slice(0, 5);
  }, [method, remaining, decimals]);

  return (
    <Modal title="Pagamento" icon={Wallet} onClose={() => !saving && onClose()} wide>
      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">Forma de pagamento <span className="hidden md:inline text-slate-400">(Alt+1…{methods.length})</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {methods.map((m, i) => {
              const Icon = METHOD_ICONS[m] || Wallet;
              const active = method === m;
              return (
                <button key={m} onClick={() => { setMethod(m); amountRef.current?.focus(); }}
                  className={`relative flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{label(m)}</span>
                  <span className="absolute top-1 right-1.5 text-[10px] text-slate-400">{i + 1}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-medium text-slate-500">Valor em {label(method)}</label>
              <span className="hidden md:inline text-[11px] text-slate-400">Enter adiciona · com o total coberto, Enter conclui</span>
            </div>
            <MoneyField inputRef={amountRef} value={amount} onChange={setAmount} decimals={decimals} autoFocus onEnter={onEnter} className="text-3xl mt-1" />
            {quickCash.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickCash.map((v) => (
                  <button key={v} onClick={() => { setAmount(v); amountRef.current?.focus(); }} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-sm font-semibold tabular-nums">{fmt(v)}</button>
                ))}
              </div>
            )}
            <button onClick={() => addPayment()} disabled={amount <= 0 || remaining === 0} className="mt-2 w-full py-2.5 rounded-xl border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-50 disabled:opacity-40">
              + Adicionar {label(method)}
            </button>
          </div>

          {hasCredit && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <label className="text-xs font-medium text-amber-800">Vencimento do crédito {customer.creditMaxDays ? `(máx. ${customer.creditMaxDays} dias)` : ''}</label>
              <input type="date" data-free="1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-amber-300 bg-white" />
            </div>
          )}

          <div className="mt-4">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              {[{ k: false, t: 'Sem Nota Fiscal' }, { k: true, t: 'Com Nota Fiscal' }].map((o) => (
                <button key={o.t} onClick={() => setWithNf(o.k)} className={`py-2 rounded-lg text-sm font-semibold transition-all ${withNf === o.k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{o.t}</button>
              ))}
            </div>
            {withNf && (
              <input data-free="1" value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} placeholder="Número da NF"
                className="mt-2 w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-4 focus:ring-emerald-100" />
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="flex flex-col">
          <div className="rounded-2xl bg-slate-950 text-white p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Total</div>
            <div className="text-3xl font-extrabold tabular-nums break-all">{fmt(total)}</div>
          </div>
          <div className="mt-3 space-y-1.5 min-h-[60px]">
            {payments.length === 0 && <div className="text-sm text-slate-400 text-center py-3">Nenhum pagamento lançado</div>}
            {payments.map((p, i) => (
              <div key={p.method} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 text-sm">
                <span className="font-medium text-slate-700">{label(p.method)}</span>
                <span className="flex items-center gap-2 tabular-nums font-semibold">{fmt(p.amount)}
                  <button onClick={() => setPayments((prev) => prev.filter((_, k) => k !== i))} className="text-slate-300 hover:text-red-600"><X className="w-4 h-4" /></button>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Pago</span><span className="tabular-nums">{fmt(paid)}</span></div>
            <div className={`flex justify-between font-semibold ${remaining ? 'text-red-600' : 'text-slate-400'}`}><span>Falta</span><span className="tabular-nums">{fmt(remaining)}</span></div>
          </div>
          {change > 0 && (
            <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-700">Troco</div>
              <div className="text-3xl font-extrabold tabular-nums text-amber-700 break-all">{fmt(change)}</div>
            </div>
          )}
          <button onClick={() => finish()} disabled={saving || remaining > 0}
            className="hidden md:flex mt-auto pt-0 w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-lg items-center justify-center gap-2 mt-4">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Concluir venda
          </button>
        </div>
      </div>
      {/* Celular/tablet: barra fixa com o que falta/troco + concluir */}
      <div className="md:hidden sticky bottom-0 -mx-5 -mb-5 mt-4 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-white/95 backdrop-blur border-t border-slate-200 flex items-center gap-3">
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`text-[11px] uppercase tracking-wider ${change > 0 ? 'text-amber-700' : remaining ? 'text-red-600' : 'text-emerald-700'}`}>
            {change > 0 ? 'Troco' : remaining ? 'Falta' : 'Pago'}
          </div>
          <div className="text-xl font-extrabold tabular-nums truncate">{fmt(change > 0 ? change : remaining || paid)}</div>
        </div>
        {remaining > 0 ? (
          <button onClick={() => onEnter()} disabled={saving || amount <= 0}
            className="px-5 py-3.5 rounded-2xl bg-emerald-500 active:bg-emerald-600 disabled:opacity-40 text-white font-bold">
            {amount >= remaining ? 'Concluir' : `+ ${label(method)}`}
          </button>
        ) : (
          <button onClick={() => finish()} disabled={saving}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 active:bg-emerald-600 disabled:opacity-40 text-white font-bold flex items-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Concluir
          </button>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente (F9): buscar ou cadastrar na hora
// ─────────────────────────────────────────────────────────────────────────────
const toPosCustomer = (c: any): PosCustomer => ({
  id: c.id, name: c.name, allowedPaymentMethods: c.allowedPaymentMethods, creditMaxDays: c.creditMaxDays,
  document: c.ruc || c.ci || c.document, priceTier: c.priceTier, priceAdjustmentPct: c.priceAdjustmentPct,
});

export function CustomerModal({ onClose, onPick, current }: { onClose: () => void; onPick: (c: PosCustomer) => void; current: PosCustomer }) {
  const [mode, setMode] = useState<'search' | 'new'>('search');
  const [q, setQ] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'search' || q.trim().length < 2) { setList([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/customers', { params: { search: q.trim(), limit: 10, approvalStatus: 'APPROVED' } });
        if (alive) { setList(data?.data || []); setIdx(0); }
      } finally { if (alive) setLoading(false); }
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [q, mode]);

  // Alt+N abre o cadastro rápido
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); setMode('new'); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (mode === 'new') {
    return <QuickCustomerForm initial={q.trim()} onCancel={() => setMode('search')} onCreated={(c) => onPick(c)} onClose={onClose} onUseExisting={(c) => onPick(c)} />;
  }

  return (
    <Modal title="Identificar cliente" icon={UserSearch} onClose={onClose}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, list.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter') {
                if (list[idx]) onPick(toPosCustomer(list[idx]));
                else if (q.trim().length >= 2 && !loading) setMode('new');
              }
            }}
            placeholder="Nome, RUC, CI ou telefone" className="w-full pl-9 pr-9 py-3 rounded-xl border border-slate-300 outline-none focus:ring-4 focus:ring-emerald-100" />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <button onClick={() => setMode('new')} title="Cadastrar novo cliente (Alt+N)"
          className="shrink-0 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Novo</span>
        </button>
      </div>
      <div className="mt-3 space-y-1 max-h-[45vh] overflow-y-auto">
        {list.map((c, i) => (
          <button key={c.id} onClick={() => onPick(toPosCustomer(c))} onMouseEnter={() => setIdx(i)}
            className={`w-full text-left px-3 py-2.5 rounded-xl ${i === idx ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
            <div className="font-medium text-slate-800">{c.name}</div>
            <div className="text-xs text-slate-400">{[c.ruc && `RUC ${c.ruc}`, c.ci && `CI ${c.ci}`, c.document, c.phone].filter(Boolean).join(' · ') || '—'}
              {(c.allowedPaymentMethods || []).length > 0 && ` · ${(c.allowedPaymentMethods as string[]).map(label).join(', ')}`}</div>
          </button>
        ))}
        {q.trim().length >= 2 && !loading && list.length === 0 && (
          <button onClick={() => setMode('new')} className="w-full py-4 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" /> Cadastrar “{q.trim()}” (Enter)
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400"><Kbd>Alt+N</Kbd> novo cliente</span>
        {current.id !== CONSUMER.id && (
          <button onClick={() => onPick(CONSUMER)} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Voltar para Consumidor Final</button>
        )}
      </div>
    </Modal>
  );
}

/**
 * Cadastro rápido no balcão: só o essencial (tipo, nome, RUC/CI, telefone,
 * e-mail opcional). Pré-preenche com o que foi digitado na busca: número vira
 * documento, texto vira nome. Antes de criar, procura o documento para não
 * duplicar. Formas de pagamento: todas menos Crédito (a prazo exige liberação
 * no cadastro completo).
 */
function QuickCustomerForm({ initial, onCancel, onCreated, onClose, onUseExisting }: {
  initial: string; onCancel: () => void; onCreated: (c: PosCustomer) => void; onClose: () => void; onUseExisting: (c: PosCustomer) => void;
}) {
  const looksLikeDoc = /^[\d.\-\s]{5,}$/.test(initial);
  const [type, setType] = useState<'INDIVIDUAL' | 'BUSINESS'>(looksLikeDoc && initial.includes('-') ? 'BUSINESS' : 'INDIVIDUAL');
  const [name, setName] = useState(looksLikeDoc ? '' : initial);
  const [doc, setDoc] = useState(looksLikeDoc ? initial.replace(/\s/g, '') : '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState<any>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  useEffect(() => { (looksLikeDoc ? nameRef : name ? docRef : nameRef).current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const docLabel = type === 'BUSINESS' ? 'RUC' : 'CI';

  // Aviso de duplicado enquanto digita o documento
  useEffect(() => {
    const d = doc.trim();
    if (d.length < 4) { setDup(null); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/customers', { params: { search: d, limit: 5 } });
        const norm = (v: any) => String(v || '').replace(/\D/g, '');
        const hit = (data?.data || []).find((c: any) => [c.ruc, c.ci, c.document].some((v) => v && norm(v) === norm(d)));
        if (alive) setDup(hit || null);
      } catch { /* ignore */ }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [doc]);

  const save = async () => {
    if (name.trim().length < 2) { toast.error('Informe o nome do cliente'); nameRef.current?.focus(); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error('E-mail inválido'); return; }
    if (dup) { toast.error(`Já existe um cliente com este ${docLabel}: ${dup.name}`); return; }
    setSaving(true);
    try {
      const body: any = {
        type,
        name: name.trim(),
        phone: phone.trim() || undefined,
        whatsapp: phone.trim() || undefined,
        email: email.trim() || undefined,
        allowedPaymentMethods: METHOD_ORDER.filter((m) => m !== 'CREDIT'),
        notes: 'Cadastrado no PDV (balcão)',
      };
      if (doc.trim()) body[type === 'BUSINESS' ? 'ruc' : 'ci'] = doc.trim();
      const { data } = await api.post('/customers', body);
      toast.success('Cliente cadastrado');
      onCreated(toPosCustomer(data.data));
    } catch (e: any) {
      const zod = e?.response?.data?.error?.details?.[0]?.message;
      toast.error(zod || errMsg(e, 'Erro ao cadastrar cliente'));
      setSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save(); } };
  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500';

  return (
    <Modal title="Novo cliente" icon={UserPlus} onClose={onClose}>
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-3">
        {([['INDIVIDUAL', 'Pessoa física'], ['BUSINESS', 'Empresa']] as const).map(([k, t]) => (
          <button key={k} onClick={() => setType(k)} className={`py-2 rounded-lg text-sm font-semibold transition-all ${type === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-2.5">
        <div>
          <label className="text-xs font-medium text-slate-500">{type === 'BUSINESS' ? 'Razão social / nome' : 'Nome completo'} *</label>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} className={`mt-1 ${field}`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-medium text-slate-500">{docLabel}</label>
            <input ref={docRef} value={doc} onChange={(e) => setDoc(e.target.value)} onKeyDown={onKey} inputMode="numeric" placeholder={type === 'BUSINESS' ? '80012345-6' : '1234567'} className={`mt-1 ${field}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Telefone / WhatsApp</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={onKey} inputMode="tel" placeholder="0981 123456" className={`mt-1 ${field}`} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">E-mail (opcional)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} inputMode="email" className={`mt-1 ${field}`} />
        </div>
      </div>

      {dup && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between gap-2">
          <span className="min-w-0">Já cadastrado: <b className="truncate">{dup.name}</b></span>
          <button onClick={() => onUseExisting(toPosCustomer(dup))} className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold text-xs">Usar este</button>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400">Venda a prazo (Crédito) fica liberada só após completar o cadastro em Clientes.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Voltar</button>
        <button onClick={save} disabled={saving} className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Cadastrar e usar
        </button>
      </div>
    </Modal>
  );
}

export function DiscountModal({ subtotal, value, fmt, decimals, onClose, onApply }: { subtotal: number; value: number; fmt: (v: number) => string; decimals: number; onClose: () => void; onApply: (v: number) => void }) {
  const [mode, setMode] = useState<'value' | 'pct'>('value');
  const [v, setV] = useState(value);
  const [pct, setPct] = useState('');
  const computed = mode === 'value' ? Math.min(v, subtotal) : Math.round(subtotal * Math.min(100, parseFloat(pct.replace(',', '.')) || 0) / 100);
  return (
    <Modal title="Desconto na venda" icon={Percent} onClose={onClose}>
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-3">
        <button onClick={() => setMode('value')} className={`py-2 rounded-lg text-sm font-semibold ${mode === 'value' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Valor</button>
        <button onClick={() => setMode('pct')} className={`py-2 rounded-lg text-sm font-semibold ${mode === 'pct' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Percentual</button>
      </div>
      {mode === 'value'
        ? <MoneyField value={v} onChange={setV} decimals={decimals} autoFocus onEnter={() => onApply(computed)} className="text-2xl" />
        : <input autoFocus inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onApply(computed)} placeholder="%" className="w-full text-right text-2xl font-semibold border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100" />}
      <div className="mt-2 text-sm text-slate-500 flex justify-between"><span>Subtotal {fmt(subtotal)}</span><span>Desconto <b className="text-slate-800">{fmt(computed)}</b></span></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => onApply(0)} className="py-3 rounded-xl border border-slate-200 font-semibold text-slate-600">Remover</button>
        <button onClick={() => onApply(computed)} className="py-3 rounded-xl bg-emerald-500 text-white font-bold">Aplicar (Enter)</button>
      </div>
    </Modal>
  );
}

function QtyModal({ item, onClose, onApply }: { item: CartItem; onClose: () => void; onApply: (q: number) => void }) {
  const [q, setQ] = useState(String(item.quantity));
  return (
    <Modal title="Quantidade" icon={ShoppingCart} onClose={onClose}>
      <div className="text-sm text-slate-500 mb-2 truncate">{item.name}</div>
      <input autoFocus inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => e.key === 'Enter' && onApply(parseInt(q || '0', 10))}
        className="w-full text-center text-4xl font-bold tabular-nums border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100" />
      <button onClick={() => onApply(parseInt(q || '0', 10))} className="mt-4 w-full py-3 rounded-xl bg-emerald-500 text-white font-bold">Confirmar (Enter)</button>
    </Modal>
  );
}

export function MovementModal({ type, sessionId, fmt, decimals, available, onClose, onDone }: {
  type: 'SUPPLY' | 'WITHDRAWAL'; sessionId: string; fmt: (v: number) => string; decimals: number; available: number; onClose: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const isW = type === 'WITHDRAWAL';
  const save = async () => {
    if (amount <= 0) { toast.error('Informe o valor'); return; }
    setSaving(true);
    try {
      await api.post(`/pos/session/${sessionId}/movements`, { type, amount, reason });
      toast.success(isW ? 'Sangria registrada' : 'Suprimento registrado');
      onDone();
    } catch (e: any) { toast.error(errMsg(e, 'Erro ao registrar')); setSaving(false); }
  };
  return (
    <Modal title={isW ? 'Sangria (retirada)' : 'Suprimento (entrada)'} icon={isW ? ArrowDownCircle : ArrowUpCircle} onClose={onClose}>
      {isW && <div className="mb-3 text-sm text-slate-500">Dinheiro no caixa: <b className="text-slate-800">{fmt(available)}</b></div>}
      <MoneyField value={amount} onChange={setAmount} decimals={decimals} autoFocus onEnter={save} className="text-3xl" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Motivo (opcional)" className="mt-3 w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none" />
      <button onClick={save} disabled={saving} className={`mt-4 w-full py-3 rounded-xl text-white font-bold disabled:opacity-50 ${isW ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
        {saving ? 'Salvando…' : isW ? 'Registrar sangria' : 'Registrar suprimento'}
      </button>
    </Modal>
  );
}

export function CloseModal({ session, fmt, decimals, pendingCart, onClose, onClosed }: {
  session: Session; fmt: (v: number) => string; decimals: number; pendingCart: boolean; onClose: () => void; onClosed: () => void;
}) {
  const { data: totals } = useQuery({
    queryKey: ['pos-totals', session.id],
    queryFn: async () => (await api.get(`/pos/session/${session.id}/totals`)).data.data as Totals,
    staleTime: 0,
  });
  const [counted, setCounted] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [closed, setClosed] = useState<any>(null);
  const t = totals || session.totals;
  const diff = counted - t.expectedCash;

  const close = async () => {
    if (pendingCart && !window.confirm('Há uma venda em andamento que será descartada. Fechar o caixa mesmo assim?')) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/pos/session/${session.id}/close`, { countedCash: counted, notes });
      setClosed(data.data);
      toast.success('Caixa fechado');
    } catch (e: any) { toast.error(errMsg(e, 'Erro ao fechar o caixa')); setSaving(false); }
  };

  const Row = ({ k, v, strong, cls = '' }: { k: string; v: string; strong?: boolean; cls?: string }) => (
    <div className={`flex justify-between py-1 ${strong ? 'font-semibold text-slate-800' : 'text-slate-500'} ${cls}`}><span>{k}</span><span className="tabular-nums">{v}</span></div>
  );

  const report = (
    <div className="text-sm">
      <Row k="Vendas" v={`${t.salesCount}${t.cancelledCount ? ` (+${t.cancelledCount} canceladas)` : ''}`} />
      <Row k="Total vendido" v={fmt(t.salesTotal)} strong />
      <div className="my-2 border-t border-dashed" />
      {t.byMethod.length === 0 && <div className="text-slate-400 text-center py-2">Sem vendas no turno</div>}
      {t.byMethod.map((m) => <Row key={m.method} k={`${label(m.method)} (${m.count})`} v={fmt(m.amount)} />)}
      <div className="my-2 border-t border-dashed" />
      <Row k="Fundo de troco" v={fmt(t.openingAmount)} />
      <Row k="+ Dinheiro das vendas" v={fmt(t.cashSales)} />
      <Row k="+ Suprimentos" v={fmt(t.supplies)} />
      <Row k="− Sangrias" v={fmt(t.withdrawals)} />
      <Row k="= Dinheiro esperado" v={fmt(t.expectedCash)} strong />
    </div>
  );

  if (closed) {
    const d = closed.cashDifference ?? 0;
    return (
      <Modal title={`Caixa ${session.sessionNumber} fechado`} icon={Lock} onClose={onClosed}>
        <div id="pos-print-close" className="text-slate-900">
          <div className="hidden print:block text-center font-bold">FECHAMENTO DO CAIXA {session.sessionNumber}</div>
          <div className="hidden print:block text-center text-xs mb-2">{session.operatorName} · {new Date(session.openedAt).toLocaleString('pt-BR')} → {new Date().toLocaleString('pt-BR')}</div>
          {report}
          <div className="my-2 border-t" />
          <Row k="Dinheiro contado" v={fmt(closed.countedCash ?? 0)} strong />
          <Row k={d === 0 ? 'Caixa conferido' : d > 0 ? 'Sobra' : 'Falta'} v={fmt(Math.abs(d))} strong cls={d === 0 ? 'text-emerald-700' : d > 0 ? 'text-sky-700' : 'text-red-600'} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => { document.body.classList.add('pos-printing-close'); window.print(); document.body.classList.remove('pos-printing-close'); }} className="py-3 rounded-xl border border-slate-200 font-semibold text-slate-700 flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Imprimir</button>
          <button autoFocus onClick={onClosed} className="py-3 rounded-xl bg-emerald-500 text-white font-bold">Concluir</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Fechar caixa ${session.sessionNumber}`} icon={Lock} onClose={onClose}>
      {report}
      <div className="mt-4">
        <label className="text-xs font-medium text-slate-500">Dinheiro contado na gaveta</label>
        <MoneyField value={counted} onChange={setCounted} decimals={decimals} autoFocus className="text-3xl mt-1" />
        <div className={`mt-1 text-right text-sm font-semibold ${diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-sky-700' : 'text-red-600'}`}>
          {diff === 0 ? 'Confere com o esperado' : `${diff > 0 ? 'Sobra' : 'Falta'} de ${fmt(Math.abs(diff))}`}
        </div>
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações (opcional)" className="mt-3 w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none" />
      <button onClick={close} disabled={saving} className="mt-4 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold disabled:opacity-50">
        {saving ? 'Fechando…' : 'Fechar caixa'}
      </button>
    </Modal>
  );
}

export function SessionSalesModal({ sessionId, fmt, onClose, onReprint }: { sessionId: string; fmt: (v: number) => string; onClose: () => void; onReprint: (id: string) => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pos-sales', sessionId],
    queryFn: async () => (await api.get(`/pos/session/${sessionId}/sales`)).data.data as any[],
    staleTime: 0,
  });
  return (
    <Modal title="Vendas do turno" icon={History} onClose={onClose}>
      {isLoading ? <div className="py-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : data.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-sm">Nenhuma venda neste turno ainda</div>
      ) : (
        <div className="divide-y divide-slate-100 -mx-2">
          {data.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 text-sm">{s.saleNumber} {s.status === 'CANCELLED' && <span className="text-red-600 text-xs">cancelada</span>}</div>
                <div className="text-xs text-slate-400 truncate">{new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {s.customerName}{s.nfNumber ? ` · NF ${s.nfNumber}` : ''}</div>
              </div>
              <div className="font-semibold tabular-nums text-sm">{fmt(s.total)}</div>
              <button onClick={() => onReprint(s.id)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50" title="Reimprimir cupom"><Printer className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  const rows = [
    ['Enter', 'Adiciona o produto lido/digitado (com o campo vazio, abre o pagamento)'],
    ['3*código', 'Adiciona 3 unidades do produto'],
    ['↑ ↓', 'Escolhe na lista de sugestões'],
    ['F2', 'Foco na leitura de produtos'],
    ['F4', 'Alterar quantidade do item atual'],
    ['F6', 'Desconto na venda (valor ou %)'],
    ['F7', 'Vendas do turno / reimprimir cupom'],
    ['F8', 'Remover o item atual'],
    ['F9', 'Identificar cliente'],
    ['F9 → Alt+N', 'Cadastrar cliente novo na hora'],
    ['F10 / F12', 'Pagamento'],
    ['Alt+1…9', 'No pagamento: escolhe a forma'],
    ['Ctrl+Del', 'Cancelar a venda atual'],
    ['Esc', 'Fecha janelas / limpa a busca'],
  ];
  return (
    <Modal title="Atalhos do PDV" icon={Keyboard} onClose={onClose}>
      <div className="space-y-1.5 text-sm">
        {rows.map(([k, t]) => (
          <div key={k} className="flex items-start gap-3"><kbd className="min-w-[84px] text-center px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-xs">{k}</kbd><span className="text-slate-600 pt-0.5">{t}</span></div>
        ))}
      </div>
    </Modal>
  );
}
