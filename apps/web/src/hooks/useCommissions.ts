import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SellerCommissionConfig {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  commissionOnSales: number;
  commissionOnCollections: number;
  commissionByProduct: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionEntry {
  id: string;
  sellerId: string;
  sellerName: string;
  sourceType: 'SALE' | 'COLLECTION';
  sourceId: string;
  baseAmount: number;
  rate: number;
  commissionAmount: number;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  settlementId?: string;
  createdAt: string;
}

export interface CommissionSummary {
  sellerId: string;
  sellerName: string;
  totalPending: number;
  totalSettled: number;
  totalCancelled: number;
  totalCurrentMonth: number;
  entryCount: number;
}

export interface CommissionSettlement {
  id: string;
  settlementNumber: string;
  sellerId: string;
  sellerName: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionEntryFilters {
  sellerId?: string;
  sourceType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CommissionSettlementFilters {
  sellerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useCommissionConfigs() {
  return useQuery({
    queryKey: ['commissions', 'config'],
    queryFn: async () => {
      const { data } = await api.get('/commissions/config');
      return data.data as SellerCommissionConfig[];
    },
  });
}

export function useUpdateCommissionConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sellerId,
      commissionOnSales,
      commissionOnCollections,
      commissionByProduct,
    }: {
      sellerId: string;
      commissionOnSales: number;
      commissionOnCollections: number;
      commissionByProduct?: boolean;
    }) => {
      const response = await api.put(`/commissions/config/${sellerId}`, {
        commissionOnSales,
        commissionOnCollections,
        commissionByProduct,
      });
      return response.data.data as SellerCommissionConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', 'config'] });
    },
  });
}

export function useCommissionEntries(filters: CommissionEntryFilters) {
  return useQuery({
    queryKey: ['commissions', 'entries', filters],
    queryFn: async () => {
      const { data } = await api.get('/commissions/entries', { params: filters });
      return data as { data: CommissionEntry[]; pagination: any };
    },
  });
}

export function useCommissionSummaries() {
  return useQuery({
    queryKey: ['commissions', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/commissions/summary');
      return data.data as CommissionSummary[];
    },
  });
}

export function useCommissionSettlements(filters: CommissionSettlementFilters) {
  return useQuery({
    queryKey: ['commissions', 'settlements', filters],
    queryFn: async () => {
      const { data } = await api.get('/commissions/settlements', { params: filters });
      return data as { data: CommissionSettlement[]; pagination: any };
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sellerId: string;
      periodStart: string;
      periodEnd: string;
      notes?: string;
    }) => {
      const response = await api.post('/commissions/settlements', payload);
      return response.data.data as CommissionSettlement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

export function usePaySettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/commissions/settlements/${id}/pay`);
      return response.data.data as CommissionSettlement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}
