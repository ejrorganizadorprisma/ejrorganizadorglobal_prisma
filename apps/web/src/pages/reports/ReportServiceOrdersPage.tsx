import { useState } from 'react';
import { useServiceOrdersReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Wrench, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'by-status', label: 'Por Status' },
  { id: 'avg-time', label: 'Tempo Medio' },
  { id: 'by-technician', label: 'Por Tecnico' },
  { id: 'costs', label: 'Analise de Custos' },
  { id: 'warranty', label: 'Garantia' },
];

export function ReportServiceOrdersPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useServiceOrdersReport(activeTab, filters);

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
      case 'by-status':
        generateReportPdf({
          title: `Ordens de Servico - ${tabLabel}`,
          kpis: [{ label: 'Total', value: String(data.total ?? 0) }],
          columns: [
            { key: 'status', label: 'Status' },
            { key: 'count', label: 'Quantidade', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'avg-time':
        generateReportPdf({
          title: `Ordens de Servico - ${tabLabel}`,
          kpis: [{ label: 'Tempo Medio', value: `${data.avgResolutionDays ?? 0} dias` }],
          columns: [
            { key: 'order_number', label: 'N. OS' },
            { key: 'customer_name', label: 'Cliente' },
            { key: 'status', label: 'Status' },
            { key: 'entry_date', label: 'Entrada', format: 'date' },
            { key: 'completion_date', label: 'Conclusao', format: 'date' },
            { key: 'resolution_days', label: 'Dias', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'by-technician':
        generateReportPdf({
          title: `Ordens de Servico - ${tabLabel}`,
          columns: [
            { key: 'technician_name', label: 'Tecnico' },
            { key: 'total_orders', label: 'Total OS', format: 'number' },
            { key: 'completed', label: 'Concluidas', format: 'number' },
            { key: 'in_progress', label: 'Em Andamento', format: 'number' },
            { key: 'total_revenue', label: 'Receita Total', format: 'currency' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'costs':
        generateReportPdf({
          title: `Ordens de Servico - ${tabLabel}`,
          kpis: [
            { label: 'Custo Total', value: formatPrice(data.totalCost ?? 0) },
            { label: 'Mao de Obra', value: formatPrice(data.totalLabor ?? 0) },
            { label: 'Pecas', value: formatPrice(data.totalParts ?? 0) },
          ],
          columns: [
            { key: 'order_number', label: 'N. OS' },
            { key: 'customer_name', label: 'Cliente' },
            { key: 'labor_cost', label: 'Mao de Obra', format: 'currency' },
            { key: 'parts_cost', label: 'Pecas', format: 'currency' },
            { key: 'total_cost', label: 'Custo Total', format: 'currency' },
            { key: 'labor_percent', label: '% Mao de Obra', format: 'percent' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'warranty':
        generateReportPdf({
          title: `Ordens de Servico - ${tabLabel}`,
          kpis: [
            { label: 'Total OS', value: String(data.summary?.total ?? 0) },
            { label: 'Em Garantia', value: String(data.summary?.warranty ?? 0) },
            { label: 'Custo Garantia', value: formatPrice(data.summary?.warrantyCost ?? 0) },
            { label: 'Receita Regular', value: formatPrice(data.summary?.regularRevenue ?? 0) },
          ],
          columns: [
            { key: 'order_number', label: 'N. OS' },
            { key: 'customer_name', label: 'Cliente' },
            { key: 'product_name', label: 'Produto' },
            { key: 'entry_date', label: 'Entrada', format: 'date' },
            { key: 'total_cost', label: 'Custo Total', format: 'currency' },
            { key: 'status', label: 'Status' },
          ],
          data: data.warrantyOrders || [],
          dateRange,
        });
        break;
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-20 text-gray-500">Nenhum dado encontrado</div>;

    switch (activeTab) {
      case 'by-status': return <ByStatusContent data={data} formatPrice={formatPrice} />;
      case 'avg-time': return <AvgTimeContent data={data} formatPrice={formatPrice} />;
      case 'by-technician': return <ByTechnicianContent data={data} formatPrice={formatPrice} />;
      case 'costs': return <CostsContent data={data} formatPrice={formatPrice} />;
      case 'warranty': return <WarrantyContent data={data} formatPrice={formatPrice} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-blue-600" />
            Relatorios de Ordens de Servico
          </h1>
          <button onClick={handleExportPdf} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
        </div>

        {/* Date Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
            <span className="text-gray-400">ate</span>
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

/* ==================== BY STATUS ==================== */
function ByStatusContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'OPEN') return 'bg-yellow-100 text-yellow-700';
    if (s === 'AWAITING_PARTS') return 'bg-orange-100 text-orange-700';
    if (s === 'IN_SERVICE') return 'bg-blue-100 text-blue-700';
    if (s === 'AWAITING_APPROVAL') return 'bg-purple-100 text-purple-700';
    if (s === 'COMPLETED') return 'bg-green-100 text-green-700';
    if (s === 'CANCELLED') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-blue-700">{data.total ?? 0}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuicao por Status</h3>
          <div className="h-48 flex items-end gap-1">
            {items.map((item: any, i: number) => {
              const maxVal = Math.max(...items.map((d: any) => Number(d.count) || 0), 1);
              const h = ((Number(item.count) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.status}: {item.count}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.status || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{row.count ?? 0}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== AVG TIME ==================== */
function AvgTimeContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'OPEN') return 'bg-yellow-100 text-yellow-700';
    if (s === 'AWAITING_PARTS') return 'bg-orange-100 text-orange-700';
    if (s === 'IN_SERVICE') return 'bg-blue-100 text-blue-700';
    if (s === 'AWAITING_APPROVAL') return 'bg-purple-100 text-purple-700';
    if (s === 'COMPLETED') return 'bg-green-100 text-green-700';
    if (s === 'CANCELLED') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  const daysColor = (days: number) => {
    if (days > 30) return 'text-red-700 font-bold';
    if (days > 15) return 'text-amber-600 font-bold';
    return 'text-gray-700';
  };

  const rowBg = (days: number) => {
    if (days > 30) return 'bg-red-50/50';
    if (days > 15) return 'bg-amber-50/50';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Tempo Medio</div>
          <div className="text-2xl font-bold text-blue-700">{data.avgResolutionDays ?? 0} dias</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conclusao</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => {
                const days = Number(row.resolution_days) || 0;
                return (
                  <tr key={row.order_number || idx} className={`hover:bg-gray-50 ${rowBg(days)}`}>
                    <td className="px-4 py-3 text-sm font-mono">{row.order_number}</td>
                    <td className="px-4 py-3 text-sm">{row.customer_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.entry_date ? new Date(row.entry_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.completion_date ? new Date(row.completion_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${daysColor(days)}`}>{days} dias</td>
                  </tr>
                );
              })}
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

/* ==================== BY TECHNICIAN ==================== */
function ByTechnicianContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">OS por Tecnico</h3>
          <div className="h-48 flex items-end gap-1">
            {items.map((item: any, i: number) => {
              const maxVal = Math.max(...items.map((d: any) => Number(d.total_orders) || 0), 1);
              const h = ((Number(item.total_orders) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.technician_name}: {item.total_orders} OS
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tecnico</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total OS</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Concluidas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Em Andamento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.technician_name || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.technician_name}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_orders ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-700">{row.completed ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-700">{row.in_progress ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_revenue) || 0)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== COSTS ==================== */
function CostsContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Custo Total</div>
          <div className="text-2xl font-bold text-blue-700">{formatPrice(data.totalCost ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Mao de Obra</div>
          <div className="text-2xl font-bold text-green-700">{formatPrice(data.totalLabor ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Pecas</div>
          <div className="text-2xl font-bold text-orange-700">{formatPrice(data.totalParts ?? 0)}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 15 OS por Custo Total</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.total_cost) || 0), 1);
              const h = ((Number(item.total_cost) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.order_number}: {formatPrice(Number(item.total_cost) || 0)}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mao de Obra</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pecas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Mao de Obra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.order_number || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.order_number}</td>
                  <td className="px-4 py-3 text-sm">{row.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(Number(row.labor_cost) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(Number(row.parts_cost) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_cost) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right">{Number(row.labor_percent).toFixed(1)}%</td>
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

/* ==================== WARRANTY ==================== */
function WarrantyContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const summary = data.summary || {};
  const warrantyOrders = data.warrantyOrders || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'OPEN') return 'bg-yellow-100 text-yellow-700';
    if (s === 'AWAITING_PARTS') return 'bg-orange-100 text-orange-700';
    if (s === 'IN_SERVICE') return 'bg-blue-100 text-blue-700';
    if (s === 'AWAITING_APPROVAL') return 'bg-purple-100 text-purple-700';
    if (s === 'COMPLETED') return 'bg-green-100 text-green-700';
    if (s === 'CANCELLED') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total OS</div>
          <div className="text-2xl font-bold text-blue-700">{summary.total ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Em Garantia</div>
          <div className="text-2xl font-bold text-orange-700">{summary.warranty ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Custo Garantia</div>
          <div className="text-2xl font-bold text-red-700">{formatPrice(summary.warrantyCost ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Receita Regular</div>
          <div className="text-2xl font-bold text-green-700">{formatPrice(summary.regularRevenue ?? 0)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Ordens de Servico em Garantia</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {warrantyOrders.map((row: any, idx: number) => (
                <tr key={row.order_number || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.order_number}</td>
                  <td className="px-4 py-3 text-sm">{row.customer_name}</td>
                  <td className="px-4 py-3 text-sm">{row.product_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.entry_date ? new Date(row.entry_date).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_cost) || 0)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {warrantyOrders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
