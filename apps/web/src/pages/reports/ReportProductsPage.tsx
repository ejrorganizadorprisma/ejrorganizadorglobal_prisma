import { useState } from 'react';
import { useProductsReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Package, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'abc-curve', label: 'Curva ABC' },
  { id: 'critical-stock', label: 'Estoque Crítico' },
  { id: 'turnover', label: 'Giro de Estoque' },
  { id: 'margin', label: 'Margem de Lucro' },
  { id: 'best-sellers', label: 'Mais Vendidos' },
];

export function ReportProductsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useProductsReport(activeTab, filters);

  const setPreset = (days: number | 'year' | 'all') => {
    if (days === 'all') { setStartDate(''); setEndDate(''); return; }
    const end = new Date();
    const start = days === 'year' ? startOfYear(end) : subDays(end, days as number);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handleExportPdf = () => {
    if (!data) return;
    const dateRange = { start: startDate, end: endDate };
    const tabLabel = TABS.find(t => t.id === activeTab)?.label || '';

    switch (activeTab) {
      case 'abc-curve':
        generateReportPdf({
          title: `Produtos - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'category', label: 'Categoria' },
            { key: 'current_stock', label: 'Estoque', format: 'number' },
            { key: 'cost_price', label: 'Custo', format: 'currency' },
            { key: 'stock_value', label: 'Valor Estoque', format: 'currency' },
            { key: 'classification', label: 'Classe' },
            { key: 'cumulativePercent', label: '% Acumulado', format: 'percent' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'critical-stock':
        generateReportPdf({
          title: `Produtos - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'category', label: 'Categoria' },
            { key: 'current_stock', label: 'Estoque Atual', format: 'number' },
            { key: 'minimum_stock', label: 'Estoque Mín.', format: 'number' },
            { key: 'available_stock', label: 'Disponível', format: 'number' },
            { key: 'sold_last_30d', label: 'Vendido 30d', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'turnover':
        generateReportPdf({
          title: `Produtos - ${tabLabel}`,
          columns: [
            { key: 'product_code', label: 'Código' },
            { key: 'product_name', label: 'Produto' },
            { key: 'type', label: 'Tipo' },
            { key: 'period', label: 'Período', format: 'date' },
            { key: 'entries', label: 'Entradas', format: 'number' },
            { key: 'exits', label: 'Saídas', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'margin':
        generateReportPdf({
          title: `Produtos - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'category', label: 'Categoria' },
            { key: 'cost_price', label: 'Custo', format: 'currency' },
            { key: 'sale_price', label: 'Venda', format: 'currency' },
            { key: 'margin_value', label: 'Margem (val)', format: 'currency' },
            { key: 'margin_percent', label: 'Margem (%)', format: 'percent' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'best-sellers':
        generateReportPdf({
          title: `Produtos - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'category', label: 'Categoria' },
            { key: 'total_quantity', label: 'Qtd Vendida', format: 'number' },
            { key: 'total_revenue', label: 'Receita Total', format: 'currency' },
            { key: 'total_sales', label: 'Vendas', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-20 text-gray-500">Nenhum dado encontrado</div>;

    switch (activeTab) {
      case 'abc-curve': return <AbcCurveContent data={data} formatPrice={formatPrice} />;
      case 'critical-stock': return <CriticalStockContent data={data} formatPrice={formatPrice} />;
      case 'turnover': return <TurnoverContent data={data} formatPrice={formatPrice} />;
      case 'margin': return <MarginContent data={data} formatPrice={formatPrice} />;
      case 'best-sellers': return <BestSellersContent data={data} formatPrice={formatPrice} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-blue-600" />
              Relatórios de Produtos
            </h1>
          </div>
          <button onClick={handleExportPdf} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
        </div>

        {/* Date Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
            <span className="text-gray-400">até</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
            <div className="flex gap-1 ml-2">
              {[{ l: '7d', v: 7 }, { l: '30d', v: 30 }, { l: '90d', v: 90 }, { l: 'Ano', v: 'year' as const }, { l: 'Todos', v: 'all' as const }].map(p => (
                <button key={p.l} onClick={() => setPreset(p.v)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">{p.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border mb-4 overflow-hidden">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}

/* ==================== ABC CURVE ==================== */
function AbcCurveContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 20);

  const classColor = (cls: string) => {
    const c = cls?.toUpperCase();
    if (c === 'A') return 'bg-green-100 text-green-700';
    if (c === 'B') return 'bg-amber-100 text-amber-700';
    if (c === 'C') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const chartBarColor = (cls: string) => {
    const c = cls?.toUpperCase();
    if (c === 'A') return 'bg-green-400 hover:bg-green-500';
    if (c === 'B') return 'bg-amber-400 hover:bg-amber-500';
    if (c === 'C') return 'bg-red-400 hover:bg-red-500';
    return 'bg-gray-400 hover:bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Valor Total Estoque</div>
          <div className="text-2xl font-bold text-blue-700">{formatPrice(data.totalValue ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Classe A</div>
          <div className="text-2xl font-bold text-green-700">{data.classA?.count ?? 0} <span className="text-sm font-normal text-gray-500">({data.classA?.percent ?? 0}%)</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Classe B</div>
          <div className="text-2xl font-bold text-amber-600">{data.classB?.count ?? 0} <span className="text-sm font-normal text-gray-500">({data.classB?.percent ?? 0}%)</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Classe C</div>
          <div className="text-2xl font-bold text-red-600">{data.classC?.count ?? 0} <span className="text-sm font-normal text-gray-500">({data.classC?.percent ?? 0}%)</span></div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 20 Produtos por Valor de Estoque</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.stock_value) || 0), 1);
              const h = ((Number(item.stock_value) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className={`${chartBarColor(item.classification)} rounded-t mx-px transition-colors`} style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.name} ({item.classification}): {formatPrice(Number(item.stock_value) || 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estoque</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Estoque</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Classe</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.category}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.current_stock ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(Number(row.cost_price) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.stock_value) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classColor(row.classification)}`}>
                      {row.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{row.cumulativePercent != null ? `${Number(row.cumulativePercent).toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== CRITICAL STOCK ==================== */
function CriticalStockContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Produtos Críticos</div>
          <div className="text-2xl font-bold text-red-600">{data.totalCritical ?? 0}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estoque Atual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estoque Mín.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disponível</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendido 30d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => {
                const isZero = Number(row.current_stock) === 0;
                return (
                  <tr key={row.id || row.code} className={`hover:bg-gray-50 ${isZero ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-sm">{row.category}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${isZero ? 'text-red-600' : ''}`}>{row.current_stock ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.minimum_stock ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.available_stock ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.sold_last_30d ?? 0}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== TURNOVER ==================== */
function TurnoverContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Movimentações</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalMovements ?? items.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entradas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saídas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.id || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.product_code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.product_name}</td>
                  <td className="px-4 py-3 text-sm">{row.type}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.period ? new Date(row.period).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{row.entries ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{row.exits ?? 0}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== MARGIN ==================== */
function MarginContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Margem Média</div>
          <div className="text-2xl font-bold text-blue-700">{data.avgMargin ?? 0}%</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 20 por Margem (%)</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.margin_percent) || 0), 1);
              const h = ((Number(item.margin_percent) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.name}: {Number(item.margin_percent).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Venda</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margem (val)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margem (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.category}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(Number(row.cost_price) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(Number(row.sale_price) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.margin_value) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{row.margin_percent != null ? `${Number(row.margin_percent).toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== BEST SELLERS ==================== */
function BestSellersContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Receita Total</div>
          <div className="text-2xl font-bold text-green-700">{formatPrice(data.totalRevenue ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Qtd Total</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalQuantity ?? 0}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 15 Mais Vendidos por Receita</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.total_revenue) || 0), 1);
              const h = ((Number(item.total_revenue) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.name}: {formatPrice(Number(item.total_revenue) || 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd Vendida</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.category}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_quantity ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_revenue) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_sales ?? 0}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
