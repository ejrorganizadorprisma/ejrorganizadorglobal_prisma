import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SalesOrder, SalesOrderFilters } from '@ejr/shared-types';

export function useSalesOrders(filters: SalesOrderFilters, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      const { data } = await api.get('/sales-orders', { params: filters });
      return data as { data: SalesOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    },
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: false,
  });
}

/**
 * Conta pedidos com status PENDING para badge de notificação no menu lateral.
 * Refetch a cada 60s para manter o badge atualizado sem onerar a API.
 */
export function usePendingSalesOrdersCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales-orders', 'pending-count'],
    queryFn: async () => {
      const { data } = await api.get('/sales-orders', {
        params: { status: 'PENDING', page: 1, limit: 1 },
      });
      return (data?.pagination?.total ?? 0) as number;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled: options?.enabled ?? true,
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

/**
 * Aprova um pedido de venda PENDING → APPROVED.
 * Permitido para roles ADMIN/OWNER/MANAGER.
 */
export function useApproveSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await api.post(`/sales-orders/${id}/approve`, { notes });
      return response.data.data as SalesOrder;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders', vars.id] });
    },
  });
}

/**
 * Snapshot de um item efetivamente convertido — quantidade pode ser menor
 * que o item original quando a conversão é parcial.
 */
export interface SalesOrderConversionItemSnapshot {
  itemId?: string;
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string;
  productName?: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
}

export interface SalesOrderConversion {
  id: string;
  saleId: string;
  saleNumber?: string;
  itemsSnapshot: SalesOrderConversionItemSnapshot[];
  convertedAt: string;
  convertedBy?: string;
  convertedByName?: string;
  total?: number;
}

/**
 * Lista o histórico de conversões parciais/totais de um pedido.
 * Usado em SalesOrderEditPage para mostrar bloco "Histórico de faturamentos".
 */
export function useSalesOrderConversions(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales-orders', id, 'conversions'],
    queryFn: async () => {
      const { data } = await api.get(`/sales-orders/${id}/conversions`);
      // Backend retorna { data: [...] } ou { data: { conversions: [...] } } — tratamos ambos
      const raw = data?.data ?? data;
      if (Array.isArray(raw)) return raw as SalesOrderConversion[];
      if (Array.isArray(raw?.conversions)) return raw.conversions as SalesOrderConversion[];
      return [] as SalesOrderConversion[];
    },
    enabled: options?.enabled ?? !!id,
  });
}

// ==================== WORKFLOW (Demanda 9) ====================

function useWorkflowAction(action: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body?: any }) => {
      const response = await api.post(`/sales-orders/${id}/${action}`, body || {});
      return response.data.data as SalesOrder;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders', vars.id] });
    },
  });
}

export const useReceiveSalesOrder = () => useWorkflowAction('receive');
export const useSeparateSalesOrder = () => useWorkflowAction('separate');
export const useToDeliverSalesOrder = () => useWorkflowAction('to-deliver');
export const useMarkDeliveredSalesOrder = () => useWorkflowAction('mark-delivered');
export const useCompleteSalesOrder = () => useWorkflowAction('complete');

// ==================== SEPARAÇÃO NO ESTOQUE ====================

/** Fila do estoque em tempo real (aguardando + em separação). */
export function useSeparationQueue(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['separation-queue'],
    queryFn: async () => {
      const { data } = await api.get('/sales-orders/separation/queue');
      return (data?.data ?? []) as SalesOrder[];
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    enabled: options?.enabled ?? true,
  });
}

function useSeparationMutation(action: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body?: any }) => {
      const response = await api.post(`/sales-orders/${id}/${action}`, body || {});
      return response.data.data as SalesOrder;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['separation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders', vars.id] });
    },
  });
}

export const useReleaseSeparation = () => useSeparationMutation('release-separation');
export const useClaimSeparation = () => useSeparationMutation('claim-separation');
export const usePostponeSeparation = () => useSeparationMutation('postpone-separation');

export function useSeparationEvents(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales-orders', id, 'separation-events'],
    queryFn: async () => {
      const { data } = await api.get(`/sales-orders/${id}/separation-events`);
      return (data?.data ?? []) as Array<{
        id: string; action: string; note?: string; createdAt: string;
        user?: { id: string; name: string };
      }>;
    },
    enabled: options?.enabled ?? !!id,
  });
}
