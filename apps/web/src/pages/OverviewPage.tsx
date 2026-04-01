import { useNavigate } from 'react-router-dom';
import { useCompleteOverview } from '../hooks/useOverview';
import { useFormatPrice } from '../hooks/useFormatPrice';

export function OverviewPage() {
  const navigate = useNavigate();
  const { data: overview, isLoading } = useCompleteOverview();
  const { formatPrice: formatCurrency } = useFormatPrice();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando visão geral...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8">Visão Geral Completa do Sistema</h1>

        {/* ===== PRODUTOS ===== */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Produtos</h2>
            <button
              onClick={() => navigate('/products')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver todos →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-500 mb-1">Total de Produtos</div>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900">{overview?.products.total || 0}</div>
            </div>
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow border-l-4 border-emerald-500">
              <div className="text-sm text-gray-500 mb-1">Valor do Estoque</div>
              <div className="text-xl lg:text-2xl font-bold text-emerald-600">
                {formatCurrency(overview?.products.totalStockValue || 0)}
              </div>
            </div>
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-500 mb-1">Receita Potencial</div>
              <div className="text-xl lg:text-2xl font-bold text-green-600">
                {formatCurrency(overview?.products.totalPotentialRevenue || 0)}
              </div>
            </div>
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-sm text-gray-500 mb-1">Margem de Lucro</div>
              <div className="text-xl lg:text-2xl font-bold text-purple-600">
                {overview?.products.profitMargin?.toFixed(1) || 0}%
              </div>
            </div>
          </div>

          {overview?.products.lowStock && overview.products.lowStock.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">
                ⚠️ Produtos com Estoque Baixo ({overview.products.lowStock.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {overview.products.lowStock.slice(0, 6).map((product: any) => (
                  <div key={product.id} className="text-sm text-red-700">
                    {product.name} - Estoque: {product.current_stock}/{product.minimum_stock}
                  </div>
                ))}
              </div>
            </div>
          )}

          {overview?.products.recent && overview.products.recent.length > 0 && (
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-4">Produtos Recentes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Código</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoria</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estoque</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Preço Venda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {overview.products.recent.map((product: any) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{product.code}</td>
                        <td className="px-4 py-2 text-sm font-medium">{product.name}</td>
                        <td className="px-4 py-2 text-sm">{product.category}</td>
                        <td className="px-4 py-2 text-sm">{product.current_stock}</td>
                        <td className="px-4 py-2 text-sm">{formatCurrency(product.sale_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ===== ORDENS DE SERVIÇO ===== */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Ordens de Serviço</h2>
            <button
              onClick={() => navigate('/service-orders')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver todas →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{overview?.serviceOrders.total || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-sm text-gray-500 mb-1">Abertas</div>
              <div className="text-2xl font-bold text-yellow-600">{overview?.serviceOrders.open || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-sm text-gray-500 mb-1">Em Andamento</div>
              <div className="text-2xl font-bold text-purple-600">{overview?.serviceOrders.inProgress || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
              <div className="text-sm text-gray-500 mb-1">Aguard. Peças</div>
              <div className="text-2xl font-bold text-orange-600">{overview?.serviceOrders.awaitingParts || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-500 mb-1">Concluídas</div>
              <div className="text-2xl font-bold text-green-600">{overview?.serviceOrders.completed || 0}</div>
            </div>
          </div>

          {overview?.serviceOrders.recent && overview.serviceOrders.recent.length > 0 && (
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-4">Ordens Recentes</h3>
              <div className="space-y-3">
                {overview.serviceOrders.recent.map((order: any) => (
                  <div key={order.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-gray-600">
                        Cliente: {order.customers?.name} | Produto: {order.products?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'IN_SERVICE' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== ORDENS DE PRODUÇÃO ===== */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Ordens de Produção</h2>
            <button
              onClick={() => navigate('/production-orders')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver todas →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{overview?.productionOrders.total || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
              <div className="text-sm text-gray-500 mb-1">Rascunho</div>
              <div className="text-2xl font-bold text-gray-600">{overview?.productionOrders.draft || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-sm text-gray-500 mb-1">Planejadas</div>
              <div className="text-2xl font-bold text-yellow-600">{overview?.productionOrders.planned || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-sm text-gray-500 mb-1">Em Produção</div>
              <div className="text-2xl font-bold text-purple-600">{overview?.productionOrders.inProduction || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-500 mb-1">Concluídas</div>
              <div className="text-2xl font-bold text-green-600">{overview?.productionOrders.completed || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-sm text-gray-500 mb-1">Canceladas</div>
              <div className="text-2xl font-bold text-red-600">{overview?.productionOrders.cancelled || 0}</div>
            </div>
          </div>

          {overview?.productionOrders.recent && overview.productionOrders.recent.length > 0 && (
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-4">Ordens Recentes</h3>
              <div className="space-y-3">
                {overview.productionOrders.recent.map((order: any) => (
                  <div key={order.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/production-orders/${order.id}`)}>
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-gray-600">
                        Produto: {order.products?.code} - {order.products?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Quantidade: {order.quantity_planned} unidades
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                        order.status === 'PLANNED' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'IN_PRODUCTION' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'DRAFT' ? 'Rascunho' :
                         order.status === 'PLANNED' ? 'Planejada' :
                         order.status === 'IN_PRODUCTION' ? 'Em Produção' :
                         order.status === 'COMPLETED' ? 'Concluída' :
                         order.status === 'CANCELLED' ? 'Cancelada' : order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== ORÇAMENTOS ===== */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Orçamentos</h2>
            <button
              onClick={() => navigate('/quotes')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver todos →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{overview?.quotes.total || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-sm text-gray-500 mb-1">Pendentes</div>
              <div className="text-2xl font-bold text-yellow-600">{overview?.quotes.pending || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-500 mb-1">Aprovados</div>
              <div className="text-2xl font-bold text-green-600">{overview?.quotes.approved || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-sm text-gray-500 mb-1">Rejeitados</div>
              <div className="text-2xl font-bold text-red-600">{overview?.quotes.rejected || 0}</div>
            </div>
          </div>
        </section>

        {/* ===== CLIENTES & FORNECEDORES ===== */}
        <section className="mb-8">
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4">Clientes & Fornecedores</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Clientes</h3>
                <button
                  onClick={() => navigate('/customers')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Ver todos →
                </button>
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-green-600 mb-4">{overview?.customers.total || 0}</div>

              {overview?.customers.recent && overview.customers.recent.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Clientes Recentes</h4>
                  <div className="space-y-2">
                    {overview.customers.recent.map((customer: any) => (
                      <div key={customer.id} className="text-sm">
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-gray-500">{customer.email || customer.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Fornecedores</h3>
                <button
                  onClick={() => navigate('/suppliers')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Ver todos →
                </button>
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-purple-600">{overview?.suppliers.total || 0}</div>
            </div>
          </div>
        </section>

        {/* ===== MOVIMENTAÇÕES DE ESTOQUE ===== */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Movimentações de Estoque</h2>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="text-2xl lg:text-3xl font-bold text-blue-600 mb-6">
              {overview?.inventory.totalMovements || 0} movimentações
            </div>

            {overview?.inventory.recentMovements && overview.inventory.recentMovements.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Movimentações Recentes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {overview.inventory.recentMovements.map((movement: any) => (
                        <tr key={movement.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{formatDate(movement.created_at)}</td>
                          <td className="px-4 py-2 text-sm">
                            {movement.products?.name || 'N/A'} ({movement.products?.code || 'N/A'})
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              movement.type === 'IN' ? 'bg-green-100 text-green-800' :
                              movement.type === 'OUT' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {movement.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">{movement.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
