import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  ProductSupplier,
  CreateProductSupplierDTO,
  UpdateProductSupplierDTO,
} from '@ejr/shared-types';

// Listar fornecedores de um produto
export function useProductSuppliers(productId?: string) {
  return useQuery({
    queryKey: ['product-suppliers', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: any[] }>(
        `/products/${productId}/suppliers`
      );
      return data.data;
    },
    enabled: !!productId,
  });
}

// Listar produtos de um fornecedor
export function useSupplierProducts(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: async () => {
      const { data } = await api.get<{ data: any[] }>(
        `/suppliers/${supplierId}/products`
      );
      return data.data;
    },
    enabled: !!supplierId,
  });
}

// Vincular fornecedor ao produto
export function useAddProductSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateProductSupplierDTO;
    }) => {
      const response = await api.post<{ data: ProductSupplier }>(
        `/products/${productId}/suppliers`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-products', variables.data.supplierId] });
    },
  });
}

// Atualizar relacionamento produto-fornecedor
export function useUpdateProductSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      productId,
      data,
    }: {
      id: string;
      productId?: string;
      data: UpdateProductSupplierDTO;
    }) => {
      const response = await api.put<{ data: ProductSupplier }>(
        `/products/product-suppliers/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (result, variables) => {
      if (variables.productId) {
        queryClient.invalidateQueries({ queryKey: ['product-suppliers', variables.productId] });
        queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
      }
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
    },
  });
}

// Desvincular fornecedor do produto
export function useRemoveProductSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      productId,
      supplierId,
    }: {
      id: string;
      productId?: string;
      supplierId?: string;
    }) => {
      await api.delete(`/products/product-suppliers/${id}`);
    },
    onSuccess: (_, variables) => {
      if (variables.productId) {
        queryClient.invalidateQueries({ queryKey: ['product-suppliers', variables.productId] });
        queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
      }
      if (variables.supplierId) {
        queryClient.invalidateQueries({ queryKey: ['supplier-products', variables.supplierId] });
      }
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
    },
  });
}
