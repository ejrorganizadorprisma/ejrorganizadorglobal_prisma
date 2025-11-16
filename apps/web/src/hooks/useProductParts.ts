import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  ProductPart,
  ProductPartWithProduct,
  BOMExplosion,
  BOMAvailability,
  AddProductPartDTO,
  UpdateProductPartDTO,
} from '@ejr/shared-types';

// Listar peças de um produto
export function useProductParts(productId?: string) {
  return useQuery({
    queryKey: ['product-parts', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductPartWithProduct[] }>(
        `/products/${productId}/parts`
      );
      return data.data;
    },
    enabled: !!productId,
  });
}

// Explosão BOM - todas as peças com custos calculados
export function useProductBOM(productId?: string) {
  return useQuery({
    queryKey: ['product-bom', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: BOMExplosion[] }>(
        `/products/${productId}/bom`
      );
      return data.data;
    },
    enabled: !!productId,
  });
}

// Verificar disponibilidade de montagem
export function useCanAssemble(productId?: string, quantity?: number) {
  return useQuery({
    queryKey: ['product-can-assemble', productId, quantity],
    queryFn: async () => {
      const { data } = await api.get<{ data: BOMAvailability }>(
        `/products/${productId}/can-assemble`,
        {
          params: { quantity },
        }
      );
      return data.data;
    },
    enabled: !!productId && !!quantity && quantity > 0,
  });
}

// Adicionar peça ao produto
export function useAddProductPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: AddProductPartDTO;
    }) => {
      const response = await api.post<{ data: ProductPart }>(
        `/products/${productId}/parts`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-parts', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-bom', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
    },
  });
}

// Atualizar peça do produto
export function useUpdateProductPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      partId,
      data,
    }: {
      productId: string;
      partId: string;
      data: UpdateProductPartDTO;
    }) => {
      const response = await api.patch<{ data: ProductPart }>(
        `/products/${productId}/parts/${partId}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-parts', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-bom', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
    },
  });
}

// Remover peça do produto
export function useRemoveProductPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      partId,
    }: {
      productId: string;
      partId: string;
    }) => {
      await api.delete(`/products/${productId}/parts/${partId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-parts', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-bom', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId] });
    },
  });
}
