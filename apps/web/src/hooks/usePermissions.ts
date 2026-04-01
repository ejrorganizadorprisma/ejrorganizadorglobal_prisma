import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { PermissionsConfig } from '@ejr/shared-types';

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PermissionsConfig }>('/permissions');
      return data.data;
    },
    // Refetch permissions every 30 seconds to catch updates from other users/sessions
    refetchInterval: 30000,
    // Also refetch when window regains focus
    refetchOnWindowFocus: true,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: PermissionsConfig) => {
      const response = await api.put<{ data: PermissionsConfig; message: string }>(
        '/permissions',
        config
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast.success(data.message || 'Permissões atualizadas com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar permissões');
    },
  });
}
