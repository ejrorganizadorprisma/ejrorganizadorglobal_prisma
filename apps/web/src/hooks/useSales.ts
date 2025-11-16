import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useConvertToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data } = await api.post(`/sales/${quoteId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
