import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  ServiceOrder,
  ServiceOrderWithRelations,
  ServiceOrderStatus,
  CreateServiceOrderDTO,
  UpdateServiceOrderDTO,
  AddServicePartDTO,
  ServicePart,
} from '@ejr/shared-types';

interface FindManyParams {
  page?: number;
  limit?: number;
  status?: ServiceOrderStatus;
  customerId?: string;
  technicianId?: string;
  isWarranty?: boolean;
  startDate?: string;
  endDate?: string;
}

// Listar ordens de serviço com filtros
export function useServiceOrders(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['service-orders', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceOrderWithRelations[]; pagination: any }>(
        '/service-orders',
        { params }
      );
      return data;
    },
  });
}

// Buscar ordem de serviço por ID
export function useServiceOrder(id?: string) {
  return useQuery({
    queryKey: ['service-orders', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceOrderWithRelations }>(
        `/service-orders/${id}`
      );
      return data.data;
    },
    enabled: !!id,
  });
}

// Listar ordens de serviço por status
export function useServiceOrdersByStatus(status: ServiceOrderStatus) {
  return useQuery({
    queryKey: ['service-orders', 'status', status],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceOrderWithRelations[] }>(
        '/service-orders',
        {
          params: { status },
        }
      );
      return data.data;
    },
  });
}

// Listar ordens de serviço por cliente
export function useServiceOrdersByCustomer(customerId?: string) {
  return useQuery({
    queryKey: ['service-orders', 'customer', customerId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceOrderWithRelations[] }>(
        '/service-orders',
        {
          params: { customerId },
        }
      );
      return data.data;
    },
    enabled: !!customerId,
  });
}

// Estatísticas de ordens de serviço
export function useServiceOrderStats() {
  return useQuery({
    queryKey: ['service-orders', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: {
          total: number;
          open: number;
          inService: number;
          awaitingParts: number;
          awaitingApproval: number;
          completed: number;
          cancelled: number;
        };
      }>('/service-orders/stats');
      return data.data;
    },
  });
}

// Criar ordem de serviço
export function useCreateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateServiceOrderDTO) => {
      const response = await api.post<{ data: ServiceOrder }>('/service-orders', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Atualizar ordem de serviço
export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateServiceOrderDTO }) => {
      const response = await api.patch<{ data: ServiceOrder }>(
        `/service-orders/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Deletar ordem de serviço
export function useDeleteServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/service-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Adicionar peça à ordem de serviço
export function useAddServicePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceOrderId,
      data,
    }: {
      serviceOrderId: string;
      data: AddServicePartDTO;
    }) => {
      const response = await api.post<{ data: ServicePart }>(
        `/service-orders/${serviceOrderId}/parts`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', variables.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Remover peça da ordem de serviço
export function useRemoveServicePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceOrderId,
      partId,
    }: {
      serviceOrderId: string;
      partId: string;
    }) => {
      await api.delete(`/service-orders/${serviceOrderId}/parts/${partId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', variables.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Completar ordem de serviço
export function useCompleteServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ServiceOrder }>(
        `/service-orders/${id}`,
        {
          status: 'COMPLETED',
          completionDate: new Date().toISOString(),
        }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
