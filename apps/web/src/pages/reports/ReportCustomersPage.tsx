import { useState } from 'react';
import { useCustomersReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Users, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'revenue-ranking', label: 'Ranking por Faturamento' },
  { id: 'defaulters', label: 'Inadimplentes' },
  { id: 'frequency', label: 'Frequência de Compras' },
  { id: 'by-type', label: 'Clientes por Tipo' },
  { id: 'avg-ticket', label: 'Ticket Médio' },
];

export function ReportCustomersPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useCustomersReport(activeTab, filters);

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
      case 'revenue-ranking':
        generateReportPdf({
          title: `Clientes - ${tabLabel}`,
          columns: [
            { key: 'name', label: 'Nome' },
            { key: 'type', label: 'Tipo' },
            { key: 'total_sales', label: 'Vendas', format: 'number' },
            { key: 'total_revenue', label: 'Receita Total', format: 'currency' },
            { key: 'total_paid', label: 'Total Pago', format: 'currency' },
            { key: 'total_pending', label: 'Total Pendente', format: 'currency' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'defaulters':
        generateReportPdf({
          title: `Clientes - ${tabLabel}`,
          columns: [
            { key: 'name', label: 'Nome' },
            { key: 'type', label: 'Tipo' },
            { key: 'phone', label: 'Telefone' },
            { key: 'overdue_installments', label: 'Parcelas Vencidas', format: 'number' },
            { key: 'overdue_amount', label: 'Valor Vencido', format: 'currency' },
            { key: 'oldest_due_date', label: 'Vencimento Mais Antigo', format: 'date' },
            { key: 'max_days_overdue', label: 'Dias Atraso', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'frequency':
        generateReportPdf({
          title: `Clientes - ${tabLabel}`,
          columns: [
            { key: 'name', label: 'Nome' },
            { key: 'type', label: 'Tipo' },
            { key: 'total_purchases', label: 'Total Compras', format: 'number' },
            { key: 'first_purchase', label: 'Primeira Compra', format: 'date' },
            { key: 'last_purchase', label: 'Última Compra', format: 'date' },
            { key: 'avg_days_between', label: 'Média Dias entre Compras', format: 'number' },
          ],
          data: data.items || [],
          dateRange,
        });
        break;
      case 'by-type':
        generateReportPdf({
          title: `Clientes - ${tabLabel}`,
          columns: [
            { key: 'type', label: 'Tipo' },
            { key: 'count', label: 'Quantidade', format: 'number' },
          ],
          data: data.typeCounts || [],
          dateRange,
        });
        break;
      case 'avg-ticket':
        generateReportPdf({
          title: `Clientes - ${tabLabel}`,
          columns: [
            { key: 'name', label: 'Nome' },
            { key: 'type', label: 'Tipo' },
            { key: 'total_sales', label: 'Vendas', format: 'number' },
            { key: 'total_revenue', label: 'Receita Total', format: 'currency' },
            { key: 'avg_ticket', label: 'Ticket Médio', format: 'currency' },
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
      case 'revenue-ranking': return <RevenueRankingContent data={data} formatPrice={formatPrice} />;
      case 'defaulters': return <DefaultersContent data={data} formatPrice={formatPrice} />;
      case 'frequency': return <FrequencyContent data={data} formatPrice={formatPrice} />;
      case 'by-type': return <ByTypeContent data={data} formatPrice={formatPrice} />;
      case 'avg-ticket': return <AvgTicketContent data={data} formatPrice={formatPrice} />;
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
              Relatórios de Clientes
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

/* ==================== REVENUE RANKING ==================== */
function RevenueRankingContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  const typeBadge = (type: string) => {
    const t = type?.toUpperCase();
    if (t === 'INDIVIDUAL' || t === 'PESSOA_FISICA') return 'bg-blue-100 text-blue-700';
    if (t === 'BUSINESS' || t === 'PESSOA_JURIDICA') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Clientes</div>
          <div className="text-2xl font-bold text-blue-700">{data.totalCustomers ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Receita Total</div>
          <div className="text-2xl font-bold text-green-700">{formatPrice(data.totalRevenue ?? 0)}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 15 Clientes por Faturamento</h3>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pago</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pendente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(row.type)}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_sales ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.total_revenue) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{formatPrice(Number(row.total_paid) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right text-orange-600">{formatPrice(Number(row.total_pending) || 0)}</td>
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

/* ==================== DEFAULTERS ==================== */
function DefaultersContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = [...(data.items || [])].sort((a: any, b: any) => (Number(b.overdue_amount) || 0) - (Number(a.overdue_amount) || 0));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total Inadimplentes</div>
          <div className="text-2xl font-bold text-red-600">{data.totalDefaulters ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Valor Vencido</div>
          <div className="text-2xl font-bold text-red-700">{formatPrice(data.totalOverdueAmount ?? 0)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Parcelas Vencidas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Vencido</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venc. Mais Antigo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dias Atraso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => {
                const severeOverdue = Number(row.max_days_overdue) > 90;
                return (
                  <tr key={row.id || row.name} className={`hover:bg-gray-50 ${severeOverdue ? 'bg-red-50' : ''}`}>
                    <td className={`px-4 py-3 text-sm font-medium ${severeOverdue ? 'text-red-700' : ''}`}>{row.name}</td>
                    <td className="px-4 py-3 text-sm">{row.type}</td>
                    <td className="px-4 py-3 text-sm">{row.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{row.overdue_installments ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatPrice(Number(row.overdue_amount) || 0)}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.oldest_due_date ? new Date(row.oldest_due_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${severeOverdue ? 'text-red-600' : ''}`}>
                      {row.max_days_overdue != null ? `${row.max_days_overdue} dias` : '-'}
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

/* ==================== FREQUENCY ==================== */
function FrequencyContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Compras</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primeira Compra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Compra</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Média Dias entre Compras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_purchases ?? 0}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.first_purchase ? new Date(row.first_purchase).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.last_purchase ? new Date(row.last_purchase).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {row.avg_days_between != null ? `${row.avg_days_between} dias` : '-'}
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

/* ==================== BY TYPE ==================== */
function ByTypeContent({ data }: { data: any; formatPrice: (v: number) => string }) {
  const typeCounts: { type: string; count: number }[] = data.typeCounts || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-blue-700">{data.total ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Ativos</div>
          <div className="text-2xl font-bold text-green-700">{data.active ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Inativos</div>
          <div className="text-2xl font-bold text-gray-500">{data.inactive ?? 0}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {typeCounts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Tipo</h3>
          <div className="h-48 flex items-end gap-1">
            {typeCounts.map((item: any, i: number) => {
              const maxVal = Math.max(...typeCounts.map((d: any) => Number(d.count) || 0), 1);
              const h = ((Number(item.count) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.type}: {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== AVG TICKET ==================== */
function AvgTicketContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const items = data.items || [];
  const chartItems = items.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-sm text-gray-500 mb-1">Ticket Médio Geral</div>
          <div className="text-2xl font-bold text-blue-700">{formatPrice(data.overallAvgTicket ?? 0)}</div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold mb-3">Top 15 por Ticket Médio</h3>
          <div className="h-48 flex items-end gap-1">
            {chartItems.map((item: any, i: number) => {
              const maxVal = Math.max(...chartItems.map((d: any) => Number(d.avg_ticket) || 0), 1);
              const h = ((Number(item.avg_ticket) || 0) / maxVal) * 100;
              return (
                <div key={i} className="flex-1 min-w-[16px] group relative">
                  <div className="bg-blue-400 hover:bg-blue-500 rounded-t mx-px transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {item.name}: {formatPrice(Number(item.avg_ticket) || 0)}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: any) => (
                <tr key={row.id || row.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.total_sales ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPrice(Number(row.total_revenue) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(Number(row.avg_ticket) || 0)}</td>
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
