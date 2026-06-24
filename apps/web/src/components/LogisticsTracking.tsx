import { useState } from 'react';
import { Truck, MapPin, Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSupplierOrderTracking,
  useAddSupplierOrderTracking,
  useDeleteSupplierOrderTracking,
} from '../hooks/useSupplierOrders';

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
  const { data: entries, isLoading } = useSupplierOrderTracking(orderId);
  const addTracking = useAddSupplierOrderTracking();
  const deleteTracking = useDeleteSupplierOrderTracking();

  const [location, setLocation] = useState('');
  const [trackingDate, setTrackingDate] = useState(today());
  const [notes, setNotes] = useState('');

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

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Truck className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">Logística — Rastreamento</h3>
          <p className="text-[11px] text-gray-400 leading-tight">Onde a mercadoria está · histórico de atualizações</p>
        </div>
        {list.length > 0 && (
          <span className="ml-auto text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {list.length} {list.length === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      {/* Formulário de nova atualização */}
      {canEdit && (
        <div className="px-4 py-3 bg-slate-50/70 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Localidade *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="Ex.: Em trânsito — Foz do Iguaçu / Alfândega"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="sm:w-36">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Data</label>
              <input
                type="date"
                value={trackingDate}
                onChange={(e) => setTrackingDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Observação (opcional) — ex.: previsão de chegada, transportadora, nº de rastreio…"
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

      {/* Timeline do histórico */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="text-center py-4 text-xs text-gray-400">Carregando…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">
            <MapPin className="w-5 h-5 mx-auto mb-1 text-gray-300" />
            Nenhuma atualização de logística ainda.
          </div>
        ) : (
          <ol className="relative border-l-2 border-indigo-100 ml-1.5 space-y-4">
            {list.map((t, idx) => (
              <li key={t.id} className="ml-4">
                <span className={`absolute -left-[7px] mt-1 w-3 h-3 rounded-full ring-4 ring-white ${idx === 0 ? 'bg-indigo-600' : 'bg-indigo-200'}`} />
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${idx === 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-semibold ${idx === 0 ? 'text-gray-900' : 'text-gray-700'}`}>{t.location}</span>
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Atual</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{fmtDate(t.trackingDate)}</span>
                      {t.createdByName && <span className="text-gray-300">· por {t.createdByName}</span>}
                    </div>
                    {t.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{t.notes}</p>}
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
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
