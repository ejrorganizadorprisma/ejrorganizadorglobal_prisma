import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Indústria (UI). Cadastro central referenciado por produtos e fornecedores.
export interface Manufacturer {
  id: string;
  code?: string;
  name: string;
  legalName?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function useManufacturersList(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['manufacturers-list', params],
    queryFn: async () => {
      const { data } = await api.get('/manufacturers', { params });
      return data.data as { data: Manufacturer[]; total: number };
    },
  });
}

export function useManufacturer(id?: string) {
  return useQuery({
    queryKey: ['manufacturers-list', id],
    queryFn: async () => {
      const { data } = await api.get(`/manufacturers/${id}`);
      return data.data as Manufacturer;
    },
    enabled: !!id,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  // Invalida tanto a listagem da página quanto a lista de nomes (autocomplete/filtros)
  queryClient.invalidateQueries({ queryKey: ['manufacturers-list'] });
  queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
  queryClient.invalidateQueries({ queryKey: ['products', 'manufacturers'] });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Manufacturer>) => {
      const { data } = await api.post('/manufacturers', payload);
      return data.data as Manufacturer;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: payload }: { id: string; data: Partial<Manufacturer> }) => {
      const { data } = await api.put(`/manufacturers/${id}`, payload);
      return data.data as Manufacturer;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/manufacturers/${id}`);
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
