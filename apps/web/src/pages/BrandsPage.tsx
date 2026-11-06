import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBrandsList,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  Brand,
} from '../hooks/useBrands';
import { useManufacturersList } from '../hooks/useManufacturers';

const emptyForm = { name: '', manufacturerId: '', notes: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' };

export function BrandsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useBrandsList({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
  });
  // Lista de indústrias para o select (não obrigatório)
  const { data: manufacturersData } = useManufacturersList({ limit: 1000, status: 'ACTIVE' });
  const manufacturers = manufacturersData?.data || [];

  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({
      name: b.name || '',
      manufacturerId: b.manufacturerId || '',
      notes: b.notes || '',
      status: b.status || 'ACTIVE',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome da marca');
      return;
    }
    const payload = { ...form, manufacturerId: form.manufacturerId || null };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        toast.success('Marca atualizada com sucesso!');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Marca cadastrada com sucesso!');
      }
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar marca');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a marca "${name}"?\nOs produtos vinculados ficarão sem marca.`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Marca excluída com sucesso!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir marca');
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
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Marcas</h1>
              <p className="hidden sm:block text-xs text-gray-500">
                Cadastro de marcas dos produtos (opcionalmente ligadas a uma indústria)
              </p>
            </div>
            <button
              onClick={openCreate}
              className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Nova Marca
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
              <p className="mt-2 text-sm text-gray-500">Carregando marcas...</p>
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
                        <th className="hidden lg:table-cell px-3 py-2 text-left">Indústria</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.data && data.data.length > 0 ? (
                        data.data.map((b) => (
                          <tr key={b.id} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 truncate tabular-nums" title={b.code || undefined}>{b.code || '-'}</td>
                            <td className="px-3 py-2 font-medium text-gray-800 truncate" title={[b.name, b.manufacturerName].filter(Boolean).join(' · ')}>{b.name}</td>
                            <td className="hidden lg:table-cell px-3 py-2 text-gray-500 truncate" title={b.manufacturerName || undefined}>{b.manufacturerName || '-'}</td>
                            <td className="px-3 py-2">{getStatusBadge(b.status)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                                <button onClick={() => openEdit(b)} className="p-1 rounded-md transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Editar">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(b.id, b.name)} className="p-1 rounded-md transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
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
                                Nenhuma marca encontrada com os filtros aplicados.
                                <button
                                  onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
                                  className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                                >
                                  Limpar filtros
                                </button>
                              </>
                            ) : (
                              <>
                                Nenhuma marca cadastrada.
                                <button onClick={openCreate} className="block mx-auto mt-2 text-blue-600 hover:text-blue-800">
                                  Cadastrar primeira marca
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
                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.total)} de {data.total} marcas
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
                  {editing ? 'Editar Marca' : 'Nova Marca'}
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
                    placeholder="Nome da marca"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Indústria (opcional)</label>
                  <select
                    value={form.manufacturerId}
                    onChange={(e) => setForm({ ...form, manufacturerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem indústria vinculada</option>
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
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
