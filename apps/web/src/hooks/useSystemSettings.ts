import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SystemSettings, UpdateSystemSettingsDTO } from '@ejr/shared-types';

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SystemSettings }>('/system-settings');
      return data.data;
    },
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateSystemSettingsDTO) => {
      const { data } = await api.patch<{ data: SystemSettings }>('/system-settings', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}
