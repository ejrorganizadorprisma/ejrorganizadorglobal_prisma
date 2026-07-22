import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ResolveNav } from '../../components/resolve/ResolveNav';
import { useCreateTicket } from '../../hooks/useResolve';
import { RESOLVE_PLATFORMS, TICKET_SEVERITIES, TICKET_TYPE_META } from '@ejr/shared-types';
import type { TicketType, TicketSeverity } from '@ejr/shared-types';

export function NewTicketPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useCreateTicket();

  const [type, setType] = useState<TicketType>((params.get('type') as TicketType) === 'SUGGESTION' ? 'SUGGESTION' : 'BUG');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState(params.get('platform') || 'ejrorganizador');
  const [url, setUrl] = useState(params.get('url') || '');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<TicketSeverity | ''>('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) { toast.error('Dê um título mais descritivo'); return; }
    if (description.trim().length < 10) { toast.error('Descreva com mais detalhes'); return; }
    try {
      const ticket = await create.mutateAsync({
        type, title: title.trim(), description: description.trim(), platform,
        url: url.trim() || undefined,
        severity: type === 'BUG' && severity ? severity : undefined,
      });
      toast.success('Demanda registrada!');
      navigate(`/resolve/t/${ticket.id}?created=1`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <ResolveNav />
      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">O que você quer registrar?</label>
          <div className="grid grid-cols-2 gap-3">
            {(['BUG', 'SUGGESTION'] as TicketType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`p-3 rounded-lg border text-left transition-colors ${type === t ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <span className="text-lg">{TICKET_TYPE_META[t].emoji}</span>
                <p className="font-medium text-sm mt-1">{TICKET_TYPE_META[t].label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{type === 'BUG' ? 'Qual o problema?' : 'Qual a sua ideia?'} *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160}
            placeholder={type === 'BUG' ? 'Ex.: Erro ao faturar pedido' : 'Ex.: Modo escuro'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Onde acontece? *</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            {RESOLVE_PLATFORMS.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Link do local (opcional)</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descreva com detalhes *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
            placeholder={type === 'BUG' ? 'O que você fez, o que esperava e o que aconteceu?' : 'Explique a ideia e o benefício.'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>

        {type === 'BUG' && (
          <div>
            <label className="block text-sm font-medium mb-2">O quanto atrapalha? (opcional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TICKET_SEVERITIES.map((s) => (
                <button key={s.value} type="button" onClick={() => setSeverity(severity === s.value ? '' : s.value)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${severity === s.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate('/resolve')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button type="submit" disabled={create.isPending} className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {create.isPending ? 'Enviando…' : 'Registrar demanda'}
          </button>
        </div>
      </form>
    </div>
  );
}
