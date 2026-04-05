import { useState } from 'react';
import { useOrdersReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Truck, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'by-status', label: 'Por Status' },
  { id: 'delays', label: 'Atrasos de Entrega' },
  { id: 'pending-receipts', label: 'Recebimentos Pendentes' },
  { id: 'by-supplier', label: 'Volume por Fornecedor' },
  { id: 'compliance', label: 'Taxa de Conformidade' },
];

export function ReportOrdersPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useOrdersReport(activeTab, filters);

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
          title: `Pedidos - ${tabLabel}`,
          kpis: [{ label: 'Total Pedidos', value: String(data.total ?? 0) }],
          columns: [
            { key: 'status', label: 'Status' },
            { key: 'count', label: 'Quantidade', format: 'number' },
            { key: 'total_value', label: 'Valor Total', format: 'currency' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'delays':
        generateReportPdf({
          title: `Pedidos - ${tabLabel}`,
          kpis: [
            { label: 'Total Atrasados', value: String(data.totalDelayed ?? 0) },
            { label: 'Valor Atrasado', value: formatPrice(data.totalDelayedValue ?? 0) },
          ],
          columns: [
            { key: 'order_number', label: 'N. Pedido' },
            { key: 'supplier_name', label: 'Fornecedor' },
            { key: 'expected_delivery_date', label: 'Entrega Prevista', format: 'date' },
            { key: 'days_overdue', label: 'Dias Atraso', format: 'number' },
            { key: 'total_amount', label: 'Valor Total', format: 'currency' },
            { key: 'status', label: 'Status' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'pending-receipts':
        generateReportPdf({
          title: `Pedidos - ${tabLabel}`,
          kpis: [
            { label: 'Itens Pendentes', value: String(data.totalPendingItems ?? 0) },
            { label: 'Valor Pendente', value: formatPrice(data.totalPendingValue ?? 0) },
          ],
          columns: [
            { key: 'order_number', label: 'N. Pedido' },
            { key: 'supplier_name', label: 'Fornecedor' },
            { key: 'product_code', label: 'Cód. Produto' },
            { key: 'product_name', label: 'Produto' },
            { key: 'quantity', label: 'Qtd.', format: 'number' },
            { key: 'quantity_received', label: 'Recebido', format: 'number' },
            { key: 'quantity_pending', label: 'Pendente', format: 'number' },
            { key: 'unit_price', label: 'Preço Unit.', format: 'currency' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'by-supplier':
        generateReportPdf({
          title: `Pedidos - ${tabLabel}`,
          kpis: [
            { label: 'Total Pedidos', value: String(data.totalOrders ?? 0) },
            { label: 'Valor Total', value: formatPrice(data.totalValue ?? 0) },
          ],
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'total_orders', label: 'Total Pedidos', format: 'number' },
            { key: 'completed_orders', label: 'Concluídos', format: 'number' },
            { key: 'total_value', label: 'Valor Total', format: 'currency' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'compliance':
        generateReportPdf({
          title: `Pedidos - ${tabLabel}`,
          kpis: [{ label: 'Taxa Geral', value: `${data.overallAcceptanceRate ?? 0}%` }],
          columns: [
            { key: 'supplier_name', label: 'Fornecedor' },
            { key: 'total_items', label: 'Total Itens', format: 'number' },
            { key: 'total_received', label: 'Recebidos', format: 'number' },
            { key: 'total_accepted', label: 'Aceitos', format: 'number' },
            { key: 'total_rejected', label: 'Rejeitados', format: 'number' },
            { key: 'acceptance_rate', label: 'Taxa Aceite', format: 'percent' },
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
      case 'by-status': return <ByStatusContent data={data} formatPrice={formatPrice} />;
      case 'delays': return <DelaysContent data={data} formatPrice={formatPrice} />;
      case 'pending-receipts': return <PendingReceiptsContent data={data} formatPrice={formatPrice} />;
      case 'by-supplier': return <BySupplierContent data={data} formatPrice={formatPrice} />;
      case 'compliance': return <ComplianceContent data={data} formatPrice={formatPrice} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" />
            Relatorios de Pedidos
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
function ByStatusContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return 'bg-yellow-100 text-yellow-700';
    if (s === 'SENT') return 'bg-blue-100 text-blue-700';
    if (s === 'CONFIRMED') return 'bg-purple-100 text-purple-700';
    if (s === 'PARTIAL') return 'bg-orange-100 text-orange-700';
    if (s === 'RECEIVED') return 'bg-green-100 text-green-700';
    if (s === 'CANCELLED') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Pedidos</div>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
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
                  <td className="px-4 py-3 text-sm text-right">{row.count ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_value) || 0)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================== DELAYS ==================== */
function DelaysContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return 'bg-yellow-100 text-yellow-700';
    if (s === 'SENT') return 'bg-blue-100 text-blue-700';
    if (s === 'CONFIRMED') return 'bg-purple-100 text-purple-700';
    if (s === 'PARTIAL') return 'bg-orange-100 text-orange-700';
    if (s === 'RECEIVED') return 'bg-green-100 text-green-700';
    if (s === 'CANCELLED') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Atrasados</div>
          <div className="text-2xl font-bold text-red-700">{data.totalDelayed ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Valor Atrasado</div>
          <div className="text-2xl font-bold text-red-700">{formatPrice(data.totalDelayedValue ?? 0)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrega Prevista</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dias Atraso</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.order_number || idx} className="hover:bg-red-50 bg-red-50/40">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-red-700">{row.order_number}</td>
                  <td className="px-4 py-3 text-sm text-red-700">{row.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-red-700">
                    {row.expected_delivery_date ? new Date(row.expected_delivery_date).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-red-700">{row.days_overdue ?? 0} dias</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-700">{formatPrice(Number(row.total_amount) || 0)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
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

/* ==================== PENDING RECEIPTS ==================== */
function PendingReceiptsContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Itens Pendentes</div>
          <div className="text-2xl font-bold text-orange-700">{data.totalPendingItems ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Valor Pendente</div>
          <div className="text-2xl font-bold text-orange-700">{formatPrice(data.totalPendingValue ?? 0)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N. Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cod. Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recebido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendente</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco Unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.order_number}</td>
                  <td className="px-4 py-3 text-sm">{row.supplier_name}</td>
                  <td className="px-4 py-3 text-sm font-mono">{row.product_code}</td>
                  <td className="px-4 py-3 text-sm">{row.product_name}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.quantity ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.quantity_received ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-orange-700">{row.quantity_pending ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.unit_price) || 0)}</td>
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

/* ==================== BY SUPPLIER ==================== */
function BySupplierContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Pedidos</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalOrders ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Valor Total</div>
          <div className="text-2xl font-bold text-green-700">{formatPrice(data.totalValue ?? 0)}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 15 Fornecedores por Valor</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.total_value) || 0), 1);
              const h = ((Number(item.total_value) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.name}: {formatPrice(Number(item.total_value) || 0)}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pedidos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Concluidos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.code || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_orders ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.completed_orders ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_value) || 0)}</td>
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

/* ==================== COMPLIANCE ==================== */
function ComplianceContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  const rateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-700';
    if (rate >= 80) return 'text-amber-600';
    return 'text-red-700';
  };

  const rateBadge = (rate: number) => {
    if (rate >= 95) return 'bg-green-100 text-green-700';
    if (rate >= 80) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Taxa Geral</div>
          <div className={`text-2xl font-bold ${rateColor(Number(data.overallAcceptanceRate) || 0)}`}>
            {data.overallAcceptanceRate ?? 0}%
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Taxa de Conformidade por Fornecedor</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const h = Number(item.acceptance_rate) || 0;
              const barColor = h >= 95 ? 'bg-green-400 hover:bg-green-500' : h >= 80 ? 'bg-amber-400 hover:bg-amber-500' : 'bg-red-400 hover:bg-red-500';
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className={`${barColor} rounded-t mx-px transition-colors`} style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.supplier_name}: {Number(item.acceptance_rate).toFixed(1)}%
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Itens</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recebidos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aceitos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rejeitados</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa Aceite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => {
                const rate = Number(row.acceptance_rate) || 0;
                return (
                  <tr key={row.supplier_name || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{row.supplier_name}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.total_items ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.total_received ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.total_accepted ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.total_rejected ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rateBadge(rate)}`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
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
