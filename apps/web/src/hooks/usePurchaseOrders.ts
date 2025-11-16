import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentTerms?: string;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercentage: number;
  totalPrice: number;
  quantityReceived: number;
  quantityPending: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
}

interface CreatePurchaseOrderDTO {
  supplierId: string;
  expectedDeliveryDate?: string;
  subtotal?: number;
  taxAmount?: number;
  shippingCost?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountPercentage?: number;
    totalPrice: number;
    expectedDeliveryDate?: string;
    notes?: string;
  }>;
}

interface UpdatePurchaseOrderDTO {
  supplierId?: string;
  expectedDeliveryDate?: string;
  subtotal?: number;
  taxAmount?: number;
  shippingCost?: number;
  discountAmount?: number;
  totalAmount?: number;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
}

export function usePurchaseOrders(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: PurchaseOrder[]; pagination: any }>('/purchase-orders', {
        params,
      });
      return data;
    },
  });
}

export function usePurchaseOrder(id?: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: PurchaseOrder }>(`/purchase-orders/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderDTO) => {
      const response = await api.post<{ data: PurchaseOrder }>('/purchase-orders', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderDTO }) => {
      const response = await api.patch<{ data: PurchaseOrder }>(`/purchase-orders/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/send`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useConfirmPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/confirm`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: PurchaseOrder }>(`/purchase-orders/${id}/cancel`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function usePurchaseOrderItems(id?: string) {
  return useQuery({
    queryKey: ['purchase-orders', id, 'items'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PurchaseOrderItem[] }>(`/purchase-orders/${id}/items`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function usePendingPurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders', 'pending'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PurchaseOrder[] }>('/purchase-orders/pending');
      return data.data;
    },
  });
}
