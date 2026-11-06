import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ScanBarcode, Link2, PackagePlus, Search, Loader2, Check, ArrowLeft, Keyboard } from 'lucide-react';
import { api } from '../../lib/api';
import { Modal, MoneyField, errMsg } from '../../pages/PosPage';

/**
 * Código de barras lido que não pertence a nenhum produto.
 * Oferece na hora (gerentes):
 *  1) Vincular o código a um produto JÁ cadastrado (busca → toca → grava o código)
 *  2) Cadastrar um produto NOVO com esse código (nome, categoria, preço, estoque)
 * Para os demais: buscar o produto pelo nome e vender (sem gravar o código).
 * Em todos os casos o produto escolhido/criado já entra na venda (onAdded).
 */
export function UnknownBarcodeModal({
  code, isManager, fmt, decimals, onClose, onAdded,
}: {
  code: string;
  isManager: boolean;
  fmt: (v: number) => string;
  decimals: number;
  onClose: () => void;
  onAdded: (product: any) => void;
}) {
  const [step, setStep] = useState<'choose' | 'link' | 'search' | 'new'>('choose');

  if (step === 'link' || step === 'search') {
    return <ProductPicker code={code} link={step === 'link'} fmt={fmt} onBack={() => setStep('choose')} onClose={onClose} onAdded={onAdded} />;
  }
  if (step === 'new') {
    return <QuickProductForm code={code} decimals={decimals} fmt={fmt} onBack={() => setStep('choose')} onClose={onClose} onAdded={onAdded} />;
  }

  return (
    <Modal title="Código não cadastrado" icon={ScanBarcode} onClose={onClose}>
      <div className="text-center">
        <div className="text-2xl font-bold tabular-nums tracking-wide break-all">{code}</div>
        <p className="text-sm text-slate-500 mt-1">Nenhum produto tem este código de barras.</p>
      </div>
      <div className="mt-4 space-y-2">
        {isManager ? (
          <>
            <button autoFocus onClick={() => setStep('link')} className="w-full p-3.5 rounded-2xl bg-violet-600 active:bg-violet-700 text-white text-left flex items-center gap-3">
              <Link2 className="w-5 h-5 shrink-0" />
              <span><span className="block font-bold">Vincular a um produto cadastrado</span><span className="block text-xs text-violet-100">O código passa a ser deste produto</span></span>
            </button>
            <button onClick={() => setStep('new')} className="w-full p-3.5 rounded-2xl bg-emerald-500 active:bg-emerald-600 text-white text-left flex items-center gap-3">
              <PackagePlus className="w-5 h-5 shrink-0" />
              <span><span className="block font-bold">Cadastrar produto novo</span><span className="block text-xs text-emerald-50">Nome, categoria, preço e estoque</span></span>
            </button>
          </>
        ) : (
          <p className="text-xs text-center text-slate-500 bg-slate-50 rounded-xl p-3">Peça ao gerente para cadastrar este código. Você pode vender buscando o produto pelo nome.</p>
        )}
        <button onClick={() => setStep('search')} className="w-full py-3 rounded-2xl border border-slate-200 font-semibold text-slate-700 flex items-center justify-center gap-2">
          <Keyboard className="w-4 h-4" /> Só vender — buscar pelo nome
        </button>
      </div>
    </Modal>
  );
}

function ProductPicker({ code, link, fmt, onBack, onClose, onAdded }: {
  code: string; link: boolean; fmt: (v: number) => string; onBack: () => void; onClose: () => void; onAdded: (p: any) => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/products', { params: { search: q.trim(), limit: 15, status: 'ACTIVE' } });
        if (alive) setList(data?.data || []);
      } finally { if (alive) setLoading(false); }
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const pick = async (p: any) => {
    if (!link) { onAdded(p); return; }
    if (p.barcode && !window.confirm(`${p.name} já tem o código ${p.barcode}. Substituir por ${code}?`)) return;
    setSaving(p.id);
    try {
      const { data } = await api.post(`/pos/products/${p.id}/barcode`, { barcode: code });
      toast.success(`Código vinculado a ${p.name}`);
      onAdded(data.data || p);
    } catch (e: any) {
      toast.error(errMsg(e, 'Não foi possível vincular o código'));
      setSaving(null);
    }
  };

  return (
    <Modal title={link ? 'Vincular código ao produto' : 'Buscar produto'} icon={link ? Link2 : Search} onClose={onClose}>
      {link && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-sm text-violet-800">
          Código <b className="tabular-nums">{code}</b> → escolha o produto
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" placeholder="Nome ou código do produto"
          className="w-full pl-9 pr-9 py-3 rounded-xl border border-slate-300 outline-none focus:ring-4 focus:ring-emerald-100 text-base" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
      </div>
      <div className="mt-2 max-h-[50vh] overflow-y-auto -mx-2">
        {list.map((p) => (
          <button key={p.id} onClick={() => pick(p)} disabled={!!saving} className="w-full text-left px-3 py-3 rounded-xl active:bg-emerald-50 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 disabled:opacity-50">
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-snug">{p.name}</div>
              <div className="text-xs text-slate-400">{p.code}{p.barcode ? ` · cód. barras ${p.barcode}` : ' · sem cód. barras'}</div>
            </div>
            {saving === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold tabular-nums whitespace-nowrap">{fmt(p.salePrice || 0)}</span>}
          </button>
        ))}
        {q.trim().length >= 2 && !loading && list.length === 0 && <div className="text-center text-slate-400 py-6 text-sm">Nenhum produto encontrado</div>}
      </div>
      <button onClick={onBack} className="mt-3 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold flex items-center justify-center gap-1.5"><ArrowLeft className="w-4 h-4" />Voltar</button>
    </Modal>
  );
}

function QuickProductForm({ code, decimals, fmt, onBack, onClose, onAdded }: {
  code: string; decimals: number; fmt: (v: number) => string; onBack: () => void; onClose: () => void; onAdded: (p: any) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [salePrice, setSalePrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [stock, setStock] = useState('1');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    api.get('/product-categories/active').then(({ data }) => {
      const names: string[] = (data?.data || data || []).map((c: any) => c.name).filter(Boolean);
      setCategories(names);
      const saved = localStorage.getItem('pos-last-category');
      setCategory(saved && names.includes(saved) ? saved : names[0] || '');
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (name.trim().length < 2) { toast.error('Informe o nome do produto'); nameRef.current?.focus(); return; }
    if (!category) { toast.error('Escolha a categoria'); return; }
    if (salePrice <= 0) { toast.error('Informe o preço de venda'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/pos/products/quick', {
        name: name.trim(), category, salePrice, wholesalePrice, barcode: code, initialStock: parseInt(stock || '0', 10),
      });
      localStorage.setItem('pos-last-category', category);
      toast.success('Produto cadastrado');
      onAdded(data.data);
    } catch (e: any) {
      toast.error(errMsg(e, 'Erro ao cadastrar o produto'));
      setSaving(false);
    }
  };
  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 text-base';

  return (
    <Modal title="Novo produto" icon={PackagePlus} onClose={onClose}>
      <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 flex items-center gap-2">
        <ScanBarcode className="w-4 h-4 text-emerald-600" /> Código de barras <b className="tabular-nums">{code}</b>
      </div>
      <div className="space-y-2.5">
        <div>
          <label className="text-xs font-medium text-slate-500">Nome do produto *</label>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${field}`} placeholder="Ex.: Canilla 1/2 metal" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Categoria *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 ${field} bg-white`}>
            {categories.length === 0 && <option value="">Carregando…</option>}
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-medium text-slate-500">Preço varejo *</label>
            <MoneyField value={salePrice} onChange={setSalePrice} decimals={decimals} className="mt-1 text-lg !py-2.5" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Preço atacado</label>
            <MoneyField value={wholesalePrice} onChange={setWholesalePrice} decimals={decimals} className="mt-1 text-lg !py-2.5" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Estoque inicial</label>
          <input value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`mt-1 ${field} text-right tabular-nums`} />
          <p className="mt-1 text-[11px] text-slate-400">Quantidade que existe agora na loja (entra como ajuste de estoque).</p>
        </div>
      </div>
      {salePrice > 0 && <p className="mt-2 text-xs text-slate-500 text-right">Varejo {fmt(salePrice)}{wholesalePrice ? ` · Atacado ${fmt(wholesalePrice)}` : ''}</p>}
      <p className="mt-2 text-[11px] text-slate-400">Os demais dados (custo, fornecedor, marca, foto) podem ser completados depois em Produtos.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 flex items-center justify-center gap-1.5"><ArrowLeft className="w-4 h-4" />Voltar</button>
        <button onClick={save} disabled={saving} className="py-3 rounded-xl bg-emerald-500 active:bg-emerald-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Cadastrar e vender
        </button>
      </div>
    </Modal>
  );
}
