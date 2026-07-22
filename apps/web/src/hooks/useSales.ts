import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Sale,
  CreateSaleDTO,
  UpdateSaleDTO,
  SaleFilters,
  SaleStats,
  CreateSalePaymentDTO,
  UpdateSalePaymentDTO,
} from '@ejr/shared-types';

export function useSales(filters: SaleFilters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const { data } = await api.get('/sales', { params: filters });
      return data;
    },
  });
}

export function useSale(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      const { data } = await api.get(`/sales/${id}`);
      return data.data as Sale;
    },
    ...options,
  });
}

export function useSaleStats(filters?: SaleFilters) {
  return useQuery({
    queryKey: ['sales', 'stats', filters],
    queryFn: async () => {
      const { data } = await api.get('/sales/stats', { params: filters });
      return data.data as SaleStats;
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleDTO) => {
      const response = await api.post('/sales', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSaleDTO }) => {
      const response = await api.put(`/sales/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/sales/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      data,
    }: {
      saleId: string;
      data: CreateSalePaymentDTO;
    }) => {
      const response = await api.post(`/sales/${saleId}/payments`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saleId,
      paymentId,
      data,
    }: {
      saleId: string;
      paymentId: string;
      data: UpdateSalePaymentDTO;
    }) => {
      const response = await api.put(`/sales/${saleId}/payments/${paymentId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

// ==================== FATURAMENTO / EXPEDIÇÃO / COLETA ====================

/** Fila de expedição: vendas Em Expedição + Aguardando Transportadora. */
export function useExpeditionQueue(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['expedition-queue'],
    queryFn: async () => {
      const [inExp, awaiting] = await Promise.all([
        api.get('/sales', { params: { fulfillmentStatus: 'IN_EXPEDITION', limit: 500 } }),
        api.get('/sales', { params: { fulfillmentStatus: 'AWAITING_CARRIER', limit: 500 } }),
      ]);
      const a = (inExp.data?.data ?? []) as Sale[];
      const b = (awaiting.data?.data ?? []) as Sale[];
      return [...a, ...b];
    },
    refetchInterval: options?.refetchInterval ?? 6000,
    refetchIntervalInBackground: false,
  });
}

function invalidateSalesQueues(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ['sales'] });
  qc.invalidateQueries({ queryKey: ['expedition-queue'] });
  if (id) qc.invalidateQueries({ queryKey: ['sales', id] });
}

export function useInvoiceSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { nfNumber?: string; nfDate?: string; nfAmount?: number; carrierId?: string } }) => {
      const res = await api.post(`/sales/${id}/invoice`, data);
      return res.data.data as Sale;
    },
    onSuccess: (_d, v) => invalidateSalesQueues(qc, v.id),
  });
}

export function useUploadSaleFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, endpoint, file }: { id: string; endpoint: 'invoice-file' | 'collection-receipt'; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/sales/${id}/${endpoint}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data.data as Sale;
    },
    onSuccess: (_d, v) => invalidateSalesQueues(qc, v.id),
  });
}

export function useExpeditionSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { carrierId: string; carrierScheduledDate?: string; volumesCount: number; bundlesCount?: number; expeditionNotes?: string; employeeCode?: string } }) => {
      const res = await api.post(`/sales/${id}/expedition`, data);
      return res.data.data as Sale;
    },
    onSuccess: (_d, v) => invalidateSalesQueues(qc, v.id),
  });
}

export function useCollectSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { driverName?: string; collectionCarrierVolumes?: number; employeeCode?: string; carrierId?: string; shippingCost?: number; freightMode?: string; trackingCode?: string; deliveryForecast?: string } }) => {
      const res = await api.post(`/sales/${id}/collect`, data);
      return res.data.data as Sale;
    },
    onSuccess: (_d, v) => invalidateSalesQueues(qc, v.id),
  });
}

export interface ConvertToSaleDTO {
  quoteId: string;
  paymentMethod: string;
  installments?: number;
  saleDate?: string;
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
}

export function useConvertToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConvertToSaleDTO) => {
      const response = await api.post('/sales/convert-from-quote', data);
      return response.data.data as Sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
