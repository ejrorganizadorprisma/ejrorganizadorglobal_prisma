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
    staleTime: 5 * 60 * 1000, // 5 minutes — permissions rarely change
    refetchInterval: 5 * 60 * 1000, // refetch every 5 minutes
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    retry: 1,
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
