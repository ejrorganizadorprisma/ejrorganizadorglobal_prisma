import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  startDate?: string;
  endDate?: string;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId?: string;
  purchaseOrder?: {
    id: string;
    orderNumber: string;
  };
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  receiptDate: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  status: 'PENDING' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  qualityCheckStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'PARTIAL';
  inspectedBy?: string;
  inspectedAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId?: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  quantityOrdered?: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  unitPrice?: number;
  qualityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUARANTINE';
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
}

interface CreateGoodsReceiptDTO {
  purchaseOrderId?: string;
  supplierId: string;
  receiptDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  notes?: string;
  items: Array<{
    purchaseOrderItemId?: string;
    productId: string;
    quantityOrdered?: number;
    quantityReceived: number;
    quantityAccepted?: number;
    quantityRejected?: number;
    unitPrice?: number;
    qualityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QUARANTINE';
    rejectionReason?: string;
    lotNumber?: string;
    expiryDate?: string;
    notes?: string;
  }>;
}

interface UpdateGoodsReceiptDTO {
  receiptDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  notes?: string;
}

interface InspectItemDTO {
  qualityStatus: 'APPROVED' | 'REJECTED' | 'QUARANTINE';
  quantityAccepted: number;
  quantityRejected: number;
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
}

export function useGoodsReceipts(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['goods-receipts', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: GoodsReceipt[]; pagination: any }>('/goods-receipts', {
        params,
      });
      return data;
    },
  });
}

export function useGoodsReceipt(id?: string) {
  return useQuery({
    queryKey: ['goods-receipts', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: GoodsReceipt }>(`/goods-receipts/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoodsReceiptDTO) => {
      const response = await api.post<{ data: GoodsReceipt }>('/goods-receipts', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateGoodsReceiptDTO }) => {
      const response = await api.patch<{ data: GoodsReceipt }>(`/goods-receipts/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
}

export function useDeleteGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goods-receipts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
}

export function useApproveGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: GoodsReceipt }>(`/goods-receipts/${id}/approve`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRejectGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: GoodsReceipt }>(`/goods-receipts/${id}/reject`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
  });
}

export function useGoodsReceiptItems(id?: string) {
  return useQuery({
    queryKey: ['goods-receipts', id, 'items'],
    queryFn: async () => {
      const { data } = await api.get<{ data: GoodsReceiptItem[] }>(`/goods-receipts/${id}/items`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useInspectGoodsReceiptItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: InspectItemDTO }) => {
      const response = await api.post<{ data: GoodsReceiptItem }>(
        `/goods-receipts/items/${itemId}/inspect`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function usePendingInspections() {
  return useQuery({
    queryKey: ['goods-receipts', 'pending-inspections'],
    queryFn: async () => {
      const { data } = await api.get<{ data: GoodsReceipt[] }>('/goods-receipts/pending-inspections');
      return data.data;
    },
  });
}
