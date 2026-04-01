import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  FinancialSummary,
  CashFlowResponse,
  CalendarResponse,
  FinancialListResponse,
  FinancialFilters,
  DebtorFilters,
} from '@ejr/shared-types';

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/financial/summary');
      return data.data as FinancialSummary;
    },
    refetchInterval: 60000,
  });
}

export function useCashFlow(days: number = 30) {
  return useQuery({
    queryKey: ['financial', 'cash-flow', days],
    queryFn: async () => {
      const { data } = await api.get('/financial/cash-flow', { params: { days } });
      return data.data as CashFlowResponse;
    },
  });
}

export function useFinancialCalendar(month: string) {
  return useQuery({
    queryKey: ['financial', 'calendar', month],
    queryFn: async () => {
      const { data } = await api.get('/financial/calendar', { params: { month } });
      return data.data as CalendarResponse;
    },
    enabled: !!month,
  });
}

export function useReceivables(filters: FinancialFilters) {
  return useQuery({
    queryKey: ['financial', 'receivables', filters],
    queryFn: async () => {
      const { data } = await api.get('/financial/receivables', { params: filters });
      return data as { success: boolean; data: FinancialListResponse['data']; total: number; totals: FinancialListResponse['totals'] };
    },
  });
}

export function usePayables(filters: FinancialFilters) {
  return useQuery({
    queryKey: ['financial', 'payables', filters],
    queryFn: async () => {
      const { data } = await api.get('/financial/payables', { params: filters });
      return data as { success: boolean; data: FinancialListResponse['data']; total: number; totals: FinancialListResponse['totals'] };
    },
  });
}

export function usePayInstallment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, installmentId, paidDate }: { budgetId: string; installmentId: string; paidDate?: string }) => {
      const { data } = await api.put(`/purchase-budgets/${budgetId}/installments/${installmentId}/pay`, {
        paidDate: paidDate || new Date().toISOString().split('T')[0],
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useDebtors(filters: DebtorFilters = {}) {
  return useQuery({
    queryKey: ['financial', 'debtors', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.onlyOverdue) params.onlyOverdue = 'true';
      if (filters.onlyCreditExceeded) params.onlyCreditExceeded = 'true';
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get('/financial/debtors', { params });
      return data;
    },
  });
}
