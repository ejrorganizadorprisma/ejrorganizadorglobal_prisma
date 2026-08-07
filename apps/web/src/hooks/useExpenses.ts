import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ExpenseCategory =
  | 'RENT' | 'PAYROLL' | 'TAX' | 'UTILITIES' | 'FREIGHT'
  | 'SERVICES' | 'MAINTENANCE' | 'MARKETING' | 'FEES' | 'OTHER';

export type ExpenseRecurrence = 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'RENT', label: 'Aluguel', icon: '🏠' },
  { value: 'PAYROLL', label: 'Folha / Salários', icon: '👥' },
  { value: 'TAX', label: 'Impostos', icon: '🏛️' },
  { value: 'UTILITIES', label: 'Água / Luz / Internet', icon: '💡' },
  { value: 'FREIGHT', label: 'Frete / Logística', icon: '🚚' },
  { value: 'SERVICES', label: 'Serviços de terceiros', icon: '🧾' },
  { value: 'MAINTENANCE', label: 'Manutenção', icon: '🔧' },
  { value: 'MARKETING', label: 'Marketing', icon: '📣' },
  { value: 'FEES', label: 'Taxas bancárias', icon: '🏦' },
  { value: 'OTHER', label: 'Outros', icon: '📌' },
];

export const RECURRENCE_LABELS: Record<ExpenseRecurrence, string> = {
  NONE: 'Não repete',
  MONTHLY: 'Todo mês',
  QUARTERLY: 'A cada 3 meses',
  YEARLY: 'Todo ano',
};

export function categoryLabel(value?: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || 'Outros';
}
export function categoryIcon(value?: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.icon || '📌';
}

export interface ExpenseInstallment {
  id: string;
  expenseId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paymentMethod?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  description: string;
  category: ExpenseCategory;
  supplierId?: string;
  supplierName?: string;
  totalAmount: number;
  paidAmount?: number;
  issueDate: string;
  documentNumber?: string;
  notes?: string;
  recurrence: ExpenseRecurrence;
  recurrenceDay?: number;
  recurrenceUntil?: string;
  recurrenceParentId?: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  installmentsCount?: number;
  nextDueDate?: string;
  installments?: ExpenseInstallment[];
  createdAt: string;
}

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params: filters });
      return data as { data: Expense[]; total: number };
    },
  });
}

export function useExpense(id?: string) {
  return useQuery({
    queryKey: ['expenses', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/expenses/${id}`);
      return data.data as Expense;
    },
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['expenses'] });
    // A despesa é uma conta a pagar: caixa, calendário e resumo mudam junto
    qc.invalidateQueries({ queryKey: ['financial'] });
  };
}

export function useCreateExpense() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/expenses', payload);
      return data.data as Expense;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateExpense() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, data: payload }: { id: string; data: any }) => {
      const { data } = await api.put(`/expenses/${id}`, payload);
      return data.data as Expense;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/expenses/${id}`);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function usePayExpenseInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ installmentId, paidDate, paymentMethod }: {
      installmentId: string; paidDate?: string; paymentMethod?: string;
    }) => {
      const { data } = await api.patch(`/expenses/installments/${installmentId}/pay`, { paidDate, paymentMethod });
      return data.data as Expense;
    },
    onSuccess: invalidate,
  });
}

export function useUnpayExpenseInstallment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (installmentId: string) => {
      const { data } = await api.patch(`/expenses/installments/${installmentId}/unpay`);
      return data.data as Expense;
    },
    onSuccess: invalidate,
  });
}
