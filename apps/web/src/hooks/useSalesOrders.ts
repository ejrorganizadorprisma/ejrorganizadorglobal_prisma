import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SalesOrder, SalesOrderFilters } from '@ejr/shared-types';

export function useSalesOrders(filters: SalesOrderFilters) {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      const { data } = await api.get('/sales-orders', { params: filters });
      return data as { data: SalesOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    },
  });
}

export function useSalesOrder(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: async () => {
      const { data } = await api.get(`/sales-orders/${id}`);
      return data.data as SalesOrder;
    },
    ...options,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/sales-orders', data);
      return response.data.data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.post(`/sales-orders/${id}/cancel`, { reason });
      return response.data.data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/sales-orders/${id}`, data);
      return response.data.data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/sales-orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

export interface ConvertToSaleFromOrderDTO {
  paymentMethod: string;
  saleDate?: string;
  dueDate?: string;
  installments?: number;
  items?: Array<{
    itemType: 'PRODUCT' | 'SERVICE';
    productId?: string;
    serviceName?: string;
    serviceDescription?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  discount?: number;
  notes?: string;
  internalNotes?: string;
  shippingMethod?: string;
  shippingCost?: number;
  carrierName?: string;
  trackingCode?: string;
  deliveryAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  shippingNotes?: string;
}

export function useConvertOrderToSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: ConvertToSaleFromOrderDTO }) => {
      const response = await api.post(`/sales-orders/${orderId}/convert-to-sale`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
