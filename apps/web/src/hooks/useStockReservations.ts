import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ReservationType = 'PRODUCTION_ORDER' | 'SERVICE_ORDER' | 'QUOTE' | 'MANUAL';
export type ReservationStatus = 'ACTIVE' | 'CONSUMED' | 'CANCELLED' | 'EXPIRED';

export interface StockReservation {
  id: string;
  productId: string;
  quantity: number;
  reservedForType: ReservationType;
  reservedForId?: string;
  reservedBy?: string;
  reason?: string;
  status: ReservationStatus;
  expiresAt?: string;
  createdAt: string;
  consumedAt?: string;
  cancelledAt?: string;
  notes?: string;
  // Relations
  product?: {
    code: string;
    name: string;
  };
}

export interface CreateReservationDTO {
  productId: string;
  quantity: number;
  reservedForType: ReservationType;
  reservedForId?: string;
  reservedBy?: string;
  reason?: string;
  expiresAt?: string;
  notes?: string;
}

export interface UpdateReservationDTO {
  quantity?: number;
  status?: ReservationStatus;
  expiresAt?: string;
  notes?: string;
}

interface FindManyParams {
  page?: number;
  limit?: number;
  productId?: string;
  status?: ReservationStatus;
  reservedForType?: ReservationType;
}

// Listar reservas com filtros
export function useStockReservations(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['stock-reservations', params],
    queryFn: async () => {
      const { data } = await api.get<{
        data: StockReservation[];
        pagination: any;
      }>('/stock-reservations', { params });
      return data;
    },
  });
}

// Buscar reserva por ID
export function useStockReservation(id?: string) {
  return useQuery({
    queryKey: ['stock-reservations', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: StockReservation }>(
        `/stock-reservations/${id}`
      );
      return data.data;
    },
    enabled: !!id,
  });
}

// Buscar reservas de um produto
export function useProductReservations(productId?: string, activeOnly = true) {
  return useQuery({
    queryKey: ['stock-reservations', 'product', productId, activeOnly],
    queryFn: async () => {
      const { data } = await api.get<{ data: StockReservation[] }>(
        `/stock-reservations/product/${productId}`,
        { params: { activeOnly } }
      );
      return data.data;
    },
    enabled: !!productId,
  });
}

// Buscar total reservado de um produto
export function useProductTotalReserved(productId?: string) {
  return useQuery({
    queryKey: ['stock-reservations', 'product', productId, 'total'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { productId: string; totalReserved: number } }>(
        `/stock-reservations/product/${productId}/total`
      );
      return data.data;
    },
    enabled: !!productId,
  });
}

// Criar nova reserva
export function useCreateStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReservationDTO) => {
      const response = await api.post<{ data: StockReservation }>(
        '/stock-reservations',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Atualizar reserva
export function useUpdateStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateReservationDTO }) => {
      const response = await api.patch<{ data: StockReservation }>(
        `/stock-reservations/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Consumir reserva
export function useConsumeStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: StockReservation }>(
        `/stock-reservations/${id}/consume`
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Cancelar reserva
export function useCancelStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ data: StockReservation }>(
        `/stock-reservations/${id}/cancel`
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Excluir reserva
export function useDeleteStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/stock-reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Cancelar reservas expiradas
export function useCancelExpiredReservations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { cancelledCount: number } }>(
        '/stock-reservations/cancel-expired'
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
