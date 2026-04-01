import { useState } from 'react';
import { useSalesReport, useInventoryReport } from '../hooks/useReports';
import { useFormatPrice } from '../hooks/useFormatPrice';

export function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: salesData, isLoading: salesLoading, refetch } = useSalesReport(
    startDate && endDate ? { startDate, endDate } : undefined
  );
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryReport();
  const { formatPrice } = useFormatPrice();

  const handleFilter = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-6">Relatórios</h1>

          {/* Sales Report */}
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Relatório de Vendas</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Fim</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleFilter}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Filtrar
                  </button>
                </div>
              </div>

              {salesLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : salesData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
                    <div className="bg-blue-50 p-4 lg:p-6 rounded-lg">
                      <div className="text-sm text-gray-600">Total de Vendas</div>
                      <div className="text-xl lg:text-2xl font-bold text-blue-600">
                        {formatPrice(salesData.totalSales)}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 lg:p-6 rounded-lg">
                      <div className="text-sm text-gray-600">Número de Pedidos</div>
                      <div className="text-xl lg:text-2xl font-bold text-green-600">
                        {salesData.totalOrders}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 lg:p-6 rounded-lg">
                      <div className="text-sm text-gray-600">Ticket Médio</div>
                      <div className="text-xl lg:text-2xl font-bold text-purple-600">
                        {formatPrice(salesData.averageTicket)}
                      </div>
                    </div>
                  </div>

                  {salesData.sales && salesData.sales.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-3">Vendas Recentes</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Número
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Cliente
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Data
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {salesData.sales.map((sale: any) => (
                              <tr key={sale.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {sale.quoteNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {sale.customer?.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {formatPrice(sale.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma venda encontrada no período
                </div>
              )}
            </div>
          </div>

          {/* Inventory Report */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Relatório de Inventário</h2>

              {inventoryLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : inventoryData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
                    <div className="bg-blue-50 p-4 lg:p-6 rounded-lg">
                      <div className="text-sm text-gray-600">Total de Produtos</div>
                      <div className="text-xl lg:text-2xl font-bold text-blue-600">
                        {inventoryData.totalProducts}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 lg:p-6 rounded-lg">
                      <div className="text-sm text-gray-600">Valor Total do Estoque</div>
                      <div className="text-xl lg:text-2xl font-bold text-green-600">
                        {formatPrice(inventoryData.totalValue)}
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 lg:p-6 rounded-lg">
                      <div className="text-sm text-gray-600">Produtos com Estoque Baixo</div>
                      <div className="text-xl lg:text-2xl font-bold text-red-600">
                        {inventoryData.lowStockCount}
                      </div>
                    </div>
                  </div>

                  {inventoryData.lowStockProducts && inventoryData.lowStockProducts.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-3">
                        Produtos com Estoque Baixo
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Código
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Nome
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Estoque Atual
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Estoque Mínimo
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {inventoryData.lowStockProducts.map((product: any) => (
                              <tr key={product.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {product.code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {product.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className="text-red-600 font-medium">
                                    {product.currentStock}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {product.minimumStock}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum dado de inventário disponível
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
