import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  PackageSearch, PackageCheck, Lock, User, Clock, ArrowLeft,
  Check, AlertTriangle, X, KeyRound, PauseCircle,
} from 'lucide-react';
import {
  useSeparationQueue, useClaimSeparation, usePostponeSeparation,
  useSeparateSalesOrder, useSalesOrder,
} from '../hooks/useSalesOrders';
import { useSystemSettings } from '../hooks/useSystemSettings';
import type { SalesOrder } from '@ejr/shared-types';

interface Row {
  id: string;
  name: string;
  quantity: number;
  quantitySeparated: number;
  currentStock: number;
  status: 'OK' | 'PARTIAL' | 'MISSING';
  note: string;
}

export default function StockSeparationPage() {
  const { data: settings } = useSystemSettings();
  const byCode = settings?.floorIdentificationMethod === 'EMPLOYEE_CODE';

  const { data: queue = [], isLoading } = useSeparationQueue();
  const claim = useClaimSeparation();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [codeModalFor, setCodeModalFor] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const awaiting = queue.filter((o) => o.status === 'AWAITING_SEPARATION');
  const separating = queue.filter((o) => o.status === 'SEPARATING');

  const doClaim = async (id: string, employeeCode?: string) => {
    try {
      const order = await claim.mutateAsync({ id, body: employeeCode ? { employeeCode } : {} });
      setActiveId(order.id);
      setCodeModalFor(null);
      setCode('');
      toast.success('Separação assumida!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Não foi possível assumir a separação.');
    }
  };

  const handleAssumir = (id: string) => {
    if (byCode) setCodeModalFor(id);
    else doClaim(id);
  };

  if (activeId) {
    return <SeparationWorkspace orderId={activeId} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
          <PackageSearch className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Separação no Estoque</h1>
          <p className="text-sm text-slate-500">Pedidos liberados para separar — o primeiro a assumir fica responsável.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Carregando fila…</div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Disponíveis para separar ({awaiting.length})
            </h2>
            {awaiting.length === 0 ? (
              <div className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                Nenhum pedido aguardando separação.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {awaiting.map((o) => (
                  <QueueCard key={o.id} order={o} onAssumir={() => handleAssumir(o.id)} claiming={claim.isPending} />
                ))}
              </div>
            )}
          </section>

          {separating.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Em separação ({separating.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {separating.map((o) => (
                  <LockedCard key={o.id} order={o} onOpen={() => setActiveId(o.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {codeModalFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setCodeModalFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-slate-800">Código de funcionário</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">Digite seu código para registrar quem está separando.</p>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) doClaim(codeModalFor, code.trim()); }}
              placeholder="Ex.: 1234"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center text-lg font-bold tracking-widest focus:ring-2 focus:ring-violet-400 outline-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setCodeModalFor(null)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button
                onClick={() => code.trim() && doClaim(codeModalFor, code.trim())}
                disabled={!code.trim() || claim.isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                Assumir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueCard({ order, onAssumir, claiming }: { order: SalesOrder; onAssumir: () => void; claiming: boolean }) {
  const items = order.items?.length ?? 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">{order.orderNumber}</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Aguardando</span>
      </div>
      <div className="text-sm text-slate-600 truncate">{order.customer?.name || 'Cliente'}</div>
      <div className="text-xs text-slate-400">{items} {items === 1 ? 'item' : 'itens'}</div>
      <button
        onClick={onAssumir}
        disabled={claiming}
        className="mt-1 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <PackageCheck className="w-4 h-4" /> Assumir separação
      </button>
    </div>
  );
}

function LockedCard({ order, onOpen }: { order: SalesOrder; onOpen: () => void }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">{order.orderNumber}</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex items-center gap-1">
          <Lock className="w-3 h-3" /> Em separação
        </span>
      </div>
      <div className="text-sm text-slate-600 truncate">{order.customer?.name || 'Cliente'}</div>
      <div className="text-xs text-slate-500 flex items-center gap-1">
        <User className="w-3 h-3" /> {order.separationResponsible?.name || 'Responsável'}
      </div>
      <button onClick={onOpen} className="mt-1 text-xs font-medium text-violet-600 hover:underline text-left">
        Abrir (você é o responsável) →
      </button>
    </div>
  );
}

function SeparationWorkspace({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { data: order, isLoading } = useSalesOrder(orderId);
  const postpone = usePostponeSeparation();
  const separate = useSeparateSalesOrder();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order?.items) {
      setRows(order.items.map((it: any) => ({
        id: it.id,
        name: it.product?.name || it.serviceName || 'Item',
        quantity: it.quantity,
        quantitySeparated: it.quantity,
        currentStock: it.product?.currentStock ?? 0,
        status: 'OK' as const,
        note: '',
      })));
    }
  }, [order]);

  const update = (idx: number, qty: number) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      const q = Math.max(0, Math.min(qty, r.quantity));
      const status: Row['status'] = q === 0 ? 'MISSING' : q < r.quantity ? 'PARTIAL' : 'OK';
      return { ...r, quantitySeparated: q, status };
    }));
  };
  const setNote = (idx: number, note: string) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, note } : r)));

  const allJustified = useMemo(
    () => rows.every((r) => r.status === 'OK' || r.note.trim().length > 0),
    [rows]
  );

  const handlePostpone = async () => {
    if (!confirm('Adiar esta separação? O pedido volta para a fila e outro funcionário poderá assumir.')) return;
    try {
      await postpone.mutateAsync({ id: orderId, body: {} });
      toast.success('Separação adiada.');
      onBack();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao adiar.');
    }
  };

  const handleFinish = async () => {
    if (!allJustified) { toast.error('Justifique os itens em falta antes de finalizar.'); return; }
    setSaving(true);
    try {
      await separate.mutateAsync({
        id: orderId,
        body: { items: rows.map((r) => ({ id: r.id, quantitySeparated: r.quantitySeparated, separationStatus: r.status, separationNote: r.note || null })) },
      });
      toast.success('Tudo separado! Pedido enviado para conferência.');
      onBack();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao finalizar separação.');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar à fila
      </button>

      {/* Responsável em destaque */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-2xl p-5 mb-4 shadow-lg shadow-violet-500/30">
        <p className="text-xs uppercase tracking-wide text-violet-100">Responsável pela separação</p>
        <p className="text-2xl font-bold flex items-center gap-2 mt-1">
          <User className="w-6 h-6" /> {order?.separationResponsible?.name || '—'}
        </p>
        <p className="text-sm text-violet-100 mt-1">{order?.orderNumber} · {order?.customer?.name}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando itens…</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className={`bg-white border rounded-xl p-4 ${r.status === 'OK' ? 'border-emerald-200' : r.status === 'PARTIAL' ? 'border-amber-300' : 'border-red-300'}`}>
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">{r.name}</p>
                  <p className="text-3xl font-extrabold text-slate-800 leading-tight">{r.quantity}<span className="text-sm font-medium text-slate-400 ml-1">a separar</span></p>
                </div>
                <div className="text-center shrink-0">
                  <label className="block text-[10px] uppercase text-violet-600 font-semibold mb-1">Separado</label>
                  <input
                    type="number" min={0} max={r.quantity} value={r.quantitySeparated}
                    onChange={(e) => update(i, parseInt(e.target.value, 10) || 0)}
                    className={`w-24 px-2 py-2 border-2 rounded-lg text-2xl text-center font-bold outline-none ${r.status === 'OK' ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-red-400 text-red-700 bg-red-50'}`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Estoque: <span className="font-semibold">{r.currentStock}</span></p>
                </div>
                <div className="shrink-0">
                  {r.status === 'OK'
                    ? <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> OK</span>
                    : <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Falta</span>}
                </div>
              </div>
              {r.status !== 'OK' && (
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-red-600 mb-1">Justifique a falta (quebrado, com falha, sem estoque…)</label>
                  <input
                    value={r.note}
                    onChange={(e) => setNote(i, e.target.value)}
                    placeholder="Descreva o motivo da falta"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-5 sticky bottom-4">
        <button
          onClick={handlePostpone}
          disabled={postpone.isPending}
          className="px-4 py-3 text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center gap-2 disabled:opacity-50"
        >
          <PauseCircle className="w-4 h-4" /> Adiar separação
        </button>
        <button
          onClick={handleFinish}
          disabled={saving || isLoading}
          className="flex-1 px-4 py-3 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
        >
          <PackageCheck className="w-5 h-5" /> {saving ? 'Salvando…' : 'Tudo Separado'}
        </button>
      </div>
    </div>
  );
}
