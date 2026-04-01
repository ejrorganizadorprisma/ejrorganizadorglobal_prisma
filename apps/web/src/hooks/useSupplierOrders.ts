import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Types
export interface SupplierOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  purchaseOrderId: string;
  groupCode: string;
  status: 'PENDING' | 'SENT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  sentAt?: string;
  confirmedAt?: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
    document?: string;
  };
  purchaseOrder?: {
    id: string;
    orderNumber: string;
    name?: string;
  };
  items?: SupplierOrderItem[];
}

export interface SupplierOrderItem {
  id: string;
  supplierOrderId: string;
  purchaseOrderItemId?: string;
  productId: string;
  quantity: number;
  quantityReceived: number;
  quantityPending: number;
  unitPrice: number;
  discountPercentage: number;
  totalPrice: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  product?: {
    id: string;
    code: string;
    name: string;
    factoryCode?: string;
  };
}

export interface SupplierOrdersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  groupCode?: string;
  startDate?: string;
  endDate?: string;
}

// Hooks
export function useSupplierOrders(filters: SupplierOrdersFilters = {}) {
  return useQuery({
    queryKey: ['supplier-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const { data } = await api.get(`/supplier-orders?${params.toString()}`);
      return data;
    },
  });
}

export function useSupplierOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['supplier-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/supplier-orders/${id}`);
      return data.data as SupplierOrder;
    },
    enabled: !!id,
  });
}

export function useSupplierOrderItems(id: string | undefined) {
  return useQuery({
    queryKey: ['supplier-order-items', id],
    queryFn: async () => {
      const { data } = await api.get(`/supplier-orders/${id}/items`);
      return data.data as SupplierOrderItem[];
    },
    enabled: !!id,
  });
}

export function useSupplierOrdersByPurchaseOrder(purchaseOrderId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-orders-by-po', purchaseOrderId],
    queryFn: async () => {
      const { data } = await api.get(`/supplier-orders/purchase-order/${purchaseOrderId}`);
      return data.data as SupplierOrder[];
    },
    enabled: !!purchaseOrderId,
  });
}

export function useSupplierOrdersByGroup(groupCode: string | undefined) {
  return useQuery({
    queryKey: ['supplier-orders-by-group', groupCode],
    queryFn: async () => {
      const { data } = await api.get(`/supplier-orders/group/${groupCode}`);
      return data.data as SupplierOrder[];
    },
    enabled: !!groupCode,
  });
}

export function useGenerateSupplierOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      const { data } = await api.post('/supplier-orders/generate', { purchaseOrderId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useUpdateSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<SupplierOrder> }) => {
      const { data } = await api.patch(`/supplier-orders/${id}`, updateData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-order', variables.id] });
    },
  });
}

export function useSendSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/supplier-orders/${id}/send`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-order', id] });
    },
  });
}

export function useConfirmSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/supplier-orders/${id}/confirm`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-order', id] });
    },
  });
}

export function useCancelSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/supplier-orders/${id}/cancel`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-order', id] });
    },
  });
}

export function useDeleteSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/supplier-orders/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
    },
  });
}
