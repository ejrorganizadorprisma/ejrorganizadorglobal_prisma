import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useManufacturersList,
  useCreateManufacturer,
  useUpdateManufacturer,
  useDeleteManufacturer,
  Manufacturer,
} from '../hooks/useManufacturers';

const emptyForm = { name: '', legalName: '', notes: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' };

export function ManufacturersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useManufacturersList({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useCreateManufacturer();
  const updateMutation = useUpdateManufacturer();
  const deleteMutation = useDeleteManufacturer();

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: Manufacturer) => {
    setEditing(m);
    setForm({
      name: m.name || '',
      legalName: m.legalName || '',
      notes: m.notes || '',
      status: m.status || 'ACTIVE',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome da indústria');
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success('Indústria atualizada com sucesso!');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Indústria cadastrada com sucesso!');
      }
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar indústria');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a indústria "${name}"?\nOs produtos/fornecedores vinculados ficarão sem indústria.`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Indústria excluída com sucesso!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir indústria');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const config = status === 'ACTIVE'
      ? { label: 'Ativa', className: 'bg-green-100 text-green-800' }
      : { label: 'Inativa', className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        <div className="px-3 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Indústrias</h1>
              <p className="hidden sm:block text-xs text-gray-500">
                Cadastro central de indústrias usado por produtos e fornecedores
              </p>
            </div>
            <button
              onClick={openCreate}
              className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Nova Indústria
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white shadow-sm border rounded-xl p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou código..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="INACTIVE">Inativa</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando indústrias...</p>
            </div>
          ) : (
            <>
              <div className="bg-white shadow-sm border overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] table-fixed text-[13px]">
                    <colgroup>
                      <col className="w-[110px]" />
                      <col />
                      <col className="hidden lg:table-column w-[34%]" />
                      <col className="w-[90px]" />
                      <col className="w-[72px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="hidden lg:table-cell px-3 py-2 text-left">Razão Social</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.data && data.data.length > 0 ? (
                        data.data.map((m) => (
                          <tr key={m.id} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 truncate tabular-nums" title={m.code || undefined}>{m.code || '-'}</td>
                            <td className="px-3 py-2 font-medium text-gray-800 truncate" title={[m.name, m.legalName].filter(Boolean).join(' · ')}>{m.name}</td>
                            <td className="hidden lg:table-cell px-3 py-2 text-gray-500 truncate" title={m.legalName || undefined}>{m.legalName || '-'}</td>
                            <td className="px-3 py-2">{getStatusBadge(m.status)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                                <button onClick={() => openEdit(m)} className="p-1 rounded-md transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Editar">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(m.id, m.name)} className="p-1 rounded-md transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                            {search || statusFilter ? (
                              <>
                                Nenhuma indústria encontrada com os filtros aplicados.
                                <button
                                  onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
                                  className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                                >
                                  Limpar filtros
                                </button>
                              </>
                            ) : (
                              <>
                                Nenhuma indústria cadastrada.
                                <button onClick={openCreate} className="block mx-auto mt-2 text-blue-600 hover:text-blue-800">
                                  Cadastrar primeira indústria
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {data && data.total > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.total)} de {data.total} indústrias
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Anterior
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Página {page} de {Math.ceil(data.total / 10)}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 10 >= data.total}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal create/edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editing ? 'Editar Indústria' : 'Nova Indústria'}
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome da indústria"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Razão Social</label>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Razão social (opcional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações (opcional)"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
