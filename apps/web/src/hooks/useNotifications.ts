import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/notifications');
        return data.data;
      } catch (error: any) {
        // Silenciar erro 404 - endpoint ainda não implementado
        if (error?.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    retry: false, // Não tentar novamente em caso de 404
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/notifications/unread');
        return data.data.count;
      } catch (error: any) {
        // Silenciar erro 404 - endpoint ainda não implementado
        if (error?.response?.status === 404) {
          return 0;
        }
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Não tentar novamente em caso de 404
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
}
