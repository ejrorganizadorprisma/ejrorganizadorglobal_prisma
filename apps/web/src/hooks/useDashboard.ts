import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/metrics');
      return data.data;
    },
  });
}
