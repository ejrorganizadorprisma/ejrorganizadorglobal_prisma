import { useState } from 'react';
import { Truck, MapPin, Plus, Trash2, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSupplierOrderTracking,
  useAddSupplierOrderTracking,
  useDeleteSupplierOrderTracking,
} from '../hooks/useSupplierOrders';
import { LOGISTICS_PRESETS, logisticsStyle } from '../lib/logisticsStatus';

interface Props {
  orderId: string;
  /** Permite lançar/remover atualizações (admin). Só leitura quando false. */
  canEdit?: boolean;
}

// Data (YYYY-MM-DD ou ISO) → dd/mm/aaaa, sem off-by-one de fuso
const fmtDate = (s?: string): string => {
  if (!s) return '';
  const iso = String(s).slice(0, 10);
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : new Date(s).toLocaleDateString('pt-BR');
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function LogisticsTracking({ orderId, canEdit = true }: Props) {
  const { data: entries } = useSupplierOrderTracking(orderId);
  const addTracking = useAddSupplierOrderTracking();
  const deleteTracking = useDeleteSupplierOrderTracking();

  const [location, setLocation] = useState('');
  const [trackingDate, setTrackingDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleAdd = async () => {
    if (!location.trim()) {
      toast.error('Informe a localidade da mercadoria.');
      return;
    }
    try {
      await addTracking.mutateAsync({
        orderId,
        data: { location: location.trim(), notes: notes.trim() || undefined, trackingDate },
      });
      toast.success('Atualização de logística registrada!');
      setLocation('');
      setNotes('');
      setTrackingDate(today());
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao registrar atualização.');
    }
  };

  const handleDelete = async (trackingId: string) => {
    if (!window.confirm('Remover esta atualização de logística?')) return;
    try {
      await deleteTracking.mutateAsync({ trackingId, orderId });
      toast.success('Atualização removida.');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao remover.');
    }
  };

  const list = entries || [];
  const current = list[0]; // mais recente (ordenado desc)
  const curSt = logisticsStyle(current?.location);

  return (
    <div className="bg-white shadow rounded-lg">
      {/* ===== Linha compacta: localização atual + ações ===== */}
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 shrink-0">Logística</span>

        {current && curSt ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${curSt.chip}`}>
            <MapPin className="w-3 h-3" /> {current.location}
            <span className="opacity-60 font-normal">· {fmtDate(current.trackingDate)}</span>
          </span>
        ) : (
          <span className="text-xs text-gray-400">Sem atualização registrada</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {list.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-100"
            >
              Histórico ({list.length})
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${showForm ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {showForm ? <><X className="w-3.5 h-3.5" /> Fechar</> : <><Plus className="w-3.5 h-3.5" /> Atualizar</>}
            </button>
          )}
        </div>
      </div>

      {/* ===== Formulário (colapsável) ===== */}
      {canEdit && showForm && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {LOGISTICS_PRESETS.map((preset) => {
              const st = logisticsStyle(preset)!;
              const active = location.trim() === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLocation(preset)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${st.chip} ${active ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {preset}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              list="logistics-presets"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Localidade — selecione ou digite"
              className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <datalist id="logistics-presets">
              {LOGISTICS_PRESETS.map((p) => <option key={p} value={p} />)}
            </datalist>
            <input
              type="date"
              value={trackingDate}
              onChange={(e) => setTrackingDate(e.target.value)}
              className="sm:w-36 px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Observação (opcional) — transportadora, rastreio, previsão…"
              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleAdd}
              disabled={addTracking.isPending || !location.trim()}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {addTracking.isPending ? 'Salvando…' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* ===== Histórico (colapsável) ===== */}
      {showHistory && list.length > 0 && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-100">
          <ol className="relative border-l-2 border-slate-100 ml-1.5 space-y-3">
            {list.map((t, idx) => {
              const st = logisticsStyle(t.location)!;
              return (
                <li key={t.id} className="ml-3.5">
                  <span className={`absolute -left-[7px] mt-1 w-3 h-3 rounded-full ring-4 ring-white ${idx === 0 ? st.dot : 'bg-slate-200'}`} />
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${idx === 0 ? st.text : 'text-slate-400'}`} />
                        <span className={`text-sm font-semibold ${idx === 0 ? 'text-gray-900' : 'text-gray-700'}`}>{t.location}</span>
                        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtDate(t.trackingDate)}
                          {t.createdByName && <span className="text-gray-300">· {t.createdByName}</span>}
                        </span>
                      </div>
                      {t.notes && <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{t.notes}</p>}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="shrink-0 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remover atualização"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
