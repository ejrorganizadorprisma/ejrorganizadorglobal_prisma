import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  ProductionBatch,
  ProductionBatchStatus,
  ProductionUnit,
  ProductionUnitStatus,
  UnitComponent,
  UnitTest,
  ProductionHistory,
  CreateProductionBatchDTO,
  UpdateProductionBatchDTO,
  UpdateProductionUnitDTO,
  UpdateUnitComponentDTO,
  CreateUnitTestDTO,
  BatchSummary,
  UnitSummary,
  MyProductionUnit,
  MyProductionSummary,
} from '@ejr/shared-types';

interface FindManyParams {
  page?: number;
  limit?: number;
  status?: ProductionBatchStatus;
  productId?: string;
  assignedTo?: string;
}

// ============================================
// PRODUCTION BATCHES
// ============================================

export function useProductionBatches(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['production-batches', params],
    queryFn: async () => {
      const { data } = await api.get<{
        data: ProductionBatch[];
        pagination: any;
      }>('/production-batches', { params });
      return data;
    },
  });
}

export function useProductionBatch(id?: string) {
  return useQuery({
    queryKey: ['production-batches', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionBatch }>(
        `/production-batches/${id}`
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateProductionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProductionBatchDTO) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        '/production-batches',
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
    },
  });
}

export function useUpdateProductionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateProductionBatchDTO }) => {
      const { data } = await api.patch<{ data: ProductionBatch }>(
        `/production-batches/${id}`,
        dto
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', variables.id] });
    },
  });
}

export function useDeleteProductionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/production-batches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
    },
  });
}

// ============================================
// BATCH LIFECYCLE
// ============================================

export function useReleaseBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        `/production-batches/${id}/release`
      );
      return data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock changed
    },
  });
}

export function useStartBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        `/production-batches/${id}/start`
      );
      return data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', id] });
    },
  });
}

export function usePauseBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        `/production-batches/${id}/pause`
      );
      return data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', id] });
    },
  });
}

export function useResumeBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        `/production-batches/${id}/resume`
      );
      return data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', id] });
    },
  });
}

export function useCompleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        `/production-batches/${id}/complete`
      );
      return data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock changed
    },
  });
}

export function useCancelBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: ProductionBatch }>(
        `/production-batches/${id}/cancel`
      );
      return data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-batches', id] });
    },
  });
}

// ============================================
// PRODUCTION UNITS
// ============================================

export function useBatchUnits(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'units'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionUnit[] }>(
        `/production-batches/${batchId}/units`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useProductionUnit(batchId?: string, unitId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'units', unitId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionUnit }>(
        `/production-batches/${batchId}/units/${unitId}`
      );
      return data.data;
    },
    enabled: !!batchId && !!unitId,
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      unitId,
      dto,
    }: {
      batchId: string;
      unitId: string;
      dto: UpdateProductionUnitDTO;
    }) => {
      const { data } = await api.patch<{ data: ProductionUnit }>(
        `/production-batches/${batchId}/units/${unitId}`,
        dto
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId, 'units'],
      });
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId],
      });
    },
  });
}

export function useAssignUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      unitId,
      userId,
    }: {
      batchId: string;
      unitId: string;
      userId: string;
    }) => {
      const { data } = await api.post<{ data: ProductionUnit }>(
        `/production-batches/${batchId}/units/${unitId}/assign`,
        { userId }
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId, 'units'],
      });
      queryClient.invalidateQueries({ queryKey: ['my-production'] });
    },
  });
}

export function useStartUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, unitId }: { batchId: string; unitId: string }) => {
      const { data } = await api.post<{ data: ProductionUnit }>(
        `/production-batches/${batchId}/units/${unitId}/start`
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId, 'units'],
      });
      queryClient.invalidateQueries({ queryKey: ['my-production'] });
    },
  });
}

export function useFinishMounting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, unitId }: { batchId: string; unitId: string }) => {
      const { data } = await api.post<{ data: ProductionUnit }>(
        `/production-batches/${batchId}/units/${unitId}/finish-mounting`
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId, 'units'],
      });
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId],
      });
      queryClient.invalidateQueries({ queryKey: ['my-production'] });
    },
  });
}

export function useScrapUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      unitId,
      reason,
    }: {
      batchId: string;
      unitId: string;
      reason?: string;
    }) => {
      const { data } = await api.post<{ data: ProductionUnit }>(
        `/production-batches/${batchId}/units/${unitId}/scrap`,
        { reason }
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId, 'units'],
      });
      queryClient.invalidateQueries({
        queryKey: ['production-batches', variables.batchId],
      });
    },
  });
}

// ============================================
// UNIT COMPONENTS
// ============================================

export function useUnitComponents(batchId?: string, unitId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'units', unitId, 'components'],
    queryFn: async () => {
      const { data } = await api.get<{ data: UnitComponent[] }>(
        `/production-batches/${batchId}/units/${unitId}/components`
      );
      return data.data;
    },
    enabled: !!batchId && !!unitId,
  });
}

export function useUpdateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      unitId,
      componentId,
      dto,
    }: {
      batchId: string;
      unitId: string;
      componentId: string;
      dto: UpdateUnitComponentDTO;
    }) => {
      const { data } = await api.patch<{ data: UnitComponent }>(
        `/production-batches/${batchId}/units/${unitId}/components/${componentId}`,
        dto
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'production-batches',
          variables.batchId,
          'units',
          variables.unitId,
          'components',
        ],
      });
    },
  });
}

export function useMountComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      unitId,
      componentId,
      quantityUsed,
    }: {
      batchId: string;
      unitId: string;
      componentId: string;
      quantityUsed?: number;
    }) => {
      const { data } = await api.post<{ data: UnitComponent }>(
        `/production-batches/${batchId}/units/${unitId}/components/${componentId}/mount`,
        { quantityUsed }
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      // Forçar refetch imediato dos componentes
      queryClient.refetchQueries({
        queryKey: [
          'production-batches',
          variables.batchId,
          'units',
          variables.unitId,
          'components',
        ],
      });
      // Forçar refetch imediato da minha produção
      queryClient.refetchQueries({ queryKey: ['my-production', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['my-production'] });
    },
  });
}

export function useMountAllComponents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, unitId }: { batchId: string; unitId: string }) => {
      await api.post(
        `/production-batches/${batchId}/units/${unitId}/components/mount-all`
      );
    },
    onSuccess: (_, variables) => {
      // Forçar refetch imediato dos componentes
      queryClient.refetchQueries({
        queryKey: [
          'production-batches',
          variables.batchId,
          'units',
          variables.unitId,
          'components',
        ],
      });
      // Forçar refetch imediato da minha produção
      queryClient.refetchQueries({ queryKey: ['my-production', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['my-production'] });
    },
  });
}

export function useMarkComponentDefective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      unitId,
      componentId,
      notes,
    }: {
      batchId: string;
      unitId: string;
      componentId: string;
      notes?: string;
    }) => {
      const { data } = await api.post<{ data: UnitComponent }>(
        `/production-batches/${batchId}/units/${unitId}/components/${componentId}/defective`,
        { notes }
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'production-batches',
          variables.batchId,
          'units',
          variables.unitId,
          'components',
        ],
      });
    },
  });
}

// ============================================
// UNIT TESTS
// ============================================

export function useUnitTests(batchId?: string, unitId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'units', unitId, 'tests'],
    queryFn: async () => {
      const { data } = await api.get<{ data: UnitTest[] }>(
        `/production-batches/${batchId}/units/${unitId}/tests`
      );
      return data.data;
    },
    enabled: !!batchId && !!unitId,
  });
}

export function useCreateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateUnitTestDTO) => {
      const { data } = await api.post<{ data: UnitTest }>(
        '/production-batches/tests',
        dto
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['my-production'] });
    },
  });
}

// ============================================
// HISTORY
// ============================================

export function useBatchHistory(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'history'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionHistory[] }>(
        `/production-batches/${batchId}/history`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useUnitHistory(batchId?: string, unitId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'units', unitId, 'history'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionHistory[] }>(
        `/production-batches/${batchId}/units/${unitId}/history`
      );
      return data.data;
    },
    enabled: !!batchId && !!unitId,
  });
}

// ============================================
// SUMMARIES
// ============================================

export function useBatchSummary(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'summary'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BatchSummary }>(
        `/production-batches/${batchId}/summary`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useUnitsSummary(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'units-summary'],
    queryFn: async () => {
      const { data } = await api.get<{ data: UnitSummary[] }>(
        `/production-batches/${batchId}/units-summary`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

// ============================================
// MY PRODUCTION
// ============================================

export function useMyProductionUnits() {
  return useQuery({
    queryKey: ['my-production', 'units'],
    queryFn: async () => {
      const { data } = await api.get<{ data: MyProductionUnit[] }>(
        '/production-batches/my-production/units'
      );
      return data.data;
    },
  });
}

export function useMyProductionSummary() {
  return useQuery({
    queryKey: ['my-production', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<{ data: MyProductionSummary }>(
        '/production-batches/my-production/summary'
      );
      return data.data;
    },
  });
}

// ============================================
// COMPONENT RELEASE (Liberação de Componentes)
// ============================================

interface ReleaseSummaryItem {
  partId: string;
  partCode: string;
  partName: string;
  quantityPerUnit: number;
  totalUnits: number;
  totalRequired: number;
  totalReleased: number;
  remainingToRelease: number;
  currentStock: number;
  percentReleased: number;
}

interface ComponentForRelease extends UnitComponent {
  unitNumber: number;
}

export function useComponentsForRelease(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'release-components'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ComponentForRelease[] }>(
        `/production-batches/${batchId}/release-components`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useReleaseSummary(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'release-summary'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ReleaseSummaryItem[] }>(
        `/production-batches/${batchId}/release-summary`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useReleaseHistory(batchId?: string) {
  return useQuery({
    queryKey: ['production-batches', batchId, 'release-history'],
    queryFn: async () => {
      const { data } = await api.get<{ data: any[] }>(
        `/production-batches/${batchId}/release-history`
      );
      return data.data;
    },
    enabled: !!batchId,
  });
}

export function useReleaseComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      componentId,
      quantity,
      notes,
    }: {
      componentId: string;
      quantity: number;
      notes?: string;
    }) => {
      const { data } = await api.post<{ data: UnitComponent }>(
        `/production-batches/components/${componentId}/release`,
        { quantity, notes }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock changed
    },
  });
}

export function useReleaseMultipleComponents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      releases,
      notes,
    }: {
      batchId: string;
      releases: Array<{ componentId: string; quantity: number }>;
      notes?: string;
    }) => {
      const { data } = await api.post<{
        data: { success: number; failed: number; errors: string[] };
      }>(`/production-batches/${batchId}/release-multiple`, { releases, notes });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock changed
    },
  });
}
