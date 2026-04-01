import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseBudgets, useDeletePurchaseBudget } from '../hooks/usePurchaseBudgets';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { toast } from 'sonner';
import { formatPriceValue } from '../hooks/useFormatPrice';
import { Plus, Eye, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { AppPage, type PurchaseBudgetStatus, type BudgetPriority } from '@ejr/shared-types';

const STATUS_LABELS: Record<PurchaseBudgetStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  ORDERED: 'Pedido',
  PURCHASED: 'Comprado',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<PurchaseBudgetStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  ORDERED: 'bg-indigo-100 text-indigo-800',
  PURCHASED: 'bg-green-100 text-green-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

const PRIORITY_LABELS: Record<BudgetPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_COLORS: Record<BudgetPriority, string> = {
  LOW: 'text-gray-500',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600 font-semibold',
  URGENT: 'text-red-600 font-bold',
};

export function PurchaseBudgetsPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.PURCHASE_BUDGETS,
    message: 'Você não tem permissão para acessar Orçamentos de Compra.',
  });
  if (permissionCheck) return permissionCheck;

  const navigate = useNavigate();
  const { hasActionPermission } = usePagePermissions();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  const canCreate = hasActionPermission(AppPage.PURCHASE_BUDGETS, 'create');
  const canEdit = hasActionPermission(AppPage.PURCHASE_BUDGETS, 'edit');
  const canDelete = hasActionPermission(AppPage.PURCHASE_BUDGETS, 'delete');

  const { data, isLoading } = usePurchaseBudgets({
    page,
    limit: 15,
    status: (statusFilter || undefined) as PurchaseBudgetStatus | undefined,
    priority: (priorityFilter || undefined) as BudgetPriority | undefined,
    search: search || undefined,
  });

  const deleteBudget = useDeletePurchaseBudget();

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Excluir o orçamento de compra "${title}"?`)) {
      try {
        await deleteBudget.mutateAsync(id);
        toast.success('Orçamento de compra excluído.');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao excluir.');
      }
    }
  };

  const formatCurrency = (value: number, currency: string = 'BRL') =>
    formatPriceValue(value, (currency || 'BRL') as 'BRL' | 'USD' | 'PYG');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setSearch('');
    setPage(1);
  };

  const budgets = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Orçamentos de Compra</h1>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/purchase-budgets/new')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Orç. de Compra
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Título ou número..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {(statusFilter || priorityFilter || search) && (
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800">
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Tabela */}
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">N.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">Pedido</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prior.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">Criador</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budgets.map((budget: any) => (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap w-16">
                        <span
                          title={budget.budgetNumber}
                          className="text-xs font-mono text-gray-500 cursor-default"
                        >
                          {budget.budgetNumber?.replace(/^ORC-/, '#') || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                        {budget.title}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 max-w-[150px] truncate">
                        {budget.supplierName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(budget.totalAmount, budget.currency)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${STATUS_COLORS[budget.status as PurchaseBudgetStatus]}`}>
                          {STATUS_LABELS[budget.status as PurchaseBudgetStatus]}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-center">
                        {budget.purchaseOrder ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${budget.purchaseOrder.id}`); }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                            title={`Pedido ${budget.purchaseOrder.orderNumber}`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={PRIORITY_COLORS[budget.priority as BudgetPriority]}>
                          {PRIORITY_LABELS[budget.priority as BudgetPriority]}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(budget.createdAt)}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-center">
                        {budget.createdByUser?.name ? (
                          <span
                            title={budget.createdByUser.name}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold cursor-default"
                          >
                            {budget.createdByUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => navigate(`/purchase-budgets/${budget.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && budget.status === 'DRAFT' && (
                            <button
                              onClick={() => navigate(`/purchase-budgets/${budget.id}/edit`)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && !['PURCHASED', 'RECEIVED'].includes(budget.status) && (
                            <button
                              onClick={() => handleDelete(budget.id, budget.title)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {budgets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum orçamento de compra encontrado.
              </div>
            )}
          </div>

          {/* Paginação */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} orçamentos de compra)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
