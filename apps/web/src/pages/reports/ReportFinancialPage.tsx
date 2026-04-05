import { useState } from 'react';
import { useFinancialReport, type ReportFilters } from '../../hooks/useReports';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { generateReportPdf } from '../../utils/generateReportPdf';
import { subDays, startOfYear, format } from 'date-fns';
import { Wallet, FileDown, Calendar } from 'lucide-react';

const TABS = [
  { id: 'cash-flow', label: 'Fluxo de Caixa' },
  { id: 'aging-receivables', label: 'Aging Recebiveis' },
  { id: 'aging-payables', label: 'Aging Pagaveis' },
  { id: 'dre', label: 'DRE Simplificado' },
  { id: 'delinquency', label: 'Inadimplencia' },
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

// ---- Dual bar chart ----
function DualBarChart({ items, labelKey, valueKey1, valueKey2, label1, label2, color1, color2, formatValue }: {
  items: any[];
  labelKey: string;
  valueKey1: string;
  valueKey2: string;
  label1: string;
  label2: string;
  color1: string;
  color2: string;
  formatValue?: (v: number) => string;
}) {
  if (!items || items.length === 0) return null;
  const allVals = items.flatMap(i => [Number(i[valueKey1]) || 0, Number(i[valueKey2]) || 0]);
  const max = Math.max(...allVals, 1);
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${color1}`} />{label1}</span>
        <span className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${color2}`} />{label2}</span>
      </div>
      {items.slice(0, 12).map((item, idx) => {
        const v1 = Number(item[valueKey1]) || 0;
        const v2 = Number(item[valueKey2]) || 0;
        return (
          <div key={idx} className="space-y-1">
            <span className="text-xs text-gray-600">{item[labelKey]}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-4">
                <div className={`${color1} h-4 rounded-full`} style={{ width: `${(v1 / max) * 100}%` }} />
              </div>
              <span className="text-xs font-medium w-28 text-right">{formatValue ? formatValue(v1) : v1.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-4">
                <div className={`${color2} h-4 rounded-full`} style={{ width: `${(v2 / max) * 100}%` }} />
              </div>
              <span className="text-xs font-medium w-28 text-right">{formatValue ? formatValue(v2) : v2.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Content: Fluxo de Caixa ----
function CashFlowContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const periods = data.periods || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Recebido</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(data.totalReceived || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Pago</p>
          <p className="text-2xl font-bold text-red-600">{formatPrice(data.totalPaid || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Saldo</p>
          <p className="text-2xl font-bold text-blue-600">{formatPrice(data.netBalance || 0)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recebimentos vs Pagamentos</h3>
        <DualBarChart
          items={periods}
          labelKey="period"
          valueKey1="received"
          valueKey2="paid"
          label1="Recebido"
          label2="Pago"
          color1="bg-green-500"
          color2="bg-red-400"
          formatValue={formatPrice}
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recebido</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pago</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periods.map((p: any, i: number) => {
                const balance = Number(p.balance) || (Number(p.received) - Number(p.paid));
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-3 text-sm text-gray-900">{p.period}</td>
                    <td className="px-6 py-3 text-sm text-green-600 text-right font-medium">{formatPrice(Number(p.received))}</td>
                    <td className="px-6 py-3 text-sm text-red-600 text-right font-medium">{formatPrice(Number(p.paid))}</td>
                    <td className={`px-6 py-3 text-sm text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPrice(balance)}
                    </td>
                  </tr>
                );
              })}
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

// ---- Content: Aging Recebiveis ----
function AgingReceivablesContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const buckets = data.buckets || [];
  const entries = data.entries || [];
  const bucketColors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
  const bucketLabels = ['0-30 dias', '31-60 dias', '61-90 dias', '90+ dias'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-5 sm:col-span-1">
          <p className="text-sm text-gray-500">Total a Receber</p>
          <p className="text-2xl font-bold text-blue-600">{formatPrice(data.total || 0)}</p>
        </div>
        {buckets.map((b: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">{b.label || bucketLabels[i] || `Faixa ${i + 1}`}</p>
            <p className="text-xl font-bold text-gray-900">{formatPrice(Number(b.amount) || 0)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuicao por Faixa</h3>
        <SimpleBarChart
          items={buckets.map((b: any, i: number) => ({ ...b, label: b.label || bucketLabels[i] || `Faixa ${i + 1}`, barColor: bucketColors[i] || 'bg-gray-500' }))}
          labelKey="label"
          valueKey="amount"
          formatValue={formatPrice}
        />
      </div>
      {entries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((e: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-3 text-sm text-gray-900">{e.customer_name || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{formatPrice(Number(e.amount))}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">{e.due_date ? new Date(e.due_date).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right">
                      <span className={`font-medium ${Number(e.days_overdue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {e.days_overdue ?? '-'}
                      </span>
                    </td>
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

// ---- Content: Aging Pagaveis ----
function AgingPayablesContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const buckets = data.buckets || [];
  const entries = data.entries || [];
  const bucketColors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
  const bucketLabels = ['0-30 dias', '31-60 dias', '61-90 dias', '90+ dias'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-5 sm:col-span-1">
          <p className="text-sm text-gray-500">Total a Pagar</p>
          <p className="text-2xl font-bold text-red-600">{formatPrice(data.total || 0)}</p>
        </div>
        {buckets.map((b: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500">{b.label || bucketLabels[i] || `Faixa ${i + 1}`}</p>
            <p className="text-xl font-bold text-gray-900">{formatPrice(Number(b.amount) || 0)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuicao por Faixa</h3>
        <SimpleBarChart
          items={buckets.map((b: any, i: number) => ({ ...b, label: b.label || bucketLabels[i] || `Faixa ${i + 1}`, barColor: bucketColors[i] || 'bg-gray-500' }))}
          labelKey="label"
          valueKey="amount"
          formatValue={formatPrice}
        />
      </div>
      {entries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((e: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-3 text-sm text-gray-900">{e.supplier_name || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{formatPrice(Number(e.amount))}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">{e.due_date ? new Date(e.due_date).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right">
                      <span className={`font-medium ${Number(e.days_overdue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {e.days_overdue ?? '-'}
                      </span>
                    </td>
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

// ---- Content: DRE Simplificado ----
function DreContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const revenue = Number(data.revenue) || 0;
  const cogs = Number(data.cogs) || 0;
  const grossProfit = Number(data.grossProfit) || 0;
  const netResult = Number(data.netResult) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Receita</p>
          <p className="text-3xl font-bold text-green-600">{formatPrice(revenue)}</p>
          <div className="mt-3 text-green-500">
            <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">CMV (Custo)</p>
          <p className="text-3xl font-bold text-amber-600">{formatPrice(cogs)}</p>
          <div className="mt-3 text-amber-500">
            <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Lucro Bruto</p>
          <p className="text-3xl font-bold text-blue-600">{formatPrice(grossProfit)}</p>
          <div className="mt-3 text-blue-500">
            <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Resultado</p>
          <p className={`text-3xl font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(netResult)}</p>
          <div className={`mt-3 ${netResult >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {netResult >= 0
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              }
            </svg>
          </div>
        </div>
      </div>
      {/* Flow visualization */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-6">Fluxo do Resultado</h3>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-green-600">Receita</p>
            <p className="text-lg font-bold text-green-700">{formatPrice(revenue)}</p>
          </div>
          <span className="text-2xl text-gray-300 font-light">-</span>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-amber-600">CMV</p>
            <p className="text-lg font-bold text-amber-700">{formatPrice(cogs)}</p>
          </div>
          <span className="text-2xl text-gray-300 font-light">=</span>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-blue-600">Lucro Bruto</p>
            <p className="text-lg font-bold text-blue-700">{formatPrice(grossProfit)}</p>
          </div>
          <span className="text-2xl text-gray-300 font-light">=</span>
          <div className={`${netResult >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg px-4 py-3 text-center`}>
            <p className={`text-xs ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>Resultado</p>
            <p className={`text-lg font-bold ${netResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatPrice(netResult)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Content: Inadimplencia ----
function DelinquencyContent({ data, formatPrice }: { data: any; formatPrice: (v: number) => string }) {
  const periods = data.periods || [];
  const totalOverdue = periods.reduce((sum: number, p: any) => sum + (Number(p.overdue_amount) || 0), 0);
  const totalAmount = periods.reduce((sum: number, p: any) => sum + (Number(p.total_amount) || 0), 0);
  const avgRate = totalAmount > 0 ? ((totalOverdue / totalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total em Aberto</p>
          <p className="text-2xl font-bold text-blue-600">{formatPrice(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total em Atraso</p>
          <p className="text-2xl font-bold text-red-600">{formatPrice(totalOverdue)}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Taxa Media</p>
          <p className={`text-2xl font-bold ${avgRate > 10 ? 'text-red-600' : 'text-green-600'}`}>{avgRate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Total vs Em Atraso</h3>
        <DualBarChart
          items={periods}
          labelKey="period"
          valueKey1="total_amount"
          valueKey2="overdue_amount"
          label1="Total"
          label2="Em Atraso"
          color1="bg-blue-400"
          color2="bg-red-400"
          formatValue={formatPrice}
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Parcelas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Em Atraso</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor em Atraso</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periods.map((p: any, i: number) => {
                const rate = Number(p.rate) || (Number(p.total_amount) > 0 ? ((Number(p.overdue_amount) / Number(p.total_amount)) * 100) : 0);
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-3 text-sm text-gray-900">{p.period}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right">{p.total_installments}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right">{p.overdue_installments}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatPrice(Number(p.total_amount))}</td>
                    <td className="px-6 py-3 text-sm font-medium text-red-600 text-right">{formatPrice(Number(p.overdue_amount))}</td>
                    <td className="px-6 py-3 text-sm text-right">
                      <span className={`font-bold ${rate > 10 ? 'text-red-600' : 'text-green-600'}`}>{rate.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
              {periods.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export function ReportFinancialPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { formatPrice } = useFormatPrice();

  const filters: ReportFilters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data, isLoading } = useFinancialReport(activeTab, filters);

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
      case 'cash-flow':
        kpis = [
          { label: 'Total Recebido', value: formatPrice(data.totalReceived || 0) },
          { label: 'Total Pago', value: formatPrice(data.totalPaid || 0) },
          { label: 'Saldo', value: formatPrice(data.netBalance || 0) },
        ];
        columns = [
          { key: 'period', label: 'Periodo', format: 'text' },
          { key: 'received', label: 'Recebido', format: 'currency', align: 'right' },
          { key: 'paid', label: 'Pago', format: 'currency', align: 'right' },
          { key: 'balance', label: 'Saldo', format: 'currency', align: 'right' },
        ];
        rows = (data.periods || []).map((p: any) => ({
          ...p,
          balance: Number(p.balance) || (Number(p.received) - Number(p.paid)),
        }));
        break;
      case 'aging-receivables':
        kpis = [{ label: 'Total a Receber', value: formatPrice(data.total || 0) }];
        (data.buckets || []).forEach((b: any, i: number) => {
          const labels = ['0-30 dias', '31-60 dias', '61-90 dias', '90+ dias'];
          kpis.push({ label: b.label || labels[i] || `Faixa ${i + 1}`, value: formatPrice(Number(b.amount) || 0) });
        });
        columns = [
          { key: 'customer_name', label: 'Cliente', format: 'text' },
          { key: 'amount', label: 'Valor', format: 'currency', align: 'right' },
          { key: 'due_date', label: 'Vencimento', format: 'date', align: 'right' },
          { key: 'days_overdue', label: 'Dias Atraso', format: 'number', align: 'right' },
        ];
        rows = data.entries || [];
        break;
      case 'aging-payables':
        kpis = [{ label: 'Total a Pagar', value: formatPrice(data.total || 0) }];
        (data.buckets || []).forEach((b: any, i: number) => {
          const labels = ['0-30 dias', '31-60 dias', '61-90 dias', '90+ dias'];
          kpis.push({ label: b.label || labels[i] || `Faixa ${i + 1}`, value: formatPrice(Number(b.amount) || 0) });
        });
        columns = [
          { key: 'supplier_name', label: 'Fornecedor', format: 'text' },
          { key: 'amount', label: 'Valor', format: 'currency', align: 'right' },
          { key: 'due_date', label: 'Vencimento', format: 'date', align: 'right' },
          { key: 'days_overdue', label: 'Dias Atraso', format: 'number', align: 'right' },
        ];
        rows = data.entries || [];
        break;
      case 'dre':
        kpis = [
          { label: 'Receita', value: formatPrice(data.revenue || 0) },
          { label: 'CMV', value: formatPrice(data.cogs || 0) },
          { label: 'Lucro Bruto', value: formatPrice(data.grossProfit || 0) },
          { label: 'Resultado', value: formatPrice(data.netResult || 0) },
        ];
        columns = [
          { key: 'item', label: 'Item', format: 'text' },
          { key: 'value', label: 'Valor', format: 'currency', align: 'right' },
        ];
        rows = [
          { item: 'Receita', value: data.revenue || 0 },
          { item: '(-) CMV', value: data.cogs || 0 },
          { item: '(=) Lucro Bruto', value: data.grossProfit || 0 },
          { item: '(=) Resultado', value: data.netResult || 0 },
        ];
        break;
      case 'delinquency':
        {
          const periods = data.periods || [];
          const totalOverdue = periods.reduce((s: number, p: any) => s + (Number(p.overdue_amount) || 0), 0);
          const totalAmount = periods.reduce((s: number, p: any) => s + (Number(p.total_amount) || 0), 0);
          kpis = [
            { label: 'Total em Aberto', value: formatPrice(totalAmount) },
            { label: 'Total em Atraso', value: formatPrice(totalOverdue) },
          ];
          columns = [
            { key: 'period', label: 'Periodo', format: 'text' },
            { key: 'total_installments', label: 'Parcelas', format: 'number', align: 'right' },
            { key: 'overdue_installments', label: 'Em Atraso', format: 'number', align: 'right' },
            { key: 'total_amount', label: 'Valor Total', format: 'currency', align: 'right' },
            { key: 'overdue_amount', label: 'Valor Atraso', format: 'currency', align: 'right' },
            { key: 'rate', label: 'Taxa', format: 'percent', align: 'right' },
          ];
          rows = periods.map((p: any) => ({
            ...p,
            rate: Number(p.rate) || (Number(p.total_amount) > 0 ? ((Number(p.overdue_amount) / Number(p.total_amount)) * 100) : 0),
          }));
        }
        break;
    }

    generateReportPdf({
      title: 'Relatorios Financeiros',
      subtitle: tabLabel,
      kpis,
      columns,
      data: rows,
      fileName: `relatorio-financeiro-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`,
      dateRange: { start: startDate, end: endDate },
    });
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-20 text-gray-500">Nenhum dado encontrado</div>;
    switch (activeTab) {
      case 'cash-flow': return <CashFlowContent data={data} formatPrice={formatPrice} />;
      case 'aging-receivables': return <AgingReceivablesContent data={data} formatPrice={formatPrice} />;
      case 'aging-payables': return <AgingPayablesContent data={data} formatPrice={formatPrice} />;
      case 'dre': return <DreContent data={data} formatPrice={formatPrice} />;
      case 'delinquency': return <DelinquencyContent data={data} formatPrice={formatPrice} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-blue-600" /> Relatorios Financeiros
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
