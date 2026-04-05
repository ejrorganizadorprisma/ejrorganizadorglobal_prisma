import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SellerStats {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  total_sales: number;
  total_revenue: number;
  total_paid: number;
  avg_ticket: number;
  total_customers: number;
  total_quotes: number;
  total_quote_value: number;
  converted_quotes: number;
}

export interface SellerTimeSeries {
  seller: { id: string; name: string; email: string } | null;
  timeSeries: Array<{
    period: string;
    total_sales: number;
    total_revenue: number;
    avg_ticket: number;
  }>;
}

export interface SellerComparison {
  seller_id: string;
  seller_name: string;
  timeSeries: Array<{
    period: string;
    total_sales: number;
    total_revenue: number;
    avg_ticket: number;
  }>;
}

export function useSellerStats(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['sellers', 'stats', filters],
    queryFn: async () => {
      const { data } = await api.get('/sellers/stats', { params: filters });
      return data.data as SellerStats[];
    },
  });
}

export function useSellerTimeSeries(
  sellerId: string | null,
  filters?: { startDate?: string; endDate?: string; groupBy?: string }
) {
  return useQuery({
    queryKey: ['sellers', sellerId, 'timeseries', filters],
    queryFn: async () => {
      const { data } = await api.get(`/sellers/${sellerId}/stats`, { params: filters });
      return data.data as SellerTimeSeries;
    },
    enabled: !!sellerId,
  });
}

export function useSellerComparison(filters?: { startDate?: string; endDate?: string; groupBy?: string }) {
  return useQuery({
    queryKey: ['sellers', 'comparison', filters],
    queryFn: async () => {
      const { data } = await api.get('/sellers/comparison', { params: filters });
      return data.data as SellerComparison[];
    },
  });
}
