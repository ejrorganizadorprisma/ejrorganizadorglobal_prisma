import { useState } from 'react';
import { usePurchasesReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { ShoppingCart, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'by-status', label: 'Por Status' },
  { id: 'by-priority', label: 'Por Prioridade' },
  { id: 'quote-comparison', label: 'Comparativo de Cotacoes' },
  { id: 'by-period', label: 'Volume por Periodo' },
  { id: 'approval-time', label: 'Tempo de Aprovacao' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-700' },
  PENDING: { label: 'Pendente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  APPROVED: { label: 'Aprovado', bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-700' },
  ORDERED: { label: 'Pedido', bg: 'bg-blue-100', text: 'text-blue-700' },
  PURCHASED: { label: 'Comprado', bg: 'bg-purple-100', text: 'text-purple-700' },
  RECEIVED: { label: 'Recebido', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  LOW: { label: 'Baixa', bg: 'bg-gray-100', text: 'text-gray-700' },
  NORMAL: { label: 'Normal', bg: 'bg-blue-100', text: 'text-blue-700' },
  HIGH: { label: 'Alta', bg: 'bg-orange-100', text: 'text-orange-700' },
  URGENT: { label: 'Urgente', bg: 'bg-red-100', text: 'text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || { label: priority, bg: 'bg-gray-100', text: 'text-gray-700' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

// ---- Simple bar chart ----
function SimpleBarChart({ items, labelKey, valueKey, formatValue, color = 'bg-blue-500' }: {
  items: any[];
  labelKey: string;
  valueKey: string;
  formatValue?: (v: number) => string;
  color?: string;
}) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map(i => Number(i[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((item, idx) => {
        const value = Number(item[valueKey]) || 0;
        const pct = (value / max) * 100;
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-36 truncate text-right">{item[labelKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
              <div className={`${item.barColor || color} h-6 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-medium text-gray-700 w-32 text-right">
              {formatValue ? formatValue(value) : value.toLocaleString('pt-BR')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Content: Por Status ----
function ByStatusContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const statuses = data.statuses || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Orcamentos</p>
          <p className="text-2xl font-bold text-blue-600">{data.total || 0}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuicao por Status</h3>
        <SimpleBarChart
          items={statuses.map((s: any) => ({ ...s, label: STATUS_CONFIG[s.status]?.label || s.status }))}
          labelKey="label"
          valueKey="count"
          color="bg-blue-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statuses.map((s: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{s.count}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(s.total_value))}</td>
                </tr>
              ))}
              {statuses.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Por Prioridade ----
function ByPriorityContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const priorities = data.priorities || [];
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuicao por Prioridade</h3>
        <SimpleBarChart
          items={priorities.map((p: any) => ({ ...p, label: PRIORITY_CONFIG[p.priority]?.label || p.priority }))}
          labelKey="label"
          valueKey="count"
          color="bg-orange-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {priorities.map((p: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm"><PriorityBadge priority={p.priority} /></td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{p.count}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(p.total_value))}</td>
                </tr>
              ))}
              {priorities.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Comparativo de Cotacoes ----
function QuoteComparisonContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const products = data.products || [];
  const fmt2 = (v: number) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {data.avgSavingPotential != null && (
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">Potencial de Economia</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(data.avgSavingPotential)}</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cotacoes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Menor Preco</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Maior Preco</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco Medio</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variacao</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((p: any, i: number) => {
                const minPrice = Number(p.min_price);
                const maxPrice = Number(p.max_price);
                const avgPrice = Number(p.avg_price);
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.product_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{p.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{p.quote_count}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="font-medium text-green-600">{fmt2(minPrice)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt2(maxPrice)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt2(avgPrice)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{fmt2(Number(p.price_spread))}</td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Volume por Periodo ----
function ByPeriodContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const periods = data.periods || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Comprado</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(data.totalValue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Pedidos</p>
          <p className="text-2xl font-bold text-blue-600">{data.totalOrders || 0}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Volume por Periodo</h3>
        <SimpleBarChart items={periods} labelKey="period" valueKey="total_value" formatValue={formatPrice} color="bg-orange-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periods.map((p: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm text-gray-900">{p.period}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{p.total_orders}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(p.total_value))}</td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Tempo de Aprovacao ----
function ApprovalTimeContent({ data }: { data: any }) {
  const items = data.items || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Tempo Medio de Aprovacao</p>
          <p className="text-2xl font-bold text-blue-600">{data.avgApprovalDays != null ? `${Number(data.avgApprovalDays).toFixed(1)} dias` : '-'}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titulo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprovado por</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Criado em</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aprovado em</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tempo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item: any, i: number) => {
                const days = Number(item.approval_days) || 0;
                const isSlow = days > 7;
                return (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isSlow ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.budget_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-sm"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.approved_by_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.approved_at ? new Date(item.approved_at).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${isSlow ? 'text-amber-600' : 'text-gray-700'}`}>
                        {days} dias
                      </span>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export function ReportPurchasesPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = usePurchasesReport(activeTab, filters);

  const setPreset = (days: number | 'year' | 'all') => {
    if (days === 'all') { setStartDate(''); setEndDate(''); return; }
    const end = new Date();
    const start = days === 'year' ? startOfYear(end) : subDays(end, days as number);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handleExportPdf = () => {
    if (!data) return;
    let columns: any[] = [];
    let rows: any[] = [];
    let kpis: { label: string; value: string }[] = [];
    const tabLabel = TABS.find(t => t.id === activeTab)?.label || '';

    switch (activeTab) {
      case 'by-status':
        kpis = [{ label: 'Total Orcamentos', value: String(data.total || 0) }];
        columns = [
          { key: 'status', label: 'Status', format: 'text' },
          { key: 'count', label: 'Quantidade', format: 'number', align: 'right' },
          { key: 'total_value', label: 'Valor Total', format: 'currency', align: 'right' },
        ];
        rows = (data.statuses || []).map((s: any) => ({
          ...s,
          status: STATUS_CONFIG[s.status]?.label || s.status,
        }));
        break;
      case 'by-priority':
        columns = [
          { key: 'priority', label: 'Prioridade', format: 'text' },
          { key: 'count', label: 'Quantidade', format: 'number', align: 'right' },
          { key: 'total_value', label: 'Valor Total', format: 'currency', align: 'right' },
        ];
        rows = (data.priorities || []).map((p: any) => ({
          ...p,
          priority: PRIORITY_CONFIG[p.priority]?.label || p.priority,
        }));
        break;
      case 'quote-comparison':
        if (data.avgSavingPotential != null) {
          kpis = [{ label: 'Potencial de Economia', value: formatPrice(data.avgSavingPotential) }];
        }
        columns = [
          { key: 'product_code', label: 'Codigo', format: 'text' },
          { key: 'product_name', label: 'Produto', format: 'text' },
          { key: 'quantity', label: 'Qtd', format: 'number', align: 'right' },
          { key: 'quote_count', label: 'Cotacoes', format: 'number', align: 'right' },
          { key: 'min_price', label: 'Menor', format: 'number', align: 'right' },
          { key: 'max_price', label: 'Maior', format: 'number', align: 'right' },
          { key: 'avg_price', label: 'Medio', format: 'number', align: 'right' },
          { key: 'price_spread', label: 'Variacao', format: 'number', align: 'right' },
        ];
        rows = data.products || [];
        break;
      case 'by-period':
        kpis = [
          { label: 'Total Comprado', value: formatPrice(data.totalValue || 0) },
          { label: 'Total Pedidos', value: String(data.totalOrders || 0) },
        ];
        columns = [
          { key: 'period', label: 'Periodo', format: 'text' },
          { key: 'total_orders', label: 'Pedidos', format: 'number', align: 'right' },
          { key: 'total_value', label: 'Valor Total', format: 'currency', align: 'right' },
        ];
        rows = data.periods || [];
        break;
      case 'approval-time':
        kpis = [{ label: 'Tempo Medio', value: data.avgApprovalDays != null ? `${Number(data.avgApprovalDays).toFixed(1)} dias` : '-' }];
        columns = [
          { key: 'budget_number', label: 'Numero', format: 'text' },
          { key: 'title', label: 'Titulo', format: 'text' },
          { key: 'priority', label: 'Prioridade', format: 'text' },
          { key: 'approved_by_name', label: 'Aprovado por', format: 'text' },
          { key: 'created_at', label: 'Criado em', format: 'date', align: 'right' },
          { key: 'approved_at', label: 'Aprovado em', format: 'date', align: 'right' },
          { key: 'approval_days', label: 'Tempo (dias)', format: 'number', align: 'right' },
        ];
        rows = (data.items || []).map((item: any) => ({
          ...item,
          priority: PRIORITY_CONFIG[item.priority]?.label || item.priority,
        }));
        break;
    }

    generateReportPdf({
      title: 'Relatorios de Orcamentos de Compra',
      subtitle: tabLabel,
      kpis,
      columns,
      data: rows,
      fileName: `relatorio-compras-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`,
      dateRange: { start: startDate, end: endDate },
    });
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-20 text-gray-500">Nenhum dado encontrado</div>;
    switch (activeTab) {
      case 'by-status': return <ByStatusContent data={data} formatPrice={formatPrice} />;
      case 'by-priority': return <ByPriorityContent data={data} formatPrice={formatPrice} />;
      case 'quote-comparison': return <QuoteComparisonContent data={data} formatPrice={formatPrice} />;
      case 'by-period': return <ByPeriodContent data={data} formatPrice={formatPrice} />;
      case 'approval-time': return <ApprovalTimeContent data={data} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-600" /> Relatorios de Orcamentos de Compra
          </h1>
          <button onClick={handleExportPdf} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
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
        <div className="bg-white rounded-xl shadow-sm border mb-4 overflow-hidden">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{tab.label}</button>
            ))}
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
