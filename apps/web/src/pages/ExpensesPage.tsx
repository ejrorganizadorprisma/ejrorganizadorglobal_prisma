import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useExpenses, useCreateExpense, useDeleteExpense,
  usePayExpenseInstallment, useUnpayExpenseInstallment,
  useExpense, EXPENSE_CATEGORIES, RECURRENCE_LABELS,
  categoryIcon, categoryLabel,
  type ExpenseCategory, type ExpenseRecurrence,
} from '../hooks/useExpenses';
import { useSuppliers } from '../hooks/useSuppliers';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { CURRENCY_CONFIG } from '@ejr/shared-types';
import { toast } from 'sonner';
import {
  Receipt, Plus, Search, X, Trash2, Check, RotateCcw,
  ArrowLeft, CalendarDays, Repeat, ChevronRight, AlertTriangle,
} from 'lucide-react';

const fmtDate = (d?: string) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '-');
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<string, string> = { OPEN: 'Em aberto', PAID: 'Quitada', CANCELLED: 'Cancelada' };

interface InstallmentRow { amount: string; dueDate: string }

export function ExpensesPage() {
  const { formatPrice, defaultCurrency } = useFormatPrice();
  const decimals = CURRENCY_CONFIG[defaultCurrency].decimals;
  /** valor digitado → unidade de armazenamento da moeda base (₲ inteiro, R$/US$ centavos) */
  const toStored = (v: string) => {
    const n = parseFloat(String(v).replace(',', '.')) || 0;
    return decimals === 0 ? Math.round(n) : Math.round(n * 100);
  };
  const fromStored = (v: number) => (decimals === 0 ? String(v) : (v / 100).toFixed(2));

  const [filters, setFilters] = useState<{ page: number; limit: number; search?: string; category?: string; status?: string }>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useExpenses(filters);
  const { data: suppliersData } = useSuppliers({ page: 1, limit: 200 });
  const { data: detail } = useExpense(detailId || undefined);

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const payInstallment = usePayExpenseInstallment();
  const unpayInstallment = useUnpayExpenseInstallment();

  const expenses = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / filters.limit);

  // ── Formulário ──
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('RENT');
  const [supplierId, setSupplierId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [recurrence, setRecurrence] = useState<ExpenseRecurrence>('NONE');
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [installments, setInstallments] = useState<InstallmentRow[]>([{ amount: '', dueDate: today() }]);

  const totalStored = toStored(amountInput);
  const installmentsStored = useMemo(
    () => installments.reduce((s, i) => s + toStored(i.amount), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [installments, decimals]
  );
  const diff = installmentsStored - totalStored;

  const resetForm = () => {
    setDescription(''); setCategory('RENT'); setSupplierId(''); setDocumentNumber('');
    setNotes(''); setAmountInput(''); setRecurrence('NONE'); setRecurrenceDay('');
    setRecurrenceUntil(''); setInstallments([{ amount: '', dueDate: today() }]);
  };

  /** Divide o total em N vencimentos mensais — a sobra do arredondamento vai nas primeiras */
  const splitInstallments = (n: number) => {
    if (totalStored <= 0) { toast.error('Informe o valor total primeiro.'); return; }
    if (!n || n < 1) return;
    const base = Math.floor(totalStored / n);
    const rest = totalStored - base * n;
    const first = installments[0]?.dueDate || today();
    const rows: InstallmentRow[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(first + 'T12:00:00');
      d.setMonth(d.getMonth() + i);
      rows.push({ amount: fromStored(base + (i < rest ? 1 : 0)), dueDate: d.toISOString().slice(0, 10) });
    }
    setInstallments(rows);
  };

  const handleCreate = async () => {
    if (!description.trim()) { toast.error('Informe a descrição.'); return; }
    if (totalStored <= 0) { toast.error('Informe o valor total.'); return; }
    if (installments.some((i) => !i.dueDate || toStored(i.amount) <= 0)) {
      toast.error('Preencha valor e vencimento de todas as parcelas.'); return;
    }
    if (Math.abs(diff) > 1) {
      toast.error(`Soma das parcelas (${formatPrice(installmentsStored)}) difere do total (${formatPrice(totalStored)}).`);
      return;
    }
    try {
      await createExpense.mutateAsync({
        description: description.trim(),
        category,
        supplierId: supplierId || null,
        totalAmount: totalStored,
        documentNumber: documentNumber || undefined,
        notes: notes || undefined,
        recurrence,
        recurrenceDay: recurrence !== 'NONE' && recurrenceDay ? parseInt(recurrenceDay) : null,
        recurrenceUntil: recurrence !== 'NONE' && recurrenceUntil ? recurrenceUntil : null,
        installments: installments.map((i, idx) => ({
          installmentNumber: idx + 1,
          amount: toStored(i.amount),
          dueDate: i.dueDate,
        })),
      });
      toast.success('Despesa lançada! Já aparece em Contas a Pagar.');
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || e.response?.data?.error || 'Erro ao lançar despesa.');
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!window.confirm(`Excluir a despesa ${number}? Se houver parcela já paga ela será cancelada em vez de excluída.`)) return;
    try {
      await deleteExpense.mutateAsync(id);
      toast.success('Despesa removida.');
      if (detailId === id) setDetailId(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao remover.');
    }
  };

  const handlePay = async (installmentId: string) => {
    try {
      await payInstallment.mutateAsync({ installmentId, paidDate: today() });
      toast.success('Parcela paga.');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao dar baixa.');
    }
  };

  const handleUnpay = async (installmentId: string) => {
    if (!window.confirm('Desfazer a baixa desta parcela?')) return;
    try {
      await unpayInstallment.mutateAsync(installmentId);
      toast.success('Baixa desfeita.');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao estornar.');
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/financial" className="text-blue-600 hover:text-blue-800"><ArrowLeft className="w-6 h-6" /></Link>
          <Receipt className="w-8 h-8 text-rose-600" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Despesas</h1>
            <p className="text-sm text-gray-500">Aluguel, salários, impostos e outras contas fora do fluxo de compras</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm(); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium"
        >
          {showForm ? <><X className="w-4 h-4" /> Fechar</> : <><Plus className="w-4 h-4" /> Nova despesa</>}
        </button>
      </div>

      {/* ===== Formulário ===== */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição *</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Aluguel do galpão — agosto"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Valor total ({CURRENCY_CONFIG[defaultCurrency].symbol}) *
              </label>
              <input type="number" min={0} step={decimals === 0 ? '1' : '0.01'}
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  // Uma parcela só? mantém espelhando o total
                  if (installments.length === 1) {
                    setInstallments([{ ...installments[0], amount: e.target.value }]);
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm text-right" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor (opcional)</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">—</option>
                {(suppliersData?.data || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº do documento</label>
              <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="NF, recibo, contrato..." className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Recorrência */}
          <div className="mt-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Repeat className="w-4 h-4" />
                <span className="text-sm font-semibold">Repetir</span>
              </div>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as ExpenseRecurrence)}
                className="px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white">
                {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {recurrence !== 'NONE' && (
                <>
                  <div>
                    <label className="block text-[11px] text-indigo-700 mb-0.5">Dia do vencimento</label>
                    <input type="number" min={1} max={31} value={recurrenceDay}
                      onChange={(e) => setRecurrenceDay(e.target.value)} placeholder="10"
                      className="w-20 px-2 py-1.5 border border-indigo-200 rounded-lg text-sm text-center" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-indigo-700 mb-0.5">Repetir até</label>
                    <input type="date" value={recurrenceUntil} onChange={(e) => setRecurrenceUntil(e.target.value)}
                      className="px-2 py-1.5 border border-indigo-200 rounded-lg text-sm" />
                  </div>
                  <p className="text-[11px] text-indigo-600 flex-1 min-w-[240px]">
                    A próxima despesa é criada sozinha quando esta for quitada.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Parcelas */}
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-gray-400" /> Vencimentos
              </span>
              <div className="flex items-center gap-1 ml-auto">
                {[1, 2, 3, 6, 12].map((n) => (
                  <button key={n} onClick={() => splitInstallments(n)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50">
                    {n}x
                  </button>
                ))}
                <button onClick={() => setInstallments((p) => [...p, { amount: '', dueDate: today() }])}
                  className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {installments.map((inst, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                  <input type="number" min={0} step={decimals === 0 ? '1' : '0.01'} value={inst.amount}
                    onChange={(e) => setInstallments((p) => p.map((r, i) => i === idx ? { ...r, amount: e.target.value } : r))}
                    placeholder={CURRENCY_CONFIG[defaultCurrency].symbol}
                    className="w-32 px-2 py-1.5 border rounded-lg text-sm text-right" />
                  <input type="date" value={inst.dueDate}
                    onChange={(e) => setInstallments((p) => p.map((r, i) => i === idx ? { ...r, dueDate: e.target.value } : r))}
                    className="px-2 py-1.5 border rounded-lg text-sm" />
                  {installments.length > 1 && (
                    <button onClick={() => setInstallments((p) => p.filter((_, i) => i !== idx))}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {installmentsStored > 0 && (
              <p className={`mt-2 text-xs ${Math.abs(diff) <= 1 ? 'text-gray-500' : 'text-amber-600 font-medium'}`}>
                Parcelas: <strong>{formatPrice(installmentsStored)}</strong> / Total: <strong>{formatPrice(totalStored)}</strong>
                {Math.abs(diff) > 1 && <> — diferença de {formatPrice(Math.abs(diff))}</>}
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button onClick={handleCreate} disabled={createExpense.isPending}
              className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50">
              {createExpense.isPending ? 'Salvando…' : 'Lançar despesa'}
            </button>
          </div>
        </div>
      )}

      {/* ===== Filtros ===== */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }))}
              placeholder="Buscar por descrição, número ou documento..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <select value={filters.category || ''} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined, page: 1 }))}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Todas as categorias</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <select value={filters.status || ''} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Todos os status</option>
            <option value="OPEN">Em aberto</option>
            <option value="PAID">Quitadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      {/* ===== Lista ===== */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Carregando…</div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-500">Nenhuma despesa lançada</p>
            <p className="text-sm">Aluguel, salário, imposto e frete entram aqui e viram Contas a Pagar.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((e) => {
              const isOpen = detailId === e.id;
              const overdue = e.status === 'OPEN' && e.nextDueDate && new Date(String(e.nextDueDate).slice(0, 10)) < new Date(today());
              return (
                <div key={e.id}>
                  <button onClick={() => setDetailId(isOpen ? null : e.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                    <span className="text-xl shrink-0">{categoryIcon(e.category)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">{e.description}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[e.status]}`}>
                          {STATUS_LABEL[e.status]}
                        </span>
                        {e.recurrence !== 'NONE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
                            <Repeat className="w-3 h-3" /> {RECURRENCE_LABELS[e.recurrence]}
                          </span>
                        )}
                        {overdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" /> Vencida
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {e.expenseNumber} · {categoryLabel(e.category)}
                        {e.supplierName && <> · {e.supplierName}</>}
                        {e.nextDueDate && <> · próx. venc. {fmtDate(e.nextDueDate)}</>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gray-900">{formatPrice(e.totalAmount)}</div>
                      {(e.installmentsCount || 0) > 1 && (
                        <div className="text-[11px] text-gray-400">{e.installmentsCount}x</div>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 bg-gray-50/60">
                      {detail?.notes && <p className="text-xs text-gray-500 mb-2">{detail.notes}</p>}
                      <div className="rounded-lg border bg-white overflow-hidden">
                        {(detail?.installments || []).map((inst) => {
                          const isOverdue = inst.status === 'PENDING' && new Date(String(inst.dueDate).slice(0, 10)) < new Date(today());
                          return (
                            <div key={inst.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 text-sm">
                              <span className="text-xs text-gray-400 w-6">{inst.installmentNumber}.</span>
                              <span className="font-medium text-gray-800 w-32">{formatPrice(inst.amount)}</span>
                              <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                venc. {fmtDate(inst.dueDate)}
                              </span>
                              {inst.status === 'PAID' && (
                                <span className="text-xs text-emerald-600">pago em {fmtDate(inst.paidDate)}</span>
                              )}
                              <div className="ml-auto flex items-center gap-1.5">
                                {inst.status === 'PENDING' && (
                                  <button onClick={() => handlePay(inst.id)} disabled={payInstallment.isPending}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                                    <Check className="w-3 h-3" /> Pagar
                                  </button>
                                )}
                                {inst.status === 'PAID' && (
                                  <button onClick={() => handleUnpay(inst.id)} disabled={unpayInstallment.isPending}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-md text-xs">
                                    <RotateCcw className="w-3 h-3" /> Desfazer
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => handleDelete(e.id, e.expenseNumber)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-md text-xs">
                          <Trash2 className="w-3.5 h-3.5" /> Excluir despesa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <span className="text-gray-500">{total} despesa{total !== 1 && 's'}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} disabled={filters.page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-30">Anterior</button>
              <span>{filters.page} / {totalPages}</span>
              <button onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} disabled={filters.page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-30">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
