import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ProductCategory, CreateProductCategoryDTO, UpdateProductCategoryDTO } from '@ejr/shared-types';

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const res = await api.get('/product-categories');
      return res.data.data as ProductCategory[];
    },
  });
}

export function useActiveProductCategories() {
  return useQuery({
    queryKey: ['product-categories', 'active'],
    queryFn: async () => {
      const res = await api.get('/product-categories/active');
      return res.data.data as ProductCategory[];
    },
  });
}

export function useProductCategory(id: string | undefined) {
  return useQuery({
    queryKey: ['product-categories', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/product-categories/${id}`);
      return res.data.data as ProductCategory;
    },
    enabled: !!id,
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductCategoryDTO) => {
      const res = await api.post('/product-categories', data);
      return res.data.data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductCategoryDTO }) => {
      const res = await api.put(`/product-categories/${id}`, data);
      return res.data.data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/product-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    },
  });
}
