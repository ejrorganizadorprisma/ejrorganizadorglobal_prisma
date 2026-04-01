import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DemandAnalysis, DemandAnalysisPeriod } from '@ejr/shared-types';

export function useDemandAnalysis(productId?: string, periodMonths: DemandAnalysisPeriod = 6) {
  return useQuery({
    queryKey: ['demand-analysis', productId, periodMonths],
    queryFn: async () => {
      const { data } = await api.get<{ data: DemandAnalysis }>(
        `/products/${productId}/demand-analysis`,
        { params: { period: periodMonths } },
      );
      return data.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
