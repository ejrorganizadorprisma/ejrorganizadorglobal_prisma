import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseBudgets, useDeletePurchaseBudget, useConvertToOrder } from '../hooks/usePurchaseBudgets';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { toast } from 'sonner';
import { buildPurchaseMoney } from '../lib/purchaseMoney';
import { Plus, Eye, Pencil, Trash2, ShoppingCart, Truck } from 'lucide-react';
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
  const convertToOrder = useConvertToOrder();

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

  const handleConvert = async (id: string, title: string, alreadyOrder: boolean) => {
    const msg = alreadyOrder
      ? `Atualizar o pedido a partir do orçamento "${title}"?`
      : `Transformar o orçamento "${title}" em pedido? Ele passará a aparecer em Pedidos por Fornecedor.`;
    if (!window.confirm(msg)) return;
    try {
      await convertToOrder.mutateAsync(id);
      toast.success(alreadyOrder ? 'Pedido atualizado!' : 'Orçamento transformado em pedido!');
      navigate('/supplier-orders');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao transformar em pedido.');
    }
  };

  // Valores gravados em centavos de BRL — converte para a moeda do orçamento
  // usando as taxas do próprio orçamento (ver lib/purchaseMoney.ts).
  const formatCurrency = (centsBRL: number, budget?: any) =>
    buildPurchaseMoney(budget).fmt(centsBRL);

  // Total SEM os custos adicionais (subtotal). totalAmount já inclui o % de custos.
  const subtotalOf = (budget: any): number => {
    const pct = (budget.additionalCosts || []).reduce((s: number, c: any) => s + (c?.percentage || 0), 0);
    return pct > 0 ? Math.round((budget.totalAmount || 0) / (1 + pct / 100)) : (budget.totalAmount || 0);
  };

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
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">Orçamentos de Compra</h1>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/purchase-budgets/new')}
            className="shrink-0 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Orç. de Compra
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-2.5 rounded-xl shadow-sm border mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pesquisar</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Título ou número..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
          {/* Tabela — compacta, 1 linha por orçamento */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-[13px]">
                <colgroup>
                  <col className="w-[72px]" />
                  <col />
                  <col className="w-[150px]" />
                  <col className="w-[130px]" />
                  <col className="w-[118px]" />
                  <col className="w-[52px]" />
                  <col className="hidden xl:table-column w-[70px]" />
                  <col className="hidden xl:table-column w-[80px]" />
                  <col className="hidden xl:table-column w-[56px]" />
                  <col className="w-[132px]" />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">N.</th>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Fornecedor</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-1 py-2 text-center">Pedido</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Prior.</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Data</th>
                    <th className="hidden xl:table-cell px-1 py-2 text-center">Criador</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {budgets.map((budget: any) => (
                    <tr key={budget.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          title={budget.budgetNumber}
                          className="text-xs font-mono text-gray-500 cursor-default tabular-nums"
                        >
                          {budget.budgetNumber?.replace(/^ORC-/, '#') || '-'}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 font-medium text-gray-900 truncate"
                        title={`${budget.title}${budget.priority ? ` · Prioridade: ${PRIORITY_LABELS[budget.priority as BudgetPriority]}` : ''} · ${formatDate(budget.createdAt)}${budget.createdByUser?.name ? ` · ${budget.createdByUser.name}` : ''}`}
                      >
                        {budget.title}
                      </td>
                      <td className="px-3 py-2 text-gray-500 truncate" title={budget.supplierName || undefined}>
                        {budget.supplierName || '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(subtotalOf(budget), budget)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex max-w-full px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${STATUS_COLORS[budget.status as PurchaseBudgetStatus]}`}>
                          <span className="truncate">{STATUS_LABELS[budget.status as PurchaseBudgetStatus]}</span>
                        </span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        {budget.purchaseOrder ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${budget.purchaseOrder.id}`); }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                            title={`Pedido ${budget.purchaseOrder.orderNumber}`}
                          >
                            <ShoppingCart className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap">
                        <span className={PRIORITY_COLORS[budget.priority as BudgetPriority]}>
                          {PRIORITY_LABELS[budget.priority as BudgetPriority]}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap text-gray-500 tabular-nums">
                        {formatDate(budget.createdAt)}
                      </td>
                      <td className="hidden xl:table-cell px-1 py-2 text-center">
                        {budget.createdByUser?.name ? (
                          <span
                            title={budget.createdByUser.name}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold cursor-default"
                          >
                            {budget.createdByUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-0.5 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/purchase-budgets/${budget.id}`)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && ['DRAFT', 'PENDING', 'ORDERED'].includes(budget.status) && (
                            <button
                              onClick={() => navigate(`/purchase-budgets/${budget.id}/edit`)}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded-md"
                              title={budget.status === 'DRAFT' ? 'Editar' : 'Editar (ajustar valores)'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && ['DRAFT', 'PENDING'].includes(budget.status) && (
                            <button
                              onClick={() => handleConvert(budget.id, budget.title, false)}
                              disabled={convertToOrder.isPending}
                              className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                              title="Transformar em pedido"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {budget.status === 'ORDERED' && (
                            <span
                              className="p-1 rounded-md text-gray-300 cursor-default"
                              title="Já é um pedido — abra em Pedidos por Fornecedor"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {canDelete && !['PURCHASED', 'RECEIVED'].includes(budget.status) && (
                            <button
                              onClick={() => handleDelete(budget.id, budget.title)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
