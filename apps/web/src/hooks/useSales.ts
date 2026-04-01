import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Sale,
  CreateSaleDTO,
  UpdateSaleDTO,
  SaleFilters,
  SaleStats,
  CreateSalePaymentDTO,
  UpdateSalePaymentDTO,
} from '@ejr/shared-types';

export function useSales(filters: SaleFilters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const { data } = await api.get('/sales', { params: filters });
      return data;
    },
  });
}

export function useSale(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      const { data } = await api.get(`/sales/${id}`);
      return data.data as Sale;
    },
    ...options,
  });
}

export function useSaleStats(filters?: SaleFilters) {
  return useQuery({
    queryKey: ['sales', 'stats', filters],
    queryFn: async () => {
      const { data } = await api.get('/sales/stats', { params: filters });
      return data.data as SaleStats;
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleDTO) => {
      const response = await api.post('/sales', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSaleDTO }) => {
      const response = await api.put(`/sales/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/sales/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      data,
    }: {
      saleId: string;
      data: CreateSalePaymentDTO;
    }) => {
      const response = await api.post(`/sales/${saleId}/payments`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      paymentId,
      data,
    }: {
      saleId: string;
      paymentId: string;
      data: UpdateSalePaymentDTO;
    }) => {
      const response = await api.put(`/sales/${saleId}/payments/${paymentId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

export interface ConvertToSaleDTO {
  quoteId: string;
  paymentMethod: string;
  installments?: number;
  saleDate?: string;
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
}

export function useConvertToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConvertToSaleDTO) => {
      const response = await api.post('/sales/convert-from-quote', data);
      return response.data.data as Sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
