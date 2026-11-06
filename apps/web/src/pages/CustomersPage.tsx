import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCustomers,
  useDeleteCustomer,
  useApproveCustomer,
  useRejectCustomer,
} from '../hooks/useCustomers';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Users, Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';

type ApprovalFilter = '' | 'PENDING' | 'APPROVED' | 'REJECTED';

export function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = !!user && ['OWNER', 'DIRECTOR', 'MANAGER'].includes(user.role);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<any>('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalFilter>('');

  const { data, isLoading, error } = useCustomers({
    page,
    limit: 10,
    search: search || undefined,
    type: type || undefined,
    approvalStatus: approvalStatus || undefined,
  });

  const deleteCustomer = useDeleteCustomer();
  const approveCustomer = useApproveCustomer();
  const rejectCustomer = useRejectCustomer();

  // Vendedores disponiveis para reatribuir durante aprovacao
  const { data: sellersData } = useUsers(
    isAdmin ? ({ role: 'SALESPERSON' as any, limit: 100, isActive: true }) : {}
  );
  const sellers = (isAdmin ? sellersData?.data : undefined) ?? [];

  // Modal de aprovacao
  const [approveModal, setApproveModal] = useState<{
    id: string;
    name: string;
    currentResponsible: string | null;
  } | null>(null);
  const [selectedResponsible, setSelectedResponsible] = useState<string>('');

  // Modal de rejeicao
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${name}"?`)) {
      try {
        await deleteCustomer.mutateAsync(id);
        toast.success('Cliente excluído');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir cliente');
      }
    }
  };

  const openApproveModal = (customer: any) => {
    setApproveModal({
      id: customer.id,
      name: customer.name,
      currentResponsible: customer.responsibleUserId ?? null,
    });
    setSelectedResponsible(customer.responsibleUserId ?? '');
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    try {
      await approveCustomer.mutateAsync({
        id: approveModal.id,
        responsibleUserId: selectedResponsible || null,
      });
      toast.success(`Cliente "${approveModal.name}" aprovado`);
      setApproveModal(null);
      setSelectedResponsible('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao aprovar cliente');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    try {
      await rejectCustomer.mutateAsync({
        id: rejectModal.id,
        reason: rejectReason.trim(),
      });
      toast.success(`Cliente "${rejectModal.name}" rejeitado`);
      setRejectModal(null);
      setRejectReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao rejeitar cliente');
    }
  };

  const formatDocument = (document: string | null | undefined, type: string) => {
    if (!document) return '-';
    if (type === 'INDIVIDUAL') {
      return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const renderApprovalBadge = (status: string | undefined) => {
    const s = status ?? 'APPROVED';
    if (s === 'PENDING') {
      return (
        <span className="px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-full whitespace-nowrap bg-amber-100 text-amber-800">
          Pendente
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-full whitespace-nowrap bg-red-100 text-red-800">
          Rejeitado
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-full whitespace-nowrap bg-green-100 text-green-800">
        Aprovado
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Erro ao carregar clientes</div>
      </div>
    );
  }

  const pendingCount = data?.data.filter((c: any) => c.approvalStatus === 'PENDING').length ?? 0;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Clientes</h1>
            {isAdmin && pendingCount > 0 && (
              <button
                onClick={() => setApprovalStatus('PENDING')}
                className="mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[11px] font-medium hover:bg-amber-200"
              >
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                {pendingCount} pendente(s) de aprovação
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/customers/new')}
          className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Cliente</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-2.5 rounded-xl shadow-sm border mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              aria-label="Pesquisar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, e-mail ou documento..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:w-44">
            <select
              aria-label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os tipos</option>
              <option value="INDIVIDUAL">Pessoa Física</option>
              <option value="BUSINESS">Pessoa Jurídica</option>
            </select>
          </div>

          {isAdmin && (
            <div className="sm:w-48">
              <select
                aria-label="Status de aprovação"
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as ApprovalFilter)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabela — compacta, 1 linha por cliente */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-[13px]">
            <colgroup>
              <col />
              <col className="w-[56px]" />
              <col className="w-[190px]" />
              <col className="hidden xl:table-column w-[150px]" />
              <col className="w-[104px]" />
              <col className="w-[180px]" />
            </colgroup>
            <thead>
              <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="hidden xl:table-cell px-3 py-2 text-left">Vendedor</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((customer: any) => {
                const docParts = [
                  customer.document ? formatDocument(customer.document, customer.type) : null,
                  customer.ci ? `CI: ${customer.ci}` : null,
                  customer.ruc ? `RUC: ${customer.ruc}` : null,
                ].filter(Boolean).join(' · ');
                return (
                <tr key={customer.id} className="hover:bg-blue-50/40 transition-colors">
                  <td
                    className="px-3 py-2 font-medium text-gray-900 truncate"
                    title={[customer.name, customer.email, customer.responsibleUserName ? `Vendedor: ${customer.responsibleUserName}` : null].filter(Boolean).join(' · ')}
                  >
                    {customer.name}
                    {customer.email && <span className="ml-1.5 text-[11px] font-normal text-gray-400">{customer.email}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-1.5 py-0.5 inline-flex text-[11px] font-semibold rounded-full ${
                        customer.type === 'INDIVIDUAL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {customer.type === 'INDIVIDUAL' ? 'PF' : 'PJ'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700 truncate tabular-nums" title={docParts || undefined}>
                    {docParts || '-'}
                  </td>
                  <td className="hidden xl:table-cell px-3 py-2 text-gray-500 truncate" title={customer.responsibleUserName || undefined}>
                    {customer.responsibleUserName ?? (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2"
                    title={customer.approvalStatus === 'REJECTED' && customer.rejectionReason ? `Motivo: ${customer.rejectionReason}` : undefined}
                  >
                    {renderApprovalBadge(customer.approvalStatus)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                      {isAdmin && customer.approvalStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={() => openApproveModal(customer)}
                            className="mr-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white bg-green-600 hover:bg-green-700"
                            title="Aprovar"
                          >
                            <Check className="w-3 h-3" /> Aprovar
                          </button>
                          <button
                            onClick={() => setRejectModal({ id: customer.id, name: customer.name })}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            title="Rejeitar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => navigate(`/customers/${customer.id}/edit`)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
      </div>

      {/* Paginação */}
      {data?.pagination && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            Mostrando página {data.pagination.page} de {data.pagination.totalPages} (
            {data.pagination.total} clientes)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modal de Aprovação */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Aprovar Cliente</h2>
            <p className="text-gray-600 mb-4">
              Aprovar o cliente <strong>{approveModal.name}</strong>? Atribua um vendedor
              responsável (opcional — o cliente poderá ser editado por qualquer vendedor no app
              apenas se atribuído).
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendedor Responsável
            </label>
            <select
              value={selectedResponsible}
              onChange={(e) => setSelectedResponsible(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">— Sem vendedor (apenas web) —</option>
              {sellers.map((seller: any) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} ({seller.email})
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setApproveModal(null);
                  setSelectedResponsible('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={approveCustomer.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {approveCustomer.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Rejeitar Cliente</h2>
            <p className="text-gray-600 mb-4">
              Rejeitar o cliente <strong>{rejectModal.name}</strong>? Informe o motivo da
              rejeição:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={rejectCustomer.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {rejectCustomer.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
