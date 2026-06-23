import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Marca — atributo do produto, opcionalmente ligada a uma Indústria.
export interface Brand {
  id: string;
  code?: string;
  name: string;
  manufacturerId?: string;
  manufacturerName?: string;
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

export function useBrandsList(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['brands-list', params],
    queryFn: async () => {
      const { data } = await api.get('/brands', { params });
      return data.data as { data: Brand[]; total: number };
    },
  });
}

export function useBrand(id?: string) {
  return useQuery({
    queryKey: ['brands-list', id],
    queryFn: async () => {
      const { data } = await api.get(`/brands/${id}`);
      return data.data as Brand;
    },
    enabled: !!id,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['brands-list'] });
  queryClient.invalidateQueries({ queryKey: ['brands'] });
}

// Entrada das mutations — manufacturerId pode ser null (desvincular indústria)
type BrandInput = Partial<Omit<Brand, 'manufacturerId'>> & { manufacturerId?: string | null };

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BrandInput) => {
      const { data } = await api.post('/brands', payload);
      return data.data as Brand;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: payload }: { id: string; data: BrandInput }) => {
      const { data } = await api.put(`/brands/${id}`, payload);
      return data.data as Brand;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/brands/${id}`);
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
