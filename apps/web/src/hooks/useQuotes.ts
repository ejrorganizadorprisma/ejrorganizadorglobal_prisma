import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Quote, CreateQuoteDTO, UpdateQuoteDTO, QuoteStatus } from '@ejr/shared-types';

export function useQuotes(params: {
  page: number;
  limit: number;
  search?: string;
  status?: QuoteStatus;
  customerId?: string;
}) {
  return useQuery({
    queryKey: ['quotes', params],
    queryFn: async () => {
      const { data } = await api.get('/quotes', { params });
      return data;
    },
  });
}

export function useQuote(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${id}`);
      return data.data as Quote;
    },
    ...options,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateQuoteDTO) => {
      const response = await api.post('/quotes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQuoteDTO }) => {
      const response = await api.patch(`/quotes/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/quotes/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const response = await api.patch(`/quotes/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}
