import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  FabricationMachine,
  FabricationMachineType,
  DigitalFabricationBatch,
  FabricationJobStatus,
  DigitalFabricationItem,
  FabricationMaterialConsumption,
  DigitalFabricationHistory,
  CreateFabricationMachineDTO,
  UpdateFabricationMachineDTO,
  CreateDigitalFabricationBatchDTO,
  UpdateDigitalFabricationBatchDTO,
  CreateDigitalFabricationItemDTO,
  UpdateDigitalFabricationItemDTO,
  RegisterMaterialConsumptionDTO,
  CompleteFabricationItemDTO,
  FabricationBatchSummary,
  FabricationDashboardStats,
} from '@ejr/shared-types';

const BASE_URL = '/digital-fabrication';

// ============================================
// DASHBOARD & STATS
// ============================================

export function useDigitalFabricationDashboard() {
  return useQuery({
    queryKey: ['digital-fabrication', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ data: FabricationDashboardStats }>(
        `${BASE_URL}/dashboard`
      );
      return data.data;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

export function useDigitalFabricationSummaries(machineType?: FabricationMachineType) {
  return useQuery({
    queryKey: ['digital-fabrication', 'summaries', machineType],
    queryFn: async () => {
      const { data } = await api.get<{ data: FabricationBatchSummary[] }>(
        `${BASE_URL}/summaries`,
        { params: machineType ? { machineType } : {} }
      );
      return data.data;
    },
  });
}

// ============================================
// MACHINES
// ============================================

export function useFabricationMachines(params: {
  type?: FabricationMachineType;
  isActive?: boolean;
} = {}) {
  return useQuery({
    queryKey: ['digital-fabrication', 'machines', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: FabricationMachine[] }>(
        `${BASE_URL}/machines`,
        { params }
      );
      return data.data;
    },
  });
}

export function useFabricationMachine(id?: string) {
  return useQuery({
    queryKey: ['digital-fabrication', 'machines', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: FabricationMachine }>(
        `${BASE_URL}/machines/${id}`
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateFabricationMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateFabricationMachineDTO) => {
      const { data } = await api.post<{ data: FabricationMachine }>(
        `${BASE_URL}/machines`,
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'machines'] });
    },
  });
}

export function useUpdateFabricationMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateFabricationMachineDTO }) => {
      const { data } = await api.patch<{ data: FabricationMachine }>(
        `${BASE_URL}/machines/${id}`,
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'machines'] });
    },
  });
}

export function useDeleteFabricationMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE_URL}/machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'machines'] });
    },
  });
}

// ============================================
// BATCHES
// ============================================

interface FindBatchesParams {
  page?: number;
  limit?: number;
  machineType?: FabricationMachineType;
  status?: FabricationJobStatus;
  machineId?: string;
  operatorId?: string;
}

export function useDigitalFabricationBatches(params: FindBatchesParams = {}) {
  return useQuery({
    queryKey: ['digital-fabrication', 'batches', params],
    queryFn: async () => {
      const { data } = await api.get<{
        data: DigitalFabricationBatch[];
        pagination: any;
      }>(`${BASE_URL}/batches`, { params });
      return data;
    },
  });
}

export function useDigitalFabricationBatch(id?: string) {
  return useQuery({
    queryKey: ['digital-fabrication', 'batches', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}`
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateDigitalFabricationBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateDigitalFabricationBatchDTO) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches`,
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function useUpdateDigitalFabricationBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateDigitalFabricationBatchDTO }) => {
      const { data } = await api.patch<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}`,
        dto
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function useDeleteDigitalFabricationBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE_URL}/batches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

// Batch lifecycle actions
export function useStartBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}/start`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function usePauseBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}/pause`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function useResumeBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}/resume`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function useCompleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}/complete`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function useCancelBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}/cancel`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

export function useFailBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: DigitalFabricationBatch }>(
        `${BASE_URL}/batches/${id}/fail`
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
    },
  });
}

// ============================================
// ITEMS
// ============================================

export function useFabricationItems(batchId?: string) {
  return useQuery({
    queryKey: ['digital-fabrication', 'items', batchId],
    queryFn: async () => {
      const { data } = await api.get<{ data: DigitalFabricationItem[] }>(
        `${BASE_URL}/batches/${batchId}/items`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useFabricationItem(itemId?: string, batchId?: string) {
  return useQuery({
    queryKey: ['digital-fabrication', 'items', itemId],
    queryFn: async () => {
      const { data } = await api.get<{ data: DigitalFabricationItem }>(
        `${BASE_URL}/batches/${batchId}/items/${itemId}`
      );
      return data.data;
    },
    enabled: !!itemId && !!batchId,
  });
}

export function useCreateFabricationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateDigitalFabricationItemDTO) => {
      const { data } = await api.post<{ data: DigitalFabricationItem }>(
        `${BASE_URL}/items`,
        dto
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'items', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'batches'] });
    },
  });
}

export function useUpdateFabricationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, dto }: { itemId: string; dto: UpdateDigitalFabricationItemDTO }) => {
      const { data } = await api.patch<{ data: DigitalFabricationItem }>(
        `${BASE_URL}/items/${itemId}`,
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'batches'] });
    },
  });
}

export function useDeleteFabricationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`${BASE_URL}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'batches'] });
    },
  });
}

export function useCompleteFabricationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, dto }: { itemId: string; dto: CompleteFabricationItemDTO }) => {
      const { data } = await api.post<{ data: DigitalFabricationItem }>(
        `${BASE_URL}/items/${itemId}/complete`,
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Atualiza estoque
    },
  });
}

// ============================================
// MATERIAL CONSUMPTION
// ============================================

export function useFabricationConsumption(batchId?: string) {
  return useQuery({
    queryKey: ['digital-fabrication', 'consumption', batchId],
    queryFn: async () => {
      const { data } = await api.get<{ data: FabricationMaterialConsumption[] }>(
        `${BASE_URL}/batches/${batchId}/consumption`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useRegisterConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RegisterMaterialConsumptionDTO) => {
      const { data } = await api.post<{ data: FabricationMaterialConsumption }>(
        `${BASE_URL}/consumption`,
        dto
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'consumption', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['digital-fabrication', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Atualiza estoque
    },
  });
}

// ============================================
// HISTORY
// ============================================

export function useFabricationHistory(batchId?: string) {
  return useQuery({
    queryKey: ['digital-fabrication', 'history', batchId],
    queryFn: async () => {
      const { data } = await api.get<{ data: DigitalFabricationHistory[] }>(
        `${BASE_URL}/batches/${batchId}/history`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}
