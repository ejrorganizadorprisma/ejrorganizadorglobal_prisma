import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useCompleteOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/overview');
      return data.data;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}
