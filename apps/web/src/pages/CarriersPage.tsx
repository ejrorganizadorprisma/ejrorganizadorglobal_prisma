import { useState } from 'react';
import { toast } from 'sonner';
import { Truck, Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { useCarriersList, useCreateCarrier, useUpdateCarrier, useDeleteCarrier } from '../hooks/useCarriers';
import type { Carrier } from '@ejr/shared-types';

const empty = { name: '', document: '', phone: '', email: '', contactName: '', city: '', notes: '', status: 'ACTIVE' as const };

export default function CarriersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCarriersList({ search: search || undefined, limit: 200 });
  const create = useCreateCarrier();
  const update = useUpdateCarrier();
  const del = useDeleteCarrier();

  const [editing, setEditing] = useState<Carrier | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Carrier) => {
    setEditing(c);
    setForm({ name: c.name, document: c.document || '', phone: c.phone || '', email: c.email || '', contactName: c.contactName || '', city: c.city || '', notes: c.notes || '', status: c.status });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: form });
      else await create.mutateAsync(form);
      toast.success(editing ? 'Transportadora atualizada' : 'Transportadora cadastrada');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const remove = async (c: Carrier) => {
    if (!confirm(`Remover a transportadora "${c.name}"?`)) return;
    try { await del.mutateAsync(c.id); toast.success('Removida'); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erro ao remover'); }
  };

  const list = data?.data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Transportadoras</h1>
            <p className="text-sm text-slate-500">Cadastro usado na expedição das vendas.</p>
          </div>
        </div>
        <button onClick={openNew} className="px-4 py-2 text-sm font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, documento, cidade…" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">Nenhuma transportadora cadastrada.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.code}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}</span>
              </div>
              <div className="mt-2 text-sm text-slate-600 space-y-0.5">
                {c.document && <p>Doc: {c.document}</p>}
                {c.phone && <p>Tel: {c.phone}</p>}
                {c.city && <p>{c.city}</p>}
                {c.contactName && <p className="text-xs text-slate-400">Contato: {c.contactName}</p>}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(c)} className="text-xs font-medium text-cyan-700 hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Editar</button>
                <button onClick={() => remove(c)} className="text-xs font-medium text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Editar transportadora' : 'Nova transportadora'}</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome *" className="col-span-2" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Documento (CNPJ/RUC)" value={form.document} onChange={(v) => setForm({ ...form, document: v })} />
              <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Contato" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
              <Field label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Situação</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                  <option value="ACTIVE">Ativa</option>
                  <option value="INACTIVE">Inativa</option>
                </select>
              </div>
              <Field label="Observações" className="col-span-2" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={save} disabled={create.isPending || update.isPending} className="px-5 py-2 text-sm font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
    </div>
  );
}
