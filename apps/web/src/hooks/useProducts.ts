import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Product,
  ProductStatus,
  CreateProductDTO,
  UpdateProductDTO,
  PaginatedResponse,
} from '@ejr/shared-types';

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  family?: string;
  manufacturer?: string;
  status?: ProductStatus;
  inStock?: boolean;
  productType?: 'FINAL' | 'COMPONENT';
  sortBy?: string;
}

export function useProducts(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: Product[]; pagination: any }>('/products', {
        params,
      });
      return data;
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Product }>(`/products/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: string[] }>('/products/categories');
      return data.data;
    },
  });
}

export function useProductManufacturers() {
  return useQuery({
    queryKey: ['products', 'manufacturers'],
    queryFn: async () => {
      const { data } = await api.get<{ data: string[] }>('/products/manufacturers');
      return data.data;
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Product[] }>('/products/low-stock');
      return data.data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDTO) => {
      const response = await api.post<{ data: Product }>('/products', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductDTO }) => {
      const response = await api.patch<{ data: Product }>(`/products/${id}`, data);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all products queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Invalidate specific product query
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
      // Optionally, update the cache directly
      queryClient.setQueryData(['products', variables.id], data);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      operation,
    }: {
      id: string;
      quantity: number;
      operation: 'add' | 'subtract';
    }) => {
      const response = await api.patch<{ data: Product }>(`/products/${id}/stock`, {
        quantity,
        operation,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Invalidate BOM-related caches since stock changed
      queryClient.invalidateQueries({ queryKey: ['product-can-assemble'] });
      queryClient.invalidateQueries({ queryKey: ['product-bom'] });
      queryClient.invalidateQueries({ queryKey: ['product-parts'] });
    },
  });
}
