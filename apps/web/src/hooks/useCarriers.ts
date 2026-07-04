import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Carrier, CreateCarrierDTO, UpdateCarrierDTO } from '@ejr/shared-types';

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function useCarriersList(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['carriers-list', params],
    queryFn: async () => {
      const { data } = await api.get('/carriers', { params });
      return data.data as { data: Carrier[]; total: number };
    },
  });
}

export function useActiveCarriers() {
  return useQuery({
    queryKey: ['carriers-active'],
    queryFn: async () => {
      const { data } = await api.get('/carriers', { params: { status: 'ACTIVE', limit: 500 } });
      return (data.data?.data ?? []) as Carrier[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['carriers-list'] });
  qc.invalidateQueries({ queryKey: ['carriers-active'] });
}

export function useCreateCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCarrierDTO) => {
      const { data } = await api.post('/carriers', payload);
      return data.data as Carrier;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: payload }: { id: string; data: UpdateCarrierDTO }) => {
      const { data } = await api.put(`/carriers/${id}`, payload);
      return data.data as Carrier;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/carriers/${id}`); },
    onSuccess: () => invalidate(qc),
  });
}
