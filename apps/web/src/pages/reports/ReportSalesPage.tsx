import { useState } from 'react';
import { useSalesReportV2, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { DollarSign, FileDown, Calendar } from 'lucide-react';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartao Credito',
  DEBIT_CARD: 'Cartao Debito',
  BANK_TRANSFER: 'Transferencia',
  PIX: 'Pix',
  CHECK: 'Cheque',
  PROMISSORY: 'Promissoria',
  BOLETO: 'Boleto',
  OTHER: 'Outro',
};

const TABS = [
  { id: 'by-period', label: 'Vendas por Periodo' },
  { id: 'by-seller', label: 'Vendas por Vendedor' },
  { id: 'by-payment', label: 'Por Forma de Pagamento' },
  { id: 'comparison', label: 'Comparativo' },
  { id: 'by-category', label: 'Por Categoria' },
];

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
              <div className={`${color} h-6 rounded-full transition-all`} style={{ width: `${pct}%` }} />
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

// ---- Content: Vendas por Periodo ----
function ByPeriodContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const periods = data.periods || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Receita Total</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(data.totalRevenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Vendas</p>
          <p className="text-2xl font-bold text-blue-600">{data.totalSales || 0}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Receita por Periodo</h3>
        <SimpleBarChart items={periods} labelKey="period" valueKey="total_revenue" formatValue={formatPrice} color="bg-green-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Medio</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periods.map((p: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm text-gray-900">{p.period}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{p.total_sales}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(p.total_revenue))}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{formatPrice(Number(p.avg_ticket))}</td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Vendas por Vendedor ----
function BySellerContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const sellers = data.sellers || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Receita Total</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(data.totalRevenue || 0)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Receita por Vendedor</h3>
        <SimpleBarChart items={sellers} labelKey="seller_name" valueKey="total_revenue" formatValue={formatPrice} color="bg-blue-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Medio</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sellers.map((s: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm text-gray-900">{s.seller_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{s.total_sales}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(s.total_revenue))}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{formatPrice(Number(s.avg_ticket))}</td>
                </tr>
              ))}
              {sellers.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Por Forma de Pagamento ----
function ByPaymentContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const methods = data.methods || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(data.totalAmount || 0)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Por Forma de Pagamento</h3>
        <SimpleBarChart
          items={methods.map((m: any) => ({ ...m, label: PAYMENT_METHOD_LABELS[m.payment_method] || m.payment_method }))}
          labelKey="label"
          valueKey="total_amount"
          formatValue={formatPrice}
          color="bg-purple-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pagamento</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagamentos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {methods.map((m: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm text-gray-900">{PAYMENT_METHOD_LABELS[m.payment_method] || m.payment_method}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{m.total_payments}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(m.total_amount))}</td>
                </tr>
              ))}
              {methods.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Comparativo ----
function ComparisonContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const current = data.current || {};
  const previous = data.previous || {};
  const deltaRevenue = data.deltaRevenue ?? 0;
  const deltaSales = data.deltaSales ?? 0;
  const deltaTicket = data.deltaTicket ?? 0;

  const deltaColor = (v: number) => v >= 0 ? 'text-green-600' : 'text-red-600';
  const deltaArrow = (v: number) => v >= 0 ? '+' : '';

  const metrics = [
    { label: 'Receita', current: current.revenue, previous: previous.revenue, delta: deltaRevenue, isCurrency: true },
    { label: 'Vendas', current: current.sales, previous: previous.sales, delta: deltaSales, isCurrency: false },
    { label: 'Ticket Medio', current: current.avg_ticket, previous: previous.avg_ticket, delta: deltaTicket, isCurrency: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {m.isCurrency ? formatPrice(m.current || 0) : (m.current || 0)}
            </p>
            <p className={`text-sm font-medium mt-1 ${deltaColor(m.delta)}`}>
              {deltaArrow(m.delta)}{m.delta.toFixed(1)}% vs periodo anterior
            </p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Atual vs Anterior</h3>
        <div className="space-y-4">
          {metrics.map((m, i) => {
            const curVal = Number(m.current) || 0;
            const prevVal = Number(m.previous) || 0;
            const maxVal = Math.max(curVal, prevVal, 1);
            return (
              <div key={i} className="space-y-1">
                <p className="text-sm font-medium text-gray-700">{m.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-14">Atual</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5">
                    <div className="bg-green-500 h-5 rounded-full" style={{ width: `${(curVal / maxVal) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-28 text-right">{m.isCurrency ? formatPrice(curVal) : curVal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-14">Anterior</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5">
                    <div className="bg-gray-400 h-5 rounded-full" style={{ width: `${(prevVal / maxVal) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-28 text-right">{m.isCurrency ? formatPrice(prevVal) : prevVal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Content: Por Categoria ----
function ByCategoryContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const categories = data.categories || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Receita Total</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(data.totalRevenue || 0)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Receita por Categoria</h3>
        <SimpleBarChart items={categories} labelKey="category" valueKey="total_revenue" formatValue={formatPrice} color="bg-emerald-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((c: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm text-gray-900">{c.category}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{c.total_sales}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{c.total_quantity}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(c.total_revenue))}</td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export function ReportSalesPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useSalesReportV2(activeTab, filters);

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
      case 'by-period':
        kpis = [
          { label: 'Receita Total', value: formatPrice(data.totalRevenue || 0) },
          { label: 'Total Vendas', value: String(data.totalSales || 0) },
        ];
        columns = [
          { key: 'period', label: 'Periodo', format: 'text' },
          { key: 'total_sales', label: 'Vendas', format: 'number', align: 'right' },
          { key: 'total_revenue', label: 'Receita', format: 'currency', align: 'right' },
          { key: 'avg_ticket', label: 'Ticket Medio', format: 'currency', align: 'right' },
        ];
        rows = data.periods || [];
        break;
      case 'by-seller':
        kpis = [{ label: 'Receita Total', value: formatPrice(data.totalRevenue || 0) }];
        columns = [
          { key: 'seller_name', label: 'Vendedor', format: 'text' },
          { key: 'total_sales', label: 'Vendas', format: 'number', align: 'right' },
          { key: 'total_revenue', label: 'Receita', format: 'currency', align: 'right' },
          { key: 'avg_ticket', label: 'Ticket Medio', format: 'currency', align: 'right' },
        ];
        rows = data.sellers || [];
        break;
      case 'by-payment':
        kpis = [{ label: 'Total', value: formatPrice(data.totalAmount || 0) }];
        columns = [
          { key: 'payment_method', label: 'Forma de Pagamento', format: 'text' },
          { key: 'total_payments', label: 'Pagamentos', format: 'number', align: 'right' },
          { key: 'total_amount', label: 'Total', format: 'currency', align: 'right' },
        ];
        rows = (data.methods || []).map((m: any) => ({
          ...m,
          payment_method: PAYMENT_METHOD_LABELS[m.payment_method] || m.payment_method,
        }));
        break;
      case 'comparison':
        kpis = [
          { label: 'Receita Atual', value: formatPrice(data.current?.revenue || 0) },
          { label: 'Vendas Atuais', value: String(data.current?.sales || 0) },
          { label: 'Delta Receita', value: `${(data.deltaRevenue ?? 0).toFixed(1)}%` },
        ];
        columns = [
          { key: 'metric', label: 'Metrica', format: 'text' },
          { key: 'current', label: 'Atual', format: 'text', align: 'right' },
          { key: 'previous', label: 'Anterior', format: 'text', align: 'right' },
          { key: 'delta', label: 'Variacao %', format: 'text', align: 'right' },
        ];
        rows = [
          { metric: 'Receita', current: formatPrice(data.current?.revenue || 0), previous: formatPrice(data.previous?.revenue || 0), delta: `${(data.deltaRevenue ?? 0).toFixed(1)}%` },
          { metric: 'Vendas', current: String(data.current?.sales || 0), previous: String(data.previous?.sales || 0), delta: `${(data.deltaSales ?? 0).toFixed(1)}%` },
          { metric: 'Ticket Medio', current: formatPrice(data.current?.avg_ticket || 0), previous: formatPrice(data.previous?.avg_ticket || 0), delta: `${(data.deltaTicket ?? 0).toFixed(1)}%` },
        ];
        break;
      case 'by-category':
        kpis = [{ label: 'Receita Total', value: formatPrice(data.totalRevenue || 0) }];
        columns = [
          { key: 'category', label: 'Categoria', format: 'text' },
          { key: 'total_sales', label: 'Vendas', format: 'number', align: 'right' },
          { key: 'total_quantity', label: 'Quantidade', format: 'number', align: 'right' },
          { key: 'total_revenue', label: 'Receita', format: 'currency', align: 'right' },
        ];
        rows = data.categories || [];
        break;
    }

    generateReportPdf({
      title: 'Relatorios de Vendas',
      subtitle: tabLabel,
      kpis,
      columns,
      data: rows,
      fileName: `relatorio-vendas-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`,
      dateRange: { start: startDate, end: endDate },
    });
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-20 text-gray-500">Nenhum dado encontrado</div>;
    switch (activeTab) {
      case 'by-period': return <ByPeriodContent data={data} formatPrice={formatPrice} />;
      case 'by-seller': return <BySellerContent data={data} formatPrice={formatPrice} />;
      case 'by-payment': return <ByPaymentContent data={data} formatPrice={formatPrice} />;
      case 'comparison': return <ComparisonContent data={data} formatPrice={formatPrice} />;
      case 'by-category': return <ByCategoryContent data={data} formatPrice={formatPrice} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-blue-600" /> Relatorios de Vendas
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
