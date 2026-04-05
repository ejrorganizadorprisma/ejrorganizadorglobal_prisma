import { useState } from 'react';
import { useProductionReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Factory, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'efficiency', label: 'Eficiencia de Producao' },
  { id: 'defect-rate', label: 'Taxa de Defeitos' },
  { id: 'by-period', label: 'Producao por Periodo' },
  { id: 'by-operator', label: 'Por Operador' },
  { id: 'test-results', label: 'Resultados de Testes' },
];

export function ReportProductionPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useProductionReport(activeTab, filters);

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
      case 'efficiency':
        generateReportPdf({
          title: `Producao - ${tabLabel}`,
          kpis: [{ label: 'Eficiencia Media', value: `${data.avgEfficiency ?? 0}%` }],
          columns: [
            { key: 'batch_number', label: 'N. Lote' },
            { key: 'product_name', label: 'Produto' },
            { key: 'quantity_planned', label: 'Planejado', format: 'number' },
            { key: 'quantity_produced', label: 'Produzido', format: 'number' },
            { key: 'quantity_scrapped', label: 'Refugo', format: 'number' },
            { key: 'efficiency_percent', label: 'Eficiencia', format: 'percent' },
            { key: 'status', label: 'Status' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'defect-rate':
        generateReportPdf({
          title: `Producao - ${tabLabel}`,
          kpis: [
            { label: 'Taxa Media', value: `${data.avgDefectRate ?? 0}%` },
            { label: 'Total Produzido', value: String(data.totalProduced ?? 0) },
            { label: 'Total Refugo', value: String(data.totalScrapped ?? 0) },
          ],
          columns: [
            { key: 'batch_number', label: 'N. Lote' },
            { key: 'product_name', label: 'Produto' },
            { key: 'quantity_produced', label: 'Produzido', format: 'number' },
            { key: 'quantity_scrapped', label: 'Refugo', format: 'number' },
            { key: 'defect_rate', label: 'Taxa Defeito', format: 'percent' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'by-period':
        generateReportPdf({
          title: `Producao - ${tabLabel}`,
          kpis: [
            { label: 'Total Produzido', value: String(data.totalProduced ?? 0) },
            { label: 'Total Lotes', value: String(data.totalBatches ?? 0) },
          ],
          columns: [
            { key: 'period', label: 'Periodo', format: 'date' },
            { key: 'batches_completed', label: 'Lotes', format: 'number' },
            { key: 'units_produced', label: 'Produzido', format: 'number' },
            { key: 'units_scrapped', label: 'Refugo', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'by-operator':
        generateReportPdf({
          title: `Producao - ${tabLabel}`,
          columns: [
            { key: 'operator_name', label: 'Operador' },
            { key: 'batches_worked', label: 'Lotes', format: 'number' },
            { key: 'units_total', label: 'Total', format: 'number' },
            { key: 'units_completed', label: 'Concluidas', format: 'number' },
            { key: 'units_scrapped', label: 'Refugo', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'test-results':
        generateReportPdf({
          title: `Producao - ${tabLabel}`,
          columns: [
            { key: 'test_type', label: 'Tipo Teste' },
            { key: 'total', label: 'Total', format: 'number' },
            { key: 'passed', label: 'Aprovados', format: 'number' },
            { key: 'failed', label: 'Reprovados', format: 'number' },
            { key: 'passRate', label: 'Taxa Aprovacao', format: 'percent' },
          ],
          data: data.summary || [],
          dateRange,
        });
        break;
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-20 text-gray-500">Nenhum dado encontrado</div>;

    switch (activeTab) {
      case 'efficiency': return <EfficiencyContent data={data} formatPrice={formatPrice} />;
      case 'defect-rate': return <DefectRateContent data={data} formatPrice={formatPrice} />;
      case 'by-period': return <ByPeriodContent data={data} formatPrice={formatPrice} />;
      case 'by-operator': return <ByOperatorContent data={data} formatPrice={formatPrice} />;
      case 'test-results': return <TestResultsContent data={data} formatPrice={formatPrice} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="w-7 h-7 text-blue-600" />
            Relatorios de Producao
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

/* ==================== EFFICIENCY ==================== */
function EfficiencyContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED') return 'bg-green-100 text-green-700';
    if (s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-700';
    if (s === 'DRAFT') return 'bg-gray-100 text-gray-600';
    if (s === 'PAUSED') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  const efficiencyColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-400 hover:bg-green-500';
    if (pct >= 70) return 'bg-amber-400 hover:bg-amber-500';
    return 'bg-red-400 hover:bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Eficiencia Media</div>
          <div className="text-2xl font-bold text-blue-700">{data.avgEfficiency ?? 0}%</div>
        </div>
      </div>

      {/* Bar Chart */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Eficiencia por Lote</h3>
          <div className="h-48 flex items-end gap-1">
            {items.map((item: any, i: number) => {
              const h = Number(item.efficiency_percent) || 0;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className={`${efficiencyColor(h)} rounded-t mx-px transition-colors`} style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.batch_number}: {Number(item.efficiency_percent).toFixed(1)}%
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. Lote</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planejado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produzido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refugo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eficiencia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => {
                const eff = Number(row.efficiency_percent) || 0;
                const effColor = eff >= 90 ? 'text-green-700' : eff >= 70 ? 'text-amber-600' : 'text-red-700';
                return (
                  <tr key={row.batch_number || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{row.batch_number}</td>
                    <td className="px-4 py-3 text-sm">{row.product_name}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.quantity_planned ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.quantity_produced ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.quantity_scrapped ?? 0}</td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${effColor}`}>{eff.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
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

/* ==================== DEFECT RATE ==================== */
function DefectRateContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Taxa Media</div>
          <div className="text-2xl font-bold text-red-700">{data.avgDefectRate ?? 0}%</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Produzido</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalProduced ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Refugo</div>
          <div className="text-2xl font-bold text-red-700">{data.totalScrapped ?? 0}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. Lote</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produzido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refugo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa Defeito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => {
                const rate = Number(row.defect_rate) || 0;
                const rateColor = rate > 5 ? 'text-red-700' : rate > 2 ? 'text-amber-600' : 'text-green-700';
                const rateBg = rate > 5 ? 'bg-red-100 text-red-700' : rate > 2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                return (
                  <tr key={row.batch_number || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{row.batch_number}</td>
                    <td className="px-4 py-3 text-sm">{row.product_name}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.quantity_produced ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.quantity_scrapped ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateBg}`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
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

/* ==================== BY PERIOD ==================== */
function ByPeriodContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Produzido</div>
          <div className="text-2xl font-bold text-green-700">{data.totalProduced ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Lotes</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalBatches ?? 0}</div>
        </div>
      </div>

      {/* Bar Chart with scrapped overlay */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Producao por Periodo</h3>
          <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Produzido</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Refugo</span>
          </div>
          <div className="h-48 flex items-end gap-1">
            {items.map((item: any, i: number) => {
              const produced = Number(item.units_produced) || 0;
              const scrapped = Number(item.units_scrapped) || 0;
              const maxVal = Math.max(...items.map((d: any) => Number(d.units_produced) || 0), 1);
              const hProduced = (produced / maxVal) * 100;
              const hScrapped = (scrapped / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative flex flex-col items-stretch justify-end" style={{ height: '100%' }}>
                  <div className="flex flex-col items-stretch justify-end flex-1">
                    <div className="bg-red-400 hover:bg-red-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(hScrapped, 0)}%`, minHeight: scrapped > 0 ? '2px' : '0' }} />
                    <div className="bg-green-400 hover:bg-green-500 mx-px transition-colors" style={{ height: `${Math.max(hProduced - hScrapped, 2)}%` }} />
                  </div>
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.period}: {produced} prod. / {scrapped} ref.
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lotes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produzido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refugo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.period || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {row.period ? new Date(row.period).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{row.batches_completed ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-700">{row.units_produced ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{row.units_scrapped ?? 0}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== BY OPERATOR ==================== */
function ByOperatorContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Unidades por Operador</h3>
          <div className="h-48 flex items-end gap-1">
            {items.map((item: any, i: number) => {
              const maxVal = Math.max(...items.map((d: any) => Number(d.units_completed) || 0), 1);
              const h = ((Number(item.units_completed) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.operator_name}: {item.units_completed}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operador</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lotes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Concluidas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refugo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.operator_name || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.operator_name}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.batches_worked ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.units_total ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-700">{row.units_completed ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{row.units_scrapped ?? 0}</td>
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

/* ==================== TEST RESULTS ==================== */
function TestResultsContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const summary = data.summary || [];
  const detailed = data.detailed || [];

  const testTypeLabel = (type: string) => {
    const t = type?.toUpperCase();
    if (t === 'ASSEMBLY') return 'Montagem';
    if (t === 'FINAL') return 'Final';
    return type;
  };

  const resultBadge = (result: string) => {
    const r = result?.toUpperCase();
    if (r === 'PASSED') return 'bg-green-100 text-green-700';
    if (r === 'FAILED') return 'bg-red-100 text-red-700';
    if (r === 'PENDING') return 'bg-yellow-100 text-yellow-700';
    if (r === 'CONDITIONAL') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards - one per test_type */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map((s: any) => {
            const rate = Number(s.passRate) || 0;
            const color = rate >= 95 ? 'text-green-700' : rate >= 80 ? 'text-amber-600' : 'text-red-700';
            return (
              <div key={s.test_type} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="text-sm text-gray-500 mb-1">{testTypeLabel(s.test_type)} - Aprovacao</div>
                <div className={`text-2xl font-bold ${color}`}>{rate.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Resumo por Tipo de Teste</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Teste</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aprovados</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reprovados</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa Aprovacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.map((row: any, idx: number) => {
                const rate = Number(row.passRate) || 0;
                const rateBg = rate >= 95 ? 'bg-green-100 text-green-700' : rate >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                return (
                  <tr key={row.test_type || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{testTypeLabel(row.test_type)}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.total ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-700">{row.passed ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{row.failed ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateBg}`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {summary.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Table */}
      {detailed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Detalhamento por Resultado</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Teste</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detailed.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{testTypeLabel(row.test_type)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resultBadge(row.result)}`}>
                        {row.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{row.count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
