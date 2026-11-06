import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ScanBarcode, Search, Trash2, Minus, Plus, User, Percent, Wallet, Check, Printer, Lock, LogOut,
  ArrowDownCircle, ArrowUpCircle, History, Store, Loader2, ShoppingCart, Monitor, MoreVertical, X,
  Share2, Link2, Camera,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { resolveCustomerPrice, priceTierLabel } from '@ejr/shared-types';
import { CameraScanner } from '../components/pos/CameraScanner';
import { UnknownBarcodeModal } from '../components/pos/UnknownBarcodeModal';
import {
  type CartItem, type PosCustomer, type Session, type ReceiptData,
  CONSUMER, POS_PRINT_CSS, label, errMsg,
  Modal, ReceiptPrint, OpenSessionScreen, PaymentModal, CustomerModal, DiscountModal, MovementModal, CloseModal, SessionSalesModal,
} from './PosPage';

const MANAGER_ROLES = ['OWNER', 'DIRECTOR', 'MANAGER'];

/**
 * Bipe curto + vibração ao ler um código (feedback de supermercado).
 * Celular (principalmente iPhone) só libera som depois de um toque na tela:
 * o primeiro toque em qualquer lugar "destrava" o áudio.
 */
function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    return ctxRef.current;
  };
  useEffect(() => {
    const unlock = () => {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      // toca um "silêncio" para liberar no iOS
      try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch { /* */ }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  return useCallback((ok = true) => {
    try {
      const ctx = getCtx();
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = ok ? 1800 : 300;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.12 : 0.35));
        o.connect(g); g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
      }
    } catch { /* sem áudio */ }
    try { navigator.vibrate?.(ok ? 50 : [90, 60, 90]); } catch { /* */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Texto do comprovante para compartilhar (WhatsApp etc.). */
function receiptText(r: ReceiptData, fmt: (v: number) => string) {
  const lines = [
    `*Prisma* — Comprovante ${r.saleNumber}`,
    new Date(r.createdAt).toLocaleString('pt-BR'),
    `Cliente: ${r.customerName}`,
    '',
    ...r.items.map((i) => `${i.quantity} x ${i.name} — ${fmt(i.total)}`),
    '',
    r.discount ? `Desconto: -${fmt(r.discount)}` : '',
    `*TOTAL: ${fmt(r.total)}*`,
    ...r.payments.map((p) => `${label(p.method)}: ${fmt(p.amount + (p.method === 'CASH' ? r.changeAmount : 0))}`),
    r.changeAmount ? `Troco: ${fmt(r.changeAmount)}` : '',
    r.nfNumber ? `NF: ${r.nfNumber}` : 'Cupom não fiscal',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

export function PosMobilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const { formatPrice: fmt, defaultCurrency } = useFormatPrice();
  const decimals = defaultCurrency === 'PYG' ? 0 : 2;
  const isCashier = user?.role === 'CASHIER';
  const isManager = MANAGER_ROLES.includes(user?.role || '');
  const storageKey = `pos-cart-v1:${user?.id || 'anon'}`; // mesmo carrinho do PDV de computador
  const beep = useBeep();

  const sessionQ = useQuery({
    queryKey: ['pos-session'],
    queryFn: async () => (await api.get('/pos/session/current')).data.data as Session | null,
    staleTime: 0,
  });
  const session = sessionQ.data || null;

  const saved = (() => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } })();
  const [cart, setCart] = useState<CartItem[]>(saved.cart || []);
  const [customer, setCustomer] = useState<PosCustomer>(saved.customer || CONSUMER);
  const [globalDiscount, setGlobalDiscount] = useState<number>(saved.discount || 0);
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ cart, customer, discount: globalDiscount }));
  }, [cart, customer, globalDiscount, storageKey]);

  const [scanning, setScanning] = useState(() => localStorage.getItem('pos-mobile-camera') !== '0');
  useEffect(() => { localStorage.setItem('pos-mobile-camera', scanning ? '1' : '0'); }, [scanning]);
  const [lastRead, setLastRead] = useState<{ name: string; price: number; qty: number } | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null); // vincular código lido a um produto
  const [modal, setModal] = useState<null | 'pay' | 'customer' | 'discount' | 'supply' | 'withdraw' | 'close' | 'sales' | 'menu'>(null);
  const [lastSale, setLastSale] = useState<ReceiptData | null>(null);
  const [printData, setPrintData] = useState<ReceiptData | null>(null);
  const lookupBusy = useRef(false);

  // Preço pela tabela do cliente + recálculo ao trocar de cliente
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierKey]);

  const subtotal = cart.reduce((a, i) => a + Math.max(0, i.unitPrice * i.quantity - i.discount), 0);
  const discount = Math.min(globalDiscount, subtotal);
  const total = subtotal - discount;
  const itemsQty = cart.reduce((a, i) => a + i.quantity, 0);

  const addProduct = useCallback((p: any, qty = 1) => {
    const price = resolveCustomerPrice(p, customerRef.current).price;
    let finalQty = qty;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === p.id);
      if (idx >= 0) {
        finalQty = prev[idx].quantity + qty;
        const next = prev.map((i, k) => (k === idx ? { ...i, quantity: i.quantity + qty } : i));
        // item lido sobe para o topo
        const [it] = next.splice(idx, 1);
        return [it, ...next];
      }
      return [{
        productId: p.id, name: p.name, code: p.code, barcode: p.barcode, unit: p.unit,
        unitPrice: price, quantity: qty, discount: 0, stock: p.currentStock,
        retailPrice: Number(p.salePrice || 0), wholesalePrice: Number(p.wholesalePrice || 0), priceCurrency: p.salePriceCurrency,
      }, ...prev];
    });
    setTimeout(() => setLastRead({ name: p.name, price, qty: finalQty }), 0);
    if (p.currentStock != null && finalQty > p.currentStock) toast.warning(`Estoque de ${p.name}: ${p.currentStock}`);
  }, []);

  // Leitura da câmera: BIPE na hora da leitura → depois verifica o cadastro
  const onScan = useCallback(async (code: string) => {
    if (lookupBusy.current) return;
    lookupBusy.current = true;
    beep(true);
    try {
      const { data } = await api.get('/pos/products/lookup', { params: { code } });
      const p = data?.data;
      if (p) {
        if (p.status && p.status !== 'ACTIVE') { beep(false); toast.error(`${p.name} está inativo`); return; }
        addProduct(p, 1);
      } else {
        setTimeout(() => beep(false), 180);
        setNotFound(code);
      }
    } catch (e: any) {
      beep(false);
      toast.error(errMsg(e, 'Erro ao buscar o código'));
    } finally {
      lookupBusy.current = false;
    }
  }, [addProduct, beep]);

  // Busca por nome/código (digitação)
  useEffect(() => {
    const t0 = query.trim();
    if (!searchOpen || t0.length < 2) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/products', { params: { search: t0, limit: 15, status: 'ACTIVE' } });
        if (alive) setResults(data?.data || []);
      } finally { if (alive) setSearching(false); }
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [query, searchOpen]);

  const pickResult = async (p: any) => {
    if (linkCode) {
      try {
        const { data } = await api.post(`/pos/products/${p.id}/barcode`, { barcode: linkCode });
        toast.success(`Código ${linkCode} vinculado a ${p.name}`);
        addProduct(data.data || p, 1);
      } catch (e: any) {
        toast.error(errMsg(e, 'Não foi possível vincular o código'));
        return;
      }
      setLinkCode(null);
    } else {
      addProduct(p, 1);
    }
    beep(true);
    setSearchOpen(false);
    setQuery('');
  };

  const updateQty = (idx: number, q: number) => {
    if (q <= 0) { setCart((prev) => prev.filter((_, k) => k !== idx)); return; }
    setCart((prev) => prev.map((i, k) => (k === idx ? { ...i, quantity: q } : i)));
  };
  const clearSale = () => { setCart([]); setGlobalDiscount(0); setCustomer(CONSUMER); setLastRead(null); };

  const doPrint = (data: ReceiptData) => { setPrintData(data); setTimeout(() => window.print(), 80); };
  const doShare = async (r: ReceiptData) => {
    const text = receiptText(r, fmt);
    try {
      if (navigator.share) await navigator.share({ title: `Comprovante ${r.saleNumber}`, text });
      else { await navigator.clipboard.writeText(text); toast.success('Comprovante copiado'); }
    } catch { /* cancelado */ }
  };

  const scannerPaused = !!modal || !!lastSale || !!notFound || searchOpen;

  if (sessionQ.isLoading) {
    return <div className="h-[100dvh] flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-emerald-400" /></div>;
  }
  if (!session) {
    return <OpenSessionScreen fmt={fmt} decimals={decimals} userName={user?.name} isCashier={isCashier}
      onBack={() => navigate('/dashboard')} onLogout={async () => { await logout(); navigate('/login'); }}
      onOpened={() => qc.invalidateQueries({ queryKey: ['pos-session'] })} />;
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 text-slate-900 overflow-hidden select-none print:h-auto print:bg-white">
      <style>{POS_PRINT_CSS}</style>
      <ReceiptPrint data={printData} fmt={fmt} company="Prisma" />

      {/* Topo */}
      <header className="print:hidden shrink-0 bg-slate-950 text-white px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0"><Store className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-bold text-sm">Caixa {session.sessionNumber}</div>
          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {session.operatorName || user?.name}
          </div>
        </div>
        <button onClick={() => setScanning((s) => !s)} className={`h-10 px-3 rounded-xl flex items-center gap-1.5 text-sm font-semibold ${scanning ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-200'}`}>
          <Camera className="w-4 h-4" /> {scanning ? 'Câmera' : 'Ligar'}
        </button>
        <button onClick={() => { setSearchOpen(true); setLinkCode(null); }} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center" title="Buscar produto">
          <Search className="w-5 h-5" />
        </button>
        <button onClick={() => setModal('menu')} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center" title="Menu">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* Câmera */}
      {scanning && (
        <div className="print:hidden shrink-0 relative">
          <CameraScanner onDetect={onScan} paused={scannerPaused} onClose={() => setScanning(false)} className="h-[34dvh] sm:h-[38dvh] md:h-[30dvh]" />
          {lastRead && (
            <div className="absolute left-2 right-2 bottom-2 rounded-xl bg-white/95 backdrop-blur px-3 py-2 flex items-center gap-2 shadow-lg">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1 text-sm font-semibold truncate">{lastRead.name}</div>
              <div className="text-sm tabular-nums font-bold whitespace-nowrap">{lastRead.qty}× {fmt(lastRead.price)}</div>
            </div>
          )}
        </div>
      )}

      {/* Itens */}
      <main className="print:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 text-slate-400">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-3"><ShoppingCart className="w-9 h-9 text-emerald-500" /></div>
            <div className="text-xl font-bold text-slate-700">Caixa livre</div>
            <div className="text-sm mt-1">{scanning ? 'Aponte a câmera para o código de barras.' : 'Ligue a câmera ou toque na lupa para buscar.'}</div>
            {!scanning && (
              <button onClick={() => setScanning(true)} className="mt-4 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold flex items-center gap-2"><ScanBarcode className="w-5 h-5" />Escanear</button>
            )}
          </div>
        ) : (
          <ul className="p-2 space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
            {cart.map((it, idx) => (
              <li key={it.productId} className={`bg-white rounded-2xl border px-3 py-2.5 flex items-center gap-3 ${idx === 0 ? 'border-emerald-300 shadow-sm' : 'border-slate-200'}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[15px] leading-snug line-clamp-2">{it.name}</div>
                  <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                    {fmt(it.unitPrice)} · {it.code}
                    {it.stock != null && it.quantity > it.stock && <span className="ml-1 text-red-600 font-semibold">estoque {it.stock}</span>}
                  </div>
                  <div className="mt-1 font-bold tabular-nums">{fmt(it.unitPrice * it.quantity - it.discount)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center rounded-xl bg-slate-100">
                    <button onClick={() => updateQty(idx, it.quantity - 1)} className="w-10 h-10 flex items-center justify-center active:bg-slate-200 rounded-l-xl" aria-label="Menos">
                      {it.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <span className="w-9 text-center font-bold tabular-nums">{it.quantity}</span>
                    <button onClick={() => updateQty(idx, it.quantity + 1)} className="w-10 h-10 flex items-center justify-center active:bg-slate-200 rounded-r-xl" aria-label="Mais">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Rodapé: cliente + total + cobrar */}
      <footer className="print:hidden shrink-0 bg-white border-t border-slate-200 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.6rem)] space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('customer')} className="min-w-0 flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-left">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate">{customer.name}</span>
              {customer.priceTier && customer.priceTier !== 'RETAIL' && (
                <span className="block text-[10.5px] font-semibold text-violet-600">Tabela {priceTierLabel(customer)}</span>
              )}
            </span>
          </button>
          <button onClick={() => cart.length && setModal('discount')} className="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold flex items-center gap-1 disabled:opacity-40" disabled={!cart.length}>
            <Percent className="w-4 h-4" />{discount ? fmt(discount) : ''}
          </button>
        </div>
        <button
          onClick={() => cart.length && setModal('pay')}
          disabled={!cart.length}
          className="w-full rounded-2xl bg-emerald-500 active:bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-3 flex items-center justify-between shadow-lg shadow-emerald-500/30"
        >
          <span className="text-left leading-tight">
            <span className="block text-[11px] uppercase tracking-[0.18em] text-emerald-100">{itemsQty} {itemsQty === 1 ? 'item' : 'itens'} · Total</span>
            <span className="block text-2xl font-extrabold tabular-nums">{fmt(total)}</span>
          </span>
          <span className="flex items-center gap-2 text-lg font-bold"><Wallet className="w-5 h-5" />Cobrar</span>
        </button>
      </footer>

      {/* Busca por nome / código */}
      {searchOpen && (
        <div className="print:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="shrink-0 px-3 pt-[max(env(safe-area-inset-top),0.6rem)] pb-2 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} inputMode="search"
                placeholder={linkCode ? 'Busque o produto deste código' : 'Nome ou código do produto'}
                className="w-full pl-9 pr-9 py-3 rounded-xl border border-slate-300 outline-none focus:ring-4 focus:ring-emerald-100 text-base" />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <button onClick={() => { setSearchOpen(false); setQuery(''); setLinkCode(null); }} className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          {linkCode && (
            <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-sm text-violet-800 flex items-center gap-2">
              <Link2 className="w-4 h-4 shrink-0" /> Escolha o produto para vincular o código <b className="tabular-nums">{linkCode}</b>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2">
            {results.map((p) => (
              <button key={p.id} onClick={() => pickResult(p)} className="w-full text-left px-3 py-3 rounded-xl active:bg-emerald-50 flex items-center gap-3 border-b border-slate-100">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.code}{p.barcode ? ` · ${p.barcode}` : ''} · estoque {p.currentStock ?? '—'}</div>
                </div>
                <div className="font-bold tabular-nums whitespace-nowrap">{fmt(resolveCustomerPrice(p, customer).price)}</div>
              </button>
            ))}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <div className="text-center text-slate-400 py-10">Nenhum produto encontrado</div>
            )}
            {query.trim().length < 2 && <div className="text-center text-slate-400 py-10 text-sm">Digite pelo menos 2 letras</div>}
          </div>
        </div>
      )}

      {/* Código não cadastrado: vincular a produto existente / cadastrar novo / só vender */}
      {notFound && (
        <UnknownBarcodeModal
          code={notFound}
          isManager={isManager}
          fmt={fmt}
          decimals={decimals}
          onClose={() => setNotFound(null)}
          onAdded={(p) => { addProduct(p, 1); beep(true); setNotFound(null); }}
        />
      )}

      {/* Menu */}
      {modal === 'menu' && (
        <Modal title="Caixa" icon={Store} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: History, t: 'Vendas do turno', on: () => setModal('sales') },
              { icon: Percent, t: 'Desconto', on: () => (cart.length ? setModal('discount') : toast.info('Carrinho vazio')) },
              { icon: ArrowUpCircle, t: 'Suprimento', on: () => setModal('supply') },
              { icon: ArrowDownCircle, t: 'Sangria', on: () => setModal('withdraw') },
              { icon: Trash2, t: 'Cancelar venda', on: () => { if (cart.length && window.confirm('Cancelar a venda atual?')) clearSale(); setModal(null); } },
              { icon: Monitor, t: 'Versão computador', on: () => { localStorage.setItem('pos-prefer-desktop', '1'); navigate('/pdv'); } },
              { icon: Lock, t: 'Fechar caixa', on: () => setModal('close'), accent: true },
              ...(isCashier
                ? [{ icon: LogOut, t: 'Sair', on: async () => { await logout(); navigate('/login'); } }]
                : [{ icon: LogOut, t: 'Voltar ao sistema', on: () => navigate('/sales') }]),
            ].map((b: any) => (
              <button key={b.t} onClick={b.on} className={`py-4 rounded-2xl border flex flex-col items-center gap-1.5 text-sm font-semibold active:scale-[0.98] transition ${b.accent ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-700'}`}>
                <b.icon className="w-5 h-5" />{b.t}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'pay' && (
        <PaymentModal
          total={total} customer={customer} fmt={fmt} decimals={decimals}
          onClose={() => setModal(null)}
          onConfirm={async ({ payments, withNf, nfNumber, creditDueDate }) => {
            const { data } = await api.post('/pos/sales', {
              sessionId: session.id,
              customerId: customer.id,
              items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, discount: i.discount })),
              discount, payments, withNf, nfNumber, creditDueDate,
            });
            clearSale();
            setModal(null);
            setLastSale(data.data);
            beep(true);
            qc.invalidateQueries({ queryKey: ['pos-session'] });
            qc.invalidateQueries({ queryKey: ['next-nf-number'] });
          }}
        />
      )}
      {modal === 'customer' && <CustomerModal current={customer} onClose={() => setModal(null)} onPick={(c) => { setCustomer(c); setModal(null); }} />}
      {modal === 'discount' && (
        <DiscountModal subtotal={subtotal} value={discount} fmt={fmt} decimals={decimals} onClose={() => setModal(null)} onApply={(v) => { setGlobalDiscount(v); setModal(null); }} />
      )}
      {(modal === 'supply' || modal === 'withdraw') && (
        <MovementModal type={modal === 'supply' ? 'SUPPLY' : 'WITHDRAWAL'} sessionId={session.id} fmt={fmt} decimals={decimals}
          available={session.totals.expectedCash} onClose={() => setModal(null)}
          onDone={() => { setModal(null); qc.invalidateQueries({ queryKey: ['pos-session'] }); }} />
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

      {/* Venda concluída */}
      {lastSale && (
        <div className="print:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-9 h-9 text-emerald-600" /></div>
            <div className="mt-3 text-xl font-bold">Venda concluída</div>
            <div className="text-sm text-slate-500">{lastSale.saleNumber} · {fmt(lastSale.total)}{lastSale.nfNumber ? ` · NF ${lastSale.nfNumber}` : ''}</div>
            {lastSale.changeAmount > 0 && (
              <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-700">Troco</div>
                <div className="text-4xl font-extrabold tabular-nums text-amber-700">{fmt(lastSale.changeAmount)}</div>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => doShare(lastSale)} className="py-3 rounded-xl border border-slate-200 font-semibold flex items-center justify-center gap-2"><Share2 className="w-4 h-4" />Enviar</button>
              <button onClick={() => doPrint(lastSale)} className="py-3 rounded-xl border border-slate-200 font-semibold flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Imprimir</button>
            </div>
            <button onClick={() => setLastSale(null)} className="mt-2 w-full py-4 rounded-2xl bg-emerald-500 active:bg-emerald-600 text-white text-lg font-bold">Nova venda</button>
          </div>
        </div>
      )}
    </div>
  );
}
