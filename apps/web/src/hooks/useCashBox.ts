import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CashBoxResponse } from '@ejr/shared-types';

export function useCashBox() {
  return useQuery({
    queryKey: ['financial', 'cashbox'],
    queryFn: async () => {
      const { data } = await api.get('/financial/cashbox');
      return data.data as CashBoxResponse;
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
