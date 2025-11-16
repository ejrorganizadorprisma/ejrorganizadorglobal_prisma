import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useSalesReport(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales', { params });
      return data.data;
    },
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => {
      const { data } = await api.get('/reports/inventory');
      return data.data;
    },
  });
}
