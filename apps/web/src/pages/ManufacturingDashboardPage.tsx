import { useState } from 'react';
import {
  Package,
  ShoppingCart,
  Factory,
  Lock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFormatPrice } from '../hooks/useFormatPrice';

// Imports dos hooks
import { useStockReservations } from '@/hooks/useStockReservations';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useGoodsReceipts } from '@/hooks/useGoodsReceipts';
import { useProductionOrders } from '@/hooks/useProductionOrders';

export default function ManufacturingDashboardPage() {
  const navigate = useNavigate();
  const { formatPrice } = useFormatPrice();
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  // Buscar dados de todos os módulos
  const { data: reservations, isLoading: loadingReservations, error: errorReservations } = useStockReservations({
    status: 'ACTIVE'
  });
  const { data: suppliers, isLoading: loadingSuppliers, error: errorSuppliers } = useSuppliers();
  const { data: purchaseOrders, isLoading: loadingPOs, error: errorPOs } = usePurchaseOrders();
  const { data: receipts, isLoading: loadingReceipts, error: errorReceipts } = useGoodsReceipts();
  const { data: productionOrders, isLoading: loadingProduction, error: errorProduction } = useProductionOrders();

  // Verificar se há erros (tabelas não existem)
  const hasErrors = errorReservations || errorSuppliers || errorPOs || errorReceipts || errorProduction;

  // Calcular métricas
  const metrics = {
    reservations: {
      total: reservations?.data?.length || 0,
      value: reservations?.data?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0,
    },
    suppliers: {
      total: suppliers?.data?.length || 0,
      active: suppliers?.data?.filter((s: any) => s.status === 'ACTIVE').length || 0,
    },
    purchaseOrders: {
      total: purchaseOrders?.data?.length || 0,
      pending: purchaseOrders?.data?.filter((po: any) =>
        ['DRAFT', 'SENT'].includes(po.status)
      ).length || 0,
      totalValue: purchaseOrders?.data?.reduce((sum: number, po: any) =>
        sum + (po.totalAmount || 0), 0
      ) || 0,
    },
    receipts: {
      total: receipts?.data?.length || 0,
      pending: receipts?.data?.filter((r: any) =>
        r.status === 'PENDING'
      ).length || 0,
    },
    production: {
      total: productionOrders?.data?.length || 0,
      inProgress: productionOrders?.data?.filter((po: any) =>
        po.status === 'IN_PROGRESS'
      ).length || 0,
      completed: productionOrders?.data?.filter((po: any) =>
        po.status === 'COMPLETED'
      ).length || 0,
      totalPlanned: productionOrders?.data?.reduce((sum: number, po: any) =>
        sum + (po.quantityPlanned || 0), 0
      ) || 0,
      totalProduced: productionOrders?.data?.reduce((sum: number, po: any) =>
        sum + (po.quantityProduced || 0), 0
      ) || 0,
    },
  };

  const isLoading =
    loadingReservations ||
    loadingSuppliers ||
    loadingPOs ||
    loadingReceipts ||
    loadingProduction;

  return (
    <div className="space-y-6">
      {/* Aviso se houver problemas de conexão - TABELAS JÁ EXISTEM! */}
      {hasErrors && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Carregando dados de manufatura...</h3>
              <p className="text-blue-700 text-sm mt-1">
                Alguns módulos podem demorar para carregar. Se o problema persistir, <strong>recarregue a página</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard de Manufatura</h1>
          <p className="text-gray-500 mt-1">
            Visão geral de compras, produção e estoque
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      )}

      {/* Main Cards Grid */}
      {!isLoading && (
        <>
          {/* Row 1: Main Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
            {/* Stock Reservations */}
            <div
              className="bg-white rounded-lg shadow p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/stock-reservations')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reservas Ativas</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-2">
                    {metrics.reservations.total}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {metrics.reservations.value} unidades
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Lock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Suppliers */}
            <div
              className="bg-white rounded-lg shadow p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/suppliers')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fornecedores</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-2">
                    {metrics.suppliers.total}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {metrics.suppliers.active} ativos
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Purchase Orders */}
            <div
              className="bg-white rounded-lg shadow p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/purchase-orders')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ordens de Compra</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-2">
                    {metrics.purchaseOrders.total}
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    {metrics.purchaseOrders.pending} pendentes
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Goods Receipts */}
            <div
              className="bg-white rounded-lg shadow p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/goods-receipts')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recebimentos</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-2">
                    {metrics.receipts.total}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    {metrics.receipts.pending} para inspeção
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Production Orders */}
            <div
              className="bg-white rounded-lg shadow p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/production-orders')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Produção</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-2">
                    {metrics.production.inProgress}
                  </p>
                  <p className="text-sm text-indigo-600 mt-1">
                    em andamento
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Factory className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Detailed Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Orders Details */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Ordens de Compra Recentes
                </h2>
                <button
                  onClick={() => navigate('/purchase-orders')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Ver todas →
                </button>
              </div>

              {purchaseOrders?.data?.slice(0, 5).map((po: any) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{po.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {po.supplier?.name || 'Fornecedor'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatPrice(po.totalAmount || 0)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        po.status === 'DRAFT'
                          ? 'bg-gray-100 text-gray-800'
                          : po.status === 'SENT'
                          ? 'bg-blue-100 text-blue-800'
                          : po.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                </div>
              ))}

              {(!purchaseOrders?.data || purchaseOrders.data.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma ordem de compra</p>
                </div>
              )}
            </div>

            {/* Production Orders Details */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Ordens de Produção Ativas
                </h2>
                <button
                  onClick={() => navigate('/production-orders')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Ver todas →
                </button>
              </div>

              {productionOrders?.data
                ?.filter((po: any) => ['IN_PROGRESS', 'RELEASED'].includes(po.status))
                .slice(0, 5)
                .map((po: any) => {
                  const progress = po.quantityPlanned > 0
                    ? (po.quantityProduced / po.quantityPlanned) * 100
                    : 0;

                  return (
                    <div
                      key={po.id}
                      className="py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/production-orders/${po.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{po.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {po.product?.name || 'Produto'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            po.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {po.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {po.quantityProduced}/{po.quantityPlanned}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {(!productionOrders?.data ||
                productionOrders.data.filter((po: any) =>
                  ['IN_PROGRESS', 'RELEASED'].includes(po.status)
                ).length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Factory className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma produção ativa</p>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Alerts and Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerts */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Alertas e Pendências
              </h2>

              <div className="space-y-3">
                {metrics.purchaseOrders.pending > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {metrics.purchaseOrders.pending} OC pendentes
                      </p>
                      <p className="text-xs text-gray-600">
                        Aguardando envio ou confirmação
                      </p>
                    </div>
                  </div>
                )}

                {metrics.receipts.pending > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {metrics.receipts.pending} recebimentos para inspeção
                      </p>
                      <p className="text-xs text-gray-600">
                        Aguardando controle de qualidade
                      </p>
                    </div>
                  </div>
                )}

                {metrics.production.inProgress > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Factory className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {metrics.production.inProgress} ordens em produção
                      </p>
                      <p className="text-xs text-gray-600">
                        Acompanhe o progresso
                      </p>
                    </div>
                  </div>
                )}

                {metrics.purchaseOrders.pending === 0 &&
                  metrics.receipts.pending === 0 &&
                  metrics.production.inProgress === 0 && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Tudo em dia!
                        </p>
                        <p className="text-xs text-gray-600">
                          Sem pendências no momento
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Production Statistics */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Estatísticas de Produção
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Planejado</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.production.totalPlanned} unidades
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Produzido</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.production.totalProduced} unidades
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          metrics.production.totalPlanned > 0
                            ? (metrics.production.totalProduced /
                                metrics.production.totalPlanned) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ordens concluídas</span>
                    <span className="text-sm font-medium text-green-600">
                      {metrics.production.completed}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total de ordens</span>
                  <span className="text-sm font-medium text-gray-900">
                    {metrics.production.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase Value */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Valor de Compras
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total em OCs</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                      {formatPrice(metrics.purchaseOrders.totalValue || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ordens ativas</span>
                    <span className="font-medium text-gray-900">
                      {metrics.purchaseOrders.total}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor médio</span>
                    <span className="font-medium text-gray-900">
                      {metrics.purchaseOrders.total > 0
                        ? formatPrice(
                            Math.round(metrics.purchaseOrders.totalValue / metrics.purchaseOrders.total)
                          )
                        : formatPrice(0)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/purchase-orders/new')}
                  className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Nova Ordem de Compra
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ações Rápidas
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <button
                onClick={() => navigate('/suppliers/new')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Users className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  Novo Fornecedor
                </span>
              </button>

              <button
                onClick={() => navigate('/purchase-orders/new')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <ShoppingCart className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">Nova OC</span>
              </button>

              <button
                onClick={() => navigate('/goods-receipts/new')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <Package className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  Recebimento
                </span>
              </button>

              <button
                onClick={() => navigate('/production-orders/new')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <Factory className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  Nova Produção
                </span>
              </button>

              <button
                onClick={() => navigate('/stock-reservations')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
              >
                <Lock className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">Reservas</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
