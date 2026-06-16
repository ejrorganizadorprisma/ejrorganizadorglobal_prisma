import { useState, useEffect } from 'react';
import { useSalesOrder, useSeparateSalesOrder } from '../../hooks/useSalesOrders';
import { toast } from 'sonner';
import { X, PackageCheck, Check, AlertTriangle } from 'lucide-react';

interface SeparationModalProps {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}

interface Row { id: string; name: string; quantity: number; quantitySeparated: number; status: 'OK' | 'PARTIAL' | 'MISSING'; }

export function SeparationModal({ orderId, onClose, onDone }: SeparationModalProps) {
  const { data: order, isLoading } = useSalesOrder(orderId);
  const separate = useSeparateSalesOrder();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order?.items) {
      setRows(order.items.map((it: any) => ({
        id: it.id,
        name: it.product?.name || it.serviceName || it.productName || 'Item',
        quantity: it.quantity,
        quantitySeparated: it.quantity,
        status: 'OK' as const,
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

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await separate.mutateAsync({ id: orderId, body: { items: rows.map((r) => ({ id: r.id, quantitySeparated: r.quantitySeparated, separationStatus: r.status })) } });
      toast.success('Pedido separado!');
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao separar.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-600 to-violet-500 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><PackageCheck className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold truncate">Separação do Pedido</h3>
            <p className="text-xs text-violet-50/90 truncate">{order?.orderNumber || ''}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-auto p-5 bg-slate-50 space-y-2">
          {isLoading ? <div className="text-center py-8 text-sm text-gray-400">Carregando…</div> : rows.map((r, i) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                <p className="text-[11px] text-slate-400">Pedido: {r.quantity}</p>
              </div>
              <div className="text-center">
                <label className="block text-[9px] uppercase text-violet-600 font-semibold">Separado</label>
                <input type="number" min={0} max={r.quantity} value={r.quantitySeparated}
                  onChange={(e) => update(i, parseInt(e.target.value, 10) || 0)}
                  className="w-20 px-2 py-1 border border-violet-300 rounded-lg text-sm text-center font-bold text-violet-700" />
              </div>
              <span className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${r.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : r.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {r.status === 'OK' ? <><Check className="w-3 h-3" /> OK</> : r.status === 'PARTIAL' ? <><AlertTriangle className="w-3 h-3" /> Parcial</> : <><X className="w-3 h-3" /> Falta</>}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleConfirm} disabled={saving || isLoading} className="px-5 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
            <PackageCheck className="w-4 h-4" /> {saving ? 'Salvando…' : 'Confirmar separação'}
          </button>
        </div>
      </div>
    </div>
  );
}
