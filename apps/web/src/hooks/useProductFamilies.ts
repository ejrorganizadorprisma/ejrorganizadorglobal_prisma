import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ProductFamily, CreateProductFamilyDTO, UpdateProductFamilyDTO } from '@ejr/shared-types';

export function useProductFamilies() {
  return useQuery({
    queryKey: ['product-families'],
    queryFn: async () => {
      const res = await api.get('/product-families');
      return res.data.data as ProductFamily[];
    },
  });
}

export function useActiveProductFamilies() {
  return useQuery({
    queryKey: ['product-families', 'active'],
    queryFn: async () => {
      const res = await api.get('/product-families/active');
      return res.data.data as ProductFamily[];
    },
  });
}

export function useProductFamily(id: string | undefined) {
  return useQuery({
    queryKey: ['product-families', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/product-families/${id}`);
      return res.data.data as ProductFamily;
    },
    enabled: !!id,
  });
}

export function useCreateProductFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductFamilyDTO) => {
      const res = await api.post('/product-families', data);
      return res.data.data as ProductFamily;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-families'] });
    },
  });
}

export function useUpdateProductFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductFamilyDTO }) => {
      const res = await api.put(`/product-families/${id}`, data);
      return res.data.data as ProductFamily;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-families'] });
    },
  });
}

export function useDeleteProductFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/product-families/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-families'] });
    },
  });
}
