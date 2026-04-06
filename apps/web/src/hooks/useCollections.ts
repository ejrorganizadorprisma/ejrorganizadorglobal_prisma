import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface CollectionFilters {
  sellerId?: string;
  customerId?: string;
  saleId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface Collection {
  id: string;
  collectionNumber: string;
  saleId: string;
  sale?: { saleNumber: string; customer?: { name: string } };
  sellerId: string;
  seller?: { name: string; email: string };
  customerId: string;
  customer?: { name: string };
  amount: number;
  paymentMethod: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DEPOSITED' | 'REJECTED';
  rejectionReason?: string;
  photos?: string[];
  checkNumber?: string;
  checkBank?: string;
  checkDate?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  collectedAt: string;
  approvedAt?: string;
  depositedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionStats {
  totalCollections: number;
  totalAmount: number;
  pendingApprovalCount: number;
  pendingApprovalAmount: number;
  approvedCount: number;
  approvedAmount: number;
  depositedCount: number;
  depositedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
}

export function useCollections(filters: CollectionFilters) {
  return useQuery({
    queryKey: ['collections', filters],
    queryFn: async () => {
      const { data } = await api.get('/collections', { params: filters });
      return data as { data: Collection[]; pagination: any };
    },
  });
}

export function useCollectionStats(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['collections', 'stats', filters],
    queryFn: async () => {
      const { data } = await api.get('/collections/stats', { params: filters });
      return data.data as CollectionStats;
    },
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: ['collections', id],
    queryFn: async () => {
      const { data } = await api.get(`/collections/${id}`);
      return data.data as Collection;
    },
    enabled: !!id,
  });
}

export function useApproveCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/collections/${id}/approve`);
      return response.data.data as Collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useRejectCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.patch(`/collections/${id}/reject`, { reason });
      return response.data.data as Collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDepositCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/collections/${id}/deposit`);
      return response.data.data as Collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}
