import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSuppliers, useDeleteSupplier, Supplier } from '../hooks/useSuppliers';
import { toast } from 'sonner';

export function SuppliersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'BLOCKED' | ''>('');

  const { data, isLoading } = useSuppliers({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const deleteSupplier = useDeleteSupplier();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      try {
        await deleteSupplier.mutateAsync(id);
        toast.success('Fornecedor excluído com sucesso!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir fornecedor');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Inativo', className: 'bg-gray-100 text-gray-800' },
      BLOCKED: { label: 'Bloqueado', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return <span className="text-gray-400 text-xs whitespace-nowrap">Sem avaliação</span>;

    return (
      <div className="flex items-center" title={`${rating} de 5`}>
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        <div className="px-3 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Fornecedores</h1>
              <p className="hidden sm:block text-xs text-gray-500">
                Gerencie seus fornecedores e suas informações
              </p>
            </div>
            <button
              onClick={() => navigate('/suppliers/new')}
              className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Novo Fornecedor
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white shadow-sm border rounded-xl p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nome, código ou documento..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="BLOCKED">Bloqueado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando fornecedores...</p>
            </div>
          ) : (
            <>
              <div className="bg-white shadow-sm border overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] table-fixed text-[13px]">
                  <colgroup>
                    <col className="w-[96px]" />
                    <col />
                    <col className="hidden xl:table-column w-[200px]" />
                    <col className="hidden lg:table-column w-[130px]" />
                    <col className="hidden xl:table-column w-[140px]" />
                    <col className="w-[96px]" />
                    <col className="w-[90px]" />
                    <col className="w-[72px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="hidden xl:table-cell px-3 py-2 text-left">Email</th>
                      <th className="hidden lg:table-cell px-3 py-2 text-left">Telefone</th>
                      <th className="hidden xl:table-cell px-3 py-2 text-left">Indústria</th>
                      <th className="px-3 py-2 text-left">Avaliação</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.data && data.data.length > 0 ? (
                      data.data.map((supplier: Supplier) => (
                        <tr key={supplier.id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900 truncate tabular-nums" title={supplier.code}>
                            {supplier.code}
                          </td>
                          <td
                            className="px-3 py-2 font-medium text-gray-800 truncate"
                            title={[
                              supplier.name,
                              supplier.legalName && supplier.legalName !== supplier.name ? supplier.legalName : null,
                              supplier.email,
                              supplier.phone,
                              supplier.manufacturer,
                            ].filter(Boolean).join(' · ')}
                          >
                            {supplier.name}
                            {supplier.legalName && supplier.legalName !== supplier.name && (
                              <span className="ml-1.5 text-gray-400 font-normal">{supplier.legalName}</span>
                            )}
                          </td>
                          <td className="hidden xl:table-cell px-3 py-2 text-gray-500 truncate" title={supplier.email || undefined}>
                            {supplier.email || '-'}
                          </td>
                          <td className="hidden lg:table-cell px-3 py-2 text-gray-500 whitespace-nowrap truncate tabular-nums" title={supplier.phone || undefined}>
                            {supplier.phone || '-'}
                          </td>
                          <td className="hidden xl:table-cell px-3 py-2 text-gray-700 truncate" title={supplier.manufacturer || undefined}>
                            {supplier.manufacturer || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {getRatingStars(supplier.rating)}
                          </td>
                          <td className="px-3 py-2">
                            {getStatusBadge(supplier.status)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                                className="p-1 rounded-md transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                title="Ver / Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(supplier.id, supplier.name)}
                                className="p-1 rounded-md transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                          {search || statusFilter ? (
                            <>
                              Nenhum fornecedor encontrado com os filtros aplicados.
                              <button
                                onClick={() => {
                                  setSearch('');
                                  setStatusFilter('');
                                  setPage(1);
                                }}
                                className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                              >
                                Limpar filtros
                              </button>
                            </>
                          ) : (
                            <>
                              Nenhum fornecedor cadastrado.
                              <button
                                onClick={() => navigate('/suppliers/new')}
                                className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                              >
                                Cadastrar primeiro fornecedor
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
                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, data.total)} de {data.total} fornecedores
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
    </div>
  );
}
