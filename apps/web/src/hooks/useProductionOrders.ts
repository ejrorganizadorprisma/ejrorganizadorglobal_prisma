import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ProductionOrderStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type ProductionOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  product?: {
    id: string;
    code: string;
    name: string;
  };
  bomVersionId?: string;
  quantityPlanned: number;
  quantityProduced: number;
  quantityScrapped: number;
  quantityPending: number;
  status: ProductionOrderStatus;
  priority: ProductionOrderPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  dueDate?: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  relatedQuoteId?: string;
  relatedServiceOrderId?: string;
  createdBy?: string;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialConsumption {
  id: string;
  productionOrderId: string;
  productId: string;
  product?: {
    id: string;
    code: string;
    name: string;
    currentStock: number;
  };
  bomItemId?: string;
  quantityPlanned: number;
  quantityConsumed: number;
  quantityScrapped: number;
  unitCost?: number;
  consumedBy?: string;
  consumedAt?: string;
  lotNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface ProductionOperation {
  id: string;
  productionOrderId: string;
  operationNumber: number;
  name: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  startedAt?: string;
  completedAt?: string;
  assignedTo?: string;
  workstation?: string;
  requiredSkills?: string;
  qualityCheckRequired: boolean;
  qualityStatus?: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
  qualityNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionReporting {
  id: string;
  productionOrderId: string;
  reportingDate: string;
  quantityProduced: number;
  quantityScrapped: number;
  scrapReason?: string;
  reportedBy?: string;
  shift?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateProductionOrderDTO {
  productId: string;
  bomVersionId?: string;
  quantityPlanned: number;
  priority?: ProductionOrderPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  dueDate?: string;
  relatedQuoteId?: string;
  relatedServiceOrderId?: string;
  createdBy?: string;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
}

export interface UpdateProductionOrderDTO {
  quantityPlanned?: number;
  status?: ProductionOrderStatus;
  priority?: ProductionOrderPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  dueDate?: string;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
}

export interface CreateProductionReportingDTO {
  productionOrderId: string;
  quantityProduced: number;
  quantityScrapped?: number;
  scrapReason?: string;
  reportedBy?: string;
  shift?: string;
  notes?: string;
}

interface FindManyParams {
  page?: number;
  limit?: number;
  status?: ProductionOrderStatus;
  priority?: ProductionOrderPriority;
  productId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
}

// List production orders with filters
export function useProductionOrders(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['production-orders', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionOrder[]; pagination: any }>(
        '/production-orders',
        { params }
      );
      return data;
    },
  });
}

// Get production order by ID
export function useProductionOrder(id?: string) {
  return useQuery({
    queryKey: ['production-orders', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionOrder }>(
        `/production-orders/${id}`
      );
      return data.data;
    },
    enabled: !!id,
  });
}

// Create production order
export function useCreateProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductionOrderDTO) => {
      const response = await api.post<{ data: ProductionOrder }>(
        '/production-orders',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Update production order
export function useUpdateProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductionOrderDTO }) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Delete production order
export function useDeleteProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/production-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Release production order (DRAFT/PLANNED -> RELEASED)
export function useReleaseProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        { status: 'RELEASED' }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}

// Start production order (RELEASED -> IN_PROGRESS)
export function useStartProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        {
          status: 'IN_PROGRESS',
          actualStartDate: new Date().toISOString()
        }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}

// Pause production order (IN_PROGRESS -> PAUSED)
export function usePauseProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        { status: 'PAUSED' }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}

// Resume production order (PAUSED -> IN_PROGRESS)
export function useResumeProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        { status: 'IN_PROGRESS' }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}

// Complete production order (IN_PROGRESS -> COMPLETED)
export function useCompleteProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        {
          status: 'COMPLETED',
          actualEndDate: new Date().toISOString()
        }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Cancel production order
export function useCancelProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: ProductionOrder }>(
        `/production-orders/${id}`,
        { status: 'CANCELLED' }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Get material consumption for a production order
export function useProductionOrderMaterials(orderId?: string) {
  return useQuery({
    queryKey: ['production-orders', orderId, 'materials'],
    queryFn: async () => {
      const { data } = await api.get<{ data: MaterialConsumption[] }>(
        `/production-orders/${orderId}/materials`
      );
      return data.data;
    },
    enabled: !!orderId,
  });
}

// Get operations for a production order
export function useProductionOrderOperations(orderId?: string) {
  return useQuery({
    queryKey: ['production-orders', orderId, 'operations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionOperation[] }>(
        `/production-orders/${orderId}/operations`
      );
      return data.data;
    },
    enabled: !!orderId,
  });
}

// Get production reports for a production order
export function useProductionOrderReports(orderId?: string) {
  return useQuery({
    queryKey: ['production-orders', orderId, 'reports'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductionReporting[] }>(
        `/production-orders/${orderId}/reports`
      );
      return data.data;
    },
    enabled: !!orderId,
  });
}

// Create production report
export function useCreateProductionReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductionReportingDTO) => {
      const response = await api.post<{ data: ProductionReporting }>(
        `/production-orders/${data.productionOrderId}/reports`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['production-orders', variables.productionOrderId]
      });
      queryClient.invalidateQueries({
        queryKey: ['production-orders', variables.productionOrderId, 'reports']
      });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}
