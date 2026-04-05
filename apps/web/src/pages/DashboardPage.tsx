import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '../hooks/useDashboard';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { AppPage } from '@ejr/shared-types';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useFinancialSummary } from '../hooks/useFinancial';
import { useSaleStats } from '../hooks/useSales';
import { Wallet, ShoppingCart } from 'lucide-react';

export function DashboardPage() {
  const { formatPrice } = useFormatPrice();
  const permissionCheck = useRequirePermission({
    page: AppPage.DASHBOARD,
    message: 'Você não tem permissão para acessar o dashboard.'
  });
  if (permissionCheck) return permissionCheck;

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { data: financialSummary } = useFinancialSummary();
  const { data: saleStats } = useSaleStats();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">EJR Organizador Global - Prisma</h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationDropdown />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
              Bem-vindo, {user?.name}!
            </h2>
            <button
              onClick={() => navigate('/overview')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-medium transition-colors"
            >
              📊 Visão Geral Completa do Sistema
            </button>
          </div>

          {/* KPIs Principais */}
          {!isLoading && metrics && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-500 mb-1">Total Produtos</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-600">{metrics.totalProducts}</div>
                </div>
                <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-500 mb-1">Total Clientes</div>
                  <div className="text-2xl lg:text-3xl font-bold text-green-600">{metrics.totalCustomers}</div>
                </div>
                <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-500 mb-1">Valor do Estoque</div>
                  <div className="text-xl lg:text-2xl font-bold text-emerald-600">
                    {formatPrice(metrics.totalStockValue)}
                  </div>
                </div>
                <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                  <div className="text-sm text-gray-500 mb-1">Estoque Baixo</div>
                  <div className="text-2xl lg:text-3xl font-bold text-red-600">{metrics.lowStockProducts?.length || 0}</div>
                </div>
              </div>

              {/* Métricas de Vendas */}
              {saleStats && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-600" />
                      Vendas
                    </h3>
                    <button
                      onClick={() => navigate('/sales')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver todas →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
                      <div className="text-sm text-gray-500 mb-1">Total de Vendas</div>
                      <div className="text-2xl font-bold text-gray-900">{saleStats.totalSales}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-emerald-500">
                      <div className="text-sm text-gray-500 mb-1">Faturamento</div>
                      <div className="text-xl font-bold text-emerald-600">{formatPrice(saleStats.totalRevenue)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                      <div className="text-sm text-gray-500 mb-1">Recebido</div>
                      <div className="text-xl font-bold text-green-600">{formatPrice(saleStats.totalPaid)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                      <div className="text-sm text-gray-500 mb-1">Pendente</div>
                      <div className="text-xl font-bold text-yellow-600">{formatPrice(saleStats.totalPending)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                      <div className="text-sm text-gray-500 mb-1">Ticket Médio</div>
                      <div className="text-xl font-bold text-blue-600">{formatPrice(saleStats.averageTicket)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Métricas de Orçamentos */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Orçamentos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="text-sm text-gray-500 mb-1">Total</div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.totalQuotes}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-500 mb-1">Pendentes</div>
                    <div className="text-2xl font-bold text-yellow-600">{metrics.pendingQuotes}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <div className="text-sm text-gray-500 mb-1">Aprovados</div>
                    <div className="text-2xl font-bold text-green-600">{metrics.approvedQuotes}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Resumo Financeiro */}
          {financialSummary && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                Financeiro
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => navigate('/financial/receivables')} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-green-500 text-left hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-500 mb-1">A Receber</div>
                  <div className="text-xl font-bold text-green-600">{formatPrice(financialSummary.totalReceivable)}</div>
                </button>
                <button onClick={() => navigate('/financial/receivables?status=OVERDUE')} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-red-500 text-left hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-500 mb-1">Atrasado</div>
                  <div className="text-xl font-bold text-red-600">{formatPrice(financialSummary.overdueReceivable)}</div>
                </button>
                <button onClick={() => navigate('/financial')} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-blue-500 text-left hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-500 mb-1">Saldo Previsto</div>
                  <div className={`text-xl font-bold ${financialSummary.projectedBalance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {formatPrice(financialSummary.projectedBalance)}
                  </div>
                </button>
                <button onClick={() => navigate('/sales')} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 text-left hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-500 mb-1">Vendas Hoje</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {financialSummary.salesToday ?? 0}
                    {financialSummary.revenueTodayTotal ? (
                      <span className="text-sm font-normal text-gray-400 ml-2">({formatPrice(financialSummary.revenueTodayTotal)})</span>
                    ) : null}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Menu Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => navigate('/products')}
              className="bg-white p-4 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Produtos</h3>
              <p className="text-sm text-gray-600">Gerenciar produtos e estoque</p>
            </button>
            <button
              onClick={() => navigate('/customers')}
              className="bg-white p-4 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Clientes</h3>
              <p className="text-sm text-gray-600">Gerenciar clientes</p>
            </button>
            <button
              onClick={() => navigate('/quotes')}
              className="bg-white p-4 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Orçamentos</h3>
              <p className="text-sm text-gray-600">Criar e gerenciar orçamentos</p>
            </button>
            <button
              onClick={() => navigate('/suppliers')}
              className="bg-white p-4 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Fornecedores</h3>
              <p className="text-sm text-gray-600">Gerenciar fornecedores</p>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="bg-white p-4 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Relatórios</h3>
              <p className="text-sm text-gray-600">Visualizar relatórios e análises</p>
            </button>
            <button
              onClick={() => navigate('/service-orders')}
              className="bg-white p-4 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Ordens de Serviço</h3>
              <p className="text-sm text-gray-600">Gerenciar ordens de serviço</p>
            </button>
          </div>

          {/* Low Stock Alert */}
          {metrics?.lowStockProducts && metrics.lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Atenção!</strong> {metrics.lowStockProducts.length} produto(s) com estoque baixo
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
