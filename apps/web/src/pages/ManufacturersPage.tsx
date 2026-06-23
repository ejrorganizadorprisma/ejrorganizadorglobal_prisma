import { useState } from 'react';
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
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Indústrias</h1>
              <p className="mt-1 text-sm text-gray-500">
                Cadastro central de indústrias usado por produtos e fornecedores
              </p>
            </div>
            <button
              onClick={openCreate}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Nova Indústria
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou código..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razão Social</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data?.data && data.data.length > 0 ? (
                        data.data.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.code || '-'}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{m.legalName || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(m.status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-900 mr-4">
                                Editar
                              </button>
                              <button onClick={() => handleDelete(m.id, m.name)} className="text-red-600 hover:text-red-900">
                                Excluir
                              </button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome da indústria"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Razão social (opcional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
