import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  PurchaseBudget,
  PurchaseBudgetItem,
  PurchaseBudgetQuote,
  PurchaseBudgetFilters,
  CreatePurchaseBudgetDTO,
  UpdatePurchaseBudgetDTO,
  CreateBudgetItemDTO,
  UpdateBudgetItemDTO,
  CreateBudgetQuoteDTO,
  UpdateBudgetQuoteDTO,
} from '@ejr/shared-types';

// ==================== BUDGETS ====================

export function usePurchaseBudgets(filters?: PurchaseBudgetFilters) {
  return useQuery({
    queryKey: ['purchase-budgets', filters],
    queryFn: async () => {
      const { data } = await api.get('/purchase-budgets', { params: filters });
      return data;
    },
  });
}

export function usePurchaseBudget(id?: string) {
  return useQuery({
    queryKey: ['purchase-budgets', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-budgets/${id}`);
      return data.data as PurchaseBudget;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePurchaseBudgetDTO) => {
      const { data } = await api.post('/purchase-budgets', dto);
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useUpdatePurchaseBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseBudgetDTO }) => {
      const response = await api.put(`/purchase-budgets/${id}`, data);
      return response.data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useDeletePurchaseBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/purchase-budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

// ==================== STATUS TRANSITIONS ====================

export function useSubmitBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/purchase-budgets/${id}/submit`);
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useApproveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/purchase-budgets/${id}/approve`);
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRejectBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/purchase-budgets/${id}/reject`, { reason });
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useReopenBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/purchase-budgets/${id}/reopen`);
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function usePurchaseBudgetAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoiceNumber, finalAmount, paymentMethod, installments }: {
      id: string;
      invoiceNumber?: string;
      finalAmount?: number;
      paymentMethod?: string;
      installments?: Array<{ installmentNumber: number; amount: number; dueDate: string; notes?: string }>;
    }) => {
      const { data } = await api.post(`/purchase-budgets/${id}/purchase`, {
        invoiceNumber, finalAmount, paymentMethod, installments,
      });
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCancelBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/purchase-budgets/${id}/cancel`);
      return data.data as PurchaseBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

// ==================== ITEMS ====================

export function useBudgetItems(budgetId?: string) {
  return useQuery({
    queryKey: ['purchase-budgets', budgetId, 'items'],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-budgets/${budgetId}/items`);
      return data.data as PurchaseBudgetItem[];
    },
    enabled: !!budgetId,
  });
}

export function useAddBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, data }: { budgetId: string; data: CreateBudgetItemDTO }) => {
      const response = await api.post(`/purchase-budgets/${budgetId}/items`, data);
      return response.data.data as PurchaseBudgetItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useUpdateBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateBudgetItemDTO }) => {
      await api.put(`/purchase-budgets/items/${itemId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/purchase-budgets/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useSelectQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, quoteId }: { itemId: string; quoteId: string }) => {
      await api.post(`/purchase-budgets/items/${itemId}/select-quote/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

// ==================== QUOTES ====================

export function useItemQuotes(itemId?: string) {
  return useQuery({
    queryKey: ['purchase-budgets', 'quotes', itemId],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-budgets/items/${itemId}/quotes`);
      return data.data as PurchaseBudgetQuote[];
    },
    enabled: !!itemId,
  });
}

export function useAddQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: CreateBudgetQuoteDTO }) => {
      const response = await api.post(`/purchase-budgets/items/${itemId}/quotes`, data);
      return response.data.data as PurchaseBudgetQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: UpdateBudgetQuoteDTO }) => {
      await api.put(`/purchase-budgets/quotes/${quoteId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      await api.delete(`/purchase-budgets/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-budgets'] });
    },
  });
}
