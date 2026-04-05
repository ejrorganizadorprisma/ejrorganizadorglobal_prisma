import { useState, useMemo } from 'react';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage } from '@ejr/shared-types';
import { useSellerStats, useSellerTimeSeries } from '../hooks/useSellers';
import { SimpleBarChart } from '../components/reports/SimpleBarChart';
import { Users, TrendingUp, ShoppingCart, Target, X, Loader2 } from 'lucide-react';

type ChartMetric = 'total_revenue' | 'total_sales' | 'avg_ticket';

export function SellersPage() {
  const permissionCheck = useRequirePermission({
    page: 'sellers' as AppPage,
    message: 'Voce nao tem permissao para acessar a pagina de vendedores.',
  });

  if (permissionCheck) return permissionCheck;

  return <SellersPageContent />;
}

function SellersPageContent() {
  const { formatPrice } = useFormatPrice();

  // State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('month');
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('total_revenue');

  // Data fetching
  const { data: sellerStats, isLoading: statsLoading } = useSellerStats({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: sellerTimeSeries, isLoading: timeSeriesLoading } = useSellerTimeSeries(
    selectedSellerId,
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      groupBy,
    }
  );

  // KPI calculations
  const kpis = useMemo(() => {
    if (!sellerStats || sellerStats.length === 0) {
      return { totalSellers: 0, totalSales: 0, totalRevenue: 0, avgTicket: 0 };
    }

    const totalSellers = sellerStats.length;
    const totalSales = sellerStats.reduce((sum, s) => sum + s.total_sales, 0);
    const totalRevenue = sellerStats.reduce((sum, s) => sum + s.total_revenue, 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return { totalSellers, totalSales, totalRevenue, avgTicket };
  }, [sellerStats]);

  // Sort sellers by revenue for ranking
  const rankedSellers = useMemo(() => {
    if (!sellerStats) return [];
    return [...sellerStats].sort((a, b) => b.total_revenue - a.total_revenue);
  }, [sellerStats]);

  // Chart data for comparison bar chart
  const chartData = useMemo(() => {
    if (!rankedSellers || rankedSellers.length === 0) return [];
    return rankedSellers.map((seller) => ({
      label: seller.name,
      value: seller[chartMetric],
    }));
  }, [rankedSellers, chartMetric]);

  // Max revenue for progress bars
  const maxRevenue = useMemo(() => {
    if (!rankedSellers || rankedSellers.length === 0) return 1;
    return Math.max(...rankedSellers.map((s) => s.total_revenue), 1);
  }, [rankedSellers]);

  // Selected seller data for detail panel
  const selectedSeller = useMemo(() => {
    if (!selectedSellerId || !sellerStats) return null;
    return sellerStats.find((s) => s.id === selectedSellerId) || null;
  }, [selectedSellerId, sellerStats]);

  // Time series chart data
  const timeSeriesChartData = useMemo(() => {
    if (!sellerTimeSeries?.timeSeries) return [];
    return sellerTimeSeries.timeSeries.map((entry) => ({
      label: entry.period,
      value: entry.total_revenue,
      value2: entry.total_sales,
    }));
  }, [sellerTimeSeries]);

  const groupByOptions = [
    { value: 'day', label: 'Dia' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Ano' },
  ];

  const metricOptions: { value: ChartMetric; label: string }[] = [
    { value: 'total_revenue', label: 'Receita' },
    { value: 'total_sales', label: 'Qtd Vendas' },
    { value: 'avg_ticket', label: 'Ticket Medio' },
  ];

  const getMedalOrPosition = (index: number): string => {
    if (index === 0) return '\u{1F947}';
    if (index === 1) return '\u{1F948}';
    if (index === 2) return '\u{1F949}';
    return String(index + 1);
  };

  const getChartColor = (metric: ChartMetric): string => {
    if (metric === 'total_revenue') return 'emerald';
    if (metric === 'total_sales') return 'blue';
    return 'purple';
  };

  const getChartFormatValue = (metric: ChartMetric) => {
    if (metric === 'total_revenue' || metric === 'avg_ticket') return formatPrice;
    return (v: number) => v.toLocaleString('pt-BR');
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500 text-sm">Carregando dados dos vendedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analise de desempenho e ranking dos vendedores
        </p>
      </div>

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Agrupar por</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            {groupByOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGroupBy(opt.value)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  groupBy === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Vendedores</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalSellers}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Vendas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalSales.toLocaleString('pt-BR')}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(kpis.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ticket Medio Geral</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(kpis.avgTicket)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart Section */}
      {rankedSellers.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Comparativo de Vendedores</h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              {metricOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setChartMetric(opt.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    chartMetric === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <SimpleBarChart
            data={chartData}
            color={getChartColor(chartMetric)}
            formatValue={getChartFormatValue(chartMetric)}
            height={250}
          />
        </div>
      )}

      {/* Ranking Table */}
      {rankedSellers.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Ranking de Vendedores</h2>
            <p className="text-sm text-gray-500 mt-1">Clique em um vendedor para ver detalhes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receita
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Medio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clientes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversao
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    % Receita
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankedSellers.map((seller, index) => {
                  const conversionRate =
                    seller.total_quotes > 0
                      ? ((seller.converted_quotes / seller.total_quotes) * 100).toFixed(1)
                      : '0.0';
                  const revenuePercent = (seller.total_revenue / maxRevenue) * 100;

                  return (
                    <tr
                      key={seller.id}
                      onClick={() => setSelectedSellerId(seller.id === selectedSellerId ? null : seller.id)}
                      className={`cursor-pointer transition-colors ${
                        seller.id === selectedSellerId
                          ? 'bg-indigo-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm ${index < 3 ? 'text-lg' : 'text-gray-500 font-medium'}`}>
                          {getMedalOrPosition(index)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{seller.name}</p>
                          <p className="text-xs text-gray-500">{seller.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {seller.total_sales.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatPrice(seller.total_revenue)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-700">
                          {formatPrice(seller.avg_ticket)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-700">
                          {seller.total_customers.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-700">{conversionRate}%</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 rounded-full h-2 transition-all"
                              style={{ width: `${revenuePercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {revenuePercent.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">Nenhum vendedor encontrado</h3>
          <p className="text-sm text-gray-400 mt-1">
            Ajuste os filtros de data ou verifique se existem vendas registradas.
          </p>
        </div>
      )}

      {/* Seller Detail Panel */}
      {selectedSellerId && selectedSeller && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Detalhes: {selectedSeller.name}
              </h2>
              <p className="text-sm text-gray-500">{selectedSeller.email}</p>
            </div>
            <button
              onClick={() => setSelectedSellerId(null)}
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Seller KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Vendas</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {selectedSeller.total_sales.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Receita</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formatPrice(selectedSeller.total_revenue)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Ticket Medio</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {formatPrice(selectedSeller.avg_ticket)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Clientes</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {selectedSeller.total_customers.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Additional stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Orcamentos</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {selectedSeller.total_quotes.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Valor total: {formatPrice(selectedSeller.total_quote_value)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Convertidos</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {selectedSeller.converted_quotes.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Taxa:{' '}
                  {selectedSeller.total_quotes > 0
                    ? ((selectedSeller.converted_quotes / selectedSeller.total_quotes) * 100).toFixed(1)
                    : '0.0'}
                  %
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase">Total Recebido</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formatPrice(selectedSeller.total_paid)}
                </p>
              </div>
            </div>

            {/* Time Series Chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Evolucao de Vendas por Periodo
              </h3>
              {timeSeriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="ml-2 text-sm text-gray-500">Carregando serie temporal...</span>
                </div>
              ) : timeSeriesChartData.length > 0 ? (
                <SimpleBarChart
                  data={timeSeriesChartData}
                  color="emerald"
                  color2="blue"
                  formatValue={formatPrice}
                  height={220}
                  showLegend
                  legend1="Receita"
                  legend2="Qtd Vendas"
                />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Sem dados de serie temporal para o periodo selecionado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
