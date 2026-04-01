import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '@ejr/shared-types';

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export function useServices(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: Service[]; pagination: any }>('/services', {
        params,
      });
      return data;
    },
    staleTime: 0,
  });
}

export function useService(id?: string) {
  return useQuery({
    queryKey: ['services', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Service }>(`/services/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateServiceDTO) => {
      const response = await api.post<{ data: Service }>('/services', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateServiceDTO }) => {
      const response = await api.patch<{ data: Service }>(`/services/${id}`, data);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services', variables.id] });
      queryClient.setQueryData(['services', variables.id], data);
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
