import { useState } from 'react';
import { useSuppliersReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Users, FileDown, Calendar, Star } from 'lucide-react';

const TABS = [
  { id: 'ranking', label: 'Ranking por Volume' },
  { id: 'lead-time', label: 'Prazo de Entrega' },
  { id: 'status-map', label: 'Mapa por Status' },
  { id: 'price-history', label: 'Histórico de Preços' },
  { id: 'pending-orders', label: 'Pedidos Pendentes' },
];

export function ReportSuppliersPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useSuppliersReport(activeTab, filters);

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
      case 'ranking':
        generateReportPdf({
          title: `Fornecedores - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'status', label: 'Status' },
            { key: 'rating', label: 'Avaliação', format: 'number' },
            { key: 'total_orders', label: 'Pedidos', format: 'number' },
            { key: 'total_purchased', label: 'Total Comprado', format: 'currency' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'lead-time':
        generateReportPdf({
          title: `Fornecedores - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'total_deliveries', label: 'Entregas', format: 'number' },
            { key: 'avg_lead_time_days', label: 'Lead Time Médio', format: 'number' },
            { key: 'min_lead_time', label: 'Mínimo', format: 'number' },
            { key: 'max_lead_time', label: 'Máximo', format: 'number' },
            { key: 'promised_lead_time', label: 'Prometido', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'status-map':
        generateReportPdf({
          title: `Fornecedores - ${tabLabel}`,
          columns: [
            { key: 'name', label: 'Nome' },
            { key: 'status', label: 'Status' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'price-history':
        generateReportPdf({
          title: `Fornecedores - ${tabLabel}`,
          columns: [
            { key: 'product_code', label: 'Cód. Produto' },
            { key: 'product_name', label: 'Produto' },
            { key: 'supplier_name', label: 'Fornecedor' },
            { key: 'unit_price', label: 'Preço Unit.', format: 'number' },
            { key: 'created_at', label: 'Data', format: 'date' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'pending-orders':
        generateReportPdf({
          title: `Fornecedores - ${tabLabel}`,
          columns: [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Nome' },
            { key: 'pending_orders', label: 'Pedidos Pend.', format: 'number' },
            { key: 'pending_value', label: 'Valor Pendente', format: 'currency' },
            { key: 'nearest_delivery', label: 'Entrega Próxima', format: 'date' },
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
      case 'ranking': return <RankingContent data={data} formatPrice={formatPrice} />;
      case 'lead-time': return <LeadTimeContent data={data} formatPrice={formatPrice} />;
      case 'status-map': return <StatusMapContent data={data} formatPrice={formatPrice} />;
      case 'price-history': return <PriceHistoryContent data={data} formatPrice={formatPrice} />;
      case 'pending-orders': return <PendingOrdersContent data={data} formatPrice={formatPrice} />;
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
              <Users className="w-7 h-7 text-blue-600" />
              Relatórios de Fornecedores
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

/* ==================== RANKING ==================== */
function RankingContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Fornecedores</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalSuppliers ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Comprado</div>
          <div className="text-2xl font-bold text-green-700">{formatPrice(data.totalPurchased ?? 0)}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 15 Fornecedores por Volume de Compra</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.total_purchased) || 0), 1);
              const h = ((Number(item.total_purchased) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.name}: {formatPrice(Number(item.total_purchased) || 0)}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avaliação</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Comprado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.status}</td>
                  <td className="px-4 py-3 text-sm text-amber-500">
                    {row.rating != null ? Array.from({ length: Math.round(Number(row.rating)) }, (_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 inline fill-current" />
                    )) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_orders ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_purchased) || 0)}</td>
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

/* ==================== LEAD TIME ==================== */
function LeadTimeContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Lead Time Médio</div>
          <div className="text-2xl font-bold text-blue-700">{data.avgLeadTime ?? 0} dias</div>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entregas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Média (dias)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Máximo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prometido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => {
                const overPromised = row.promised_lead_time != null && Number(row.avg_lead_time_days) > Number(row.promised_lead_time);
                return (
                  <tr key={row.id || row.code} className={`hover:bg-gray-50 ${overPromised ? 'text-red-600' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.total_deliveries ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{row.avg_lead_time_days ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.min_lead_time ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.max_lead_time ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.promised_lead_time ?? '-'}</td>
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

/* ==================== STATUS MAP ==================== */
function StatusMapContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const statusCounts: { status: string; count: number }[] = data.statusCounts || [];

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE' || s === 'ATIVO') return 'bg-green-100 text-green-700';
    if (s === 'INACTIVE' || s === 'INATIVO') return 'bg-gray-100 text-gray-600';
    if (s === 'BLOCKED' || s === 'BLOQUEADO') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards - one per status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCounts.map((sc: any) => (
          <div key={sc.status} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="text-sm text-gray-500 mb-1">{sc.status}</div>
            <div className="text-2xl font-bold text-blue-700">{sc.count}</div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      {statusCounts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Status</h3>
          <div className="h-48 flex items-end gap-1">
            {statusCounts.map((item: any, i: number) => {
              const maxVal = Math.max(...statusCounts.map((d: any) => Number(d.count) || 0), 1);
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
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

/* ==================== PRICE HISTORY ==================== */
function PriceHistoryContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Registros</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalEntries ?? 0}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cód. Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Unitário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any, idx: number) => (
                <tr key={row.id || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.product_code}</td>
                  <td className="px-4 py-3 text-sm">{row.product_name}</td>
                  <td className="px-4 py-3 text-sm">{row.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {row.unit_price != null ? Number(row.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
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

/* ==================== PENDING ORDERS ==================== */
function PendingOrdersContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Pendentes</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalPending ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Valor Pendente</div>
          <div className="text-2xl font-bold text-orange-600">{formatPrice(data.totalPendingValue ?? 0)}</div>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pedidos Pend.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Pendente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrega Próxima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{row.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.pending_orders ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.pending_value) || 0)}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.nearest_delivery ? new Date(row.nearest_delivery).toLocaleDateString('pt-BR') : '-'}
                  </td>
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
