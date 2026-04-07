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
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
          Pendente
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Rejeitado
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Clientes</h1>
          {isAdmin && pendingCount > 0 && (
            <button
              onClick={() => setApprovalStatus('PENDING')}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm hover:bg-amber-200"
            >
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              {pendingCount} pendente(s) de aprovação
            </button>
          )}
        </div>
        <button
          onClick={() => navigate('/customers/new')}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pesquisar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, e-mail ou documento..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="INDIVIDUAL">Pessoa Física</option>
              <option value="BUSINESS">Pessoa Jurídica</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status de aprovação
              </label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as ApprovalFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.name}
                    {customer.email && (
                      <div className="text-xs text-gray-500">{customer.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        customer.type === 'INDIVIDUAL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {customer.type === 'INDIVIDUAL' ? 'PF' : 'PJ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.document ? formatDocument(customer.document, customer.type) : null}
                    {customer.ci && (
                      <span className="text-xs text-gray-500">
                        {customer.document ? ' · ' : ''}CI: {customer.ci}
                      </span>
                    )}
                    {customer.ruc && (
                      <span className="text-xs text-gray-500">
                        {customer.document || customer.ci ? ' · ' : ''}RUC: {customer.ruc}
                      </span>
                    )}
                    {!customer.document && !customer.ci && !customer.ruc && '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.responsibleUserName ?? (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {renderApprovalBadge(customer.approvalStatus)}
                    {customer.approvalStatus === 'REJECTED' && customer.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={customer.rejectionReason}>
                        {customer.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isAdmin && customer.approvalStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => openApproveModal(customer)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Aprovar"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: customer.id, name: customer.name })}
                          className="text-red-600 hover:text-red-900 mr-3"
                          title="Rejeitar"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/customers/${customer.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Editar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {data?.pagination && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Mostrando página {data.pagination.page} de {data.pagination.totalPages} (
            {data.pagination.total} clientes)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
