import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinancialCalendar } from '../hooks/useFinancial';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useUpdatePayment } from '../hooks/useSales';
import { usePayInstallment } from '../hooks/useFinancial';
import { useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentStatus, type FinancialEntry } from '@ejr/shared-types';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function FinancialCalendarPage() {
  const { formatPrice } = useFormatPrice();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');
  const [payingEntry, setPayingEntry] = useState<FinancialEntry | null>(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const { data: calendar, isLoading } = useFinancialCalendar(monthStr);
  const updatePayment = useUpdatePayment();
  const payInstallment = usePayInstallment();
  const queryClient = useQueryClient();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  // Gerar grid do calendário
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ day: number | null; date: string | null }> = [];

    // Preencher dias vazios antes do primeiro dia
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, date: null });
    }

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, date: dateStr });
    }

    return cells;
  }, [year, month]);

  // Mapa de entries por dia
  const entriesByDate = useMemo(() => {
    const map: Record<string, FinancialEntry[]> = {};
    if (!calendar?.days) return map;
    for (const day of calendar.days) {
      let filtered = day.entries;
      if (filterDirection !== 'ALL') {
        filtered = filtered.filter(e => e.direction === filterDirection);
      }
      if (filterStatus !== 'ALL') {
        filtered = filtered.filter(e => e.status === filterStatus);
      }
      if (filtered.length > 0) {
        map[day.date] = filtered;
      }
    }
    return map;
  }, [calendar, filterDirection, filterStatus]);

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] || []) : [];

  const handleMarkPaid = async (entry: FinancialEntry) => {
    setPayingEntry(entry);
    setPaidDate(new Date().toISOString().split('T')[0]);
  };

  const confirmMarkPaid = async () => {
    if (!payingEntry) return;
    try {
      if (payingEntry.direction === 'RECEIVABLE') {
        await updatePayment.mutateAsync({
          saleId: payingEntry.sourceId,
          paymentId: payingEntry.id,
          data: { status: PaymentStatus.PAID, paidDate },
        });
      } else {
        await payInstallment.mutateAsync({
          budgetId: payingEntry.sourceId,
          installmentId: payingEntry.id,
          paidDate,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      toast.success('Parcela marcada como paga');
      setPayingEntry(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao marcar como pago');
    }
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/financial" className="text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <Wallet className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl lg:text-3xl font-bold">Calendário Financeiro</h1>
        </div>
      </div>

      {/* Filtros + Navegação */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4">
          {/* Navegação do mês */}
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg lg:text-xl font-semibold w-48 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="text-sm text-blue-600 hover:underline ml-2">
              Hoje
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="RECEIVABLE">A Receber</option>
              <option value="PAYABLE">A Pagar</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="ALL">Todos Status</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Atrasado</option>
            </select>
          </div>

          {/* Resumo do mês */}
          {calendar && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-700 font-medium">
                + {formatPrice(calendar.monthTotalReceivable)}
              </span>
              <span className="text-red-700 font-medium">
                - {formatPrice(calendar.monthTotalPayable)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Calendário Grid */}
      <div className="overflow-x-auto">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-w-[640px]">
        {/* Header dias da semana */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        {isLoading ? (
          <div className="py-24 text-center text-gray-400">Carregando calendário...</div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarGrid.map((cell, i) => {
              if (!cell.day || !cell.date) {
                return <div key={i} className="min-h-[100px] border-b border-r bg-gray-50" />;
              }

              const entries = entriesByDate[cell.date] || [];
              const isToday = cell.date === todayStr;
              const receivableTotal = entries
                .filter(e => e.direction === 'RECEIVABLE')
                .reduce((s, e) => s + e.amount, 0);
              const payableTotal = entries
                .filter(e => e.direction === 'PAYABLE')
                .reduce((s, e) => s + e.amount, 0);
              const hasOverdue = entries.some(e => e.status === 'OVERDUE');
              const isSelected = cell.date === selectedDate;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                  className={`min-h-[100px] border-b border-r p-2 text-left transition-colors hover:bg-blue-50 ${
                    isToday ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''
                  } ${isSelected ? 'bg-blue-100' : ''} ${hasOverdue && !isSelected ? 'bg-red-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {cell.day}
                  </div>
                  {receivableTotal > 0 && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-xs text-green-700 font-medium truncate">
                        {formatPrice(receivableTotal)}
                      </span>
                    </div>
                  )}
                  {payableTotal > 0 && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-700 font-medium truncate">
                        {formatPrice(payableTotal)}
                      </span>
                    </div>
                  )}
                  {entries.length > 2 && (
                    <div className="text-xs text-gray-400">+{entries.length} itens</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Modal de detalhes do dia */}
      {selectedDate && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Vencimentos em {formatDate(selectedDate)}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Nenhum vencimento nesta data</p>
          ) : (
            <div className="space-y-3">
              {selectedEntries.map((entry) => (
                <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${
                      entry.direction === 'RECEIVABLE' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {entry.direction === 'RECEIVABLE'
                        ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                        : <ArrowDownRight className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.entityName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[entry.status] || 'bg-gray-100'}`}>
                          {statusLabel[entry.status] || entry.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.sourceNumber} - Parcela {entry.installmentNumber}
                        {entry.direction === 'RECEIVABLE' ? ' (Venda)' : ' (Compra)'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${
                      entry.direction === 'RECEIVABLE' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {entry.direction === 'RECEIVABLE' ? '+' : '-'} {formatPrice(entry.amount)}
                    </span>
                    {(entry.status === 'PENDING' || entry.status === 'OVERDUE') && (
                      <button
                        onClick={() => handleMarkPaid(entry)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                      >
                        <Check className="w-3 h-3" />
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog confirmar pagamento */}
      {payingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Pagamento</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Origem</span>
                <span>{payingEntry.sourceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entidade</span>
                <span>{payingEntry.entityName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Parcela</span>
                <span>{payingEntry.installmentNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor</span>
                <span className="font-semibold">{formatPrice(payingEntry.amount)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPayingEntry(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMarkPaid}
                disabled={updatePayment.isPending || payInstallment.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
