import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  PurchaseRequest,
  CreatePurchaseRequestDTO,
  UpdatePurchaseRequestDTO,
  ReviewPurchaseRequestDTO,
  PurchaseRequestFilters,
} from '@ejr/shared-types';

export function usePurchaseRequests(filters?: PurchaseRequestFilters) {
  return useQuery({
    queryKey: ['purchase-requests', filters],
    queryFn: async () => {
      const { data } = await api.get('/purchase-requests', { params: filters });
      return data;
    },
  });
}

export function usePurchaseRequest(id?: string) {
  return useQuery({
    queryKey: ['purchase-requests', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-requests/${id}`);
      return data.data as PurchaseRequest;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseRequestDTO) => {
      const response = await api.post('/purchase-requests', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useUpdatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseRequestDTO }) => {
      const response = await api.put(`/purchase-requests/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useReviewPurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReviewPurchaseRequestDTO }) => {
      const response = await api.post(`/purchase-requests/${id}/review`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useConvertToPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/purchase-requests/${id}/convert`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useDeletePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/purchase-requests/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}
