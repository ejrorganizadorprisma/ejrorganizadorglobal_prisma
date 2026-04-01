import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApprovalDelegation, CreateApprovalDelegationDTO } from '@ejr/shared-types';

export function useApprovalDelegations() {
  return useQuery({
    queryKey: ['approval-delegations'],
    queryFn: async () => {
      const { data } = await api.get('/approval-delegations');
      return data.data as ApprovalDelegation[];
    },
  });
}

export function useActiveDelegations() {
  return useQuery({
    queryKey: ['approval-delegations', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/approval-delegations/active');
      return data.data as ApprovalDelegation[];
    },
  });
}

export function useCreateDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateApprovalDelegationDTO) => {
      const { data } = await api.post('/approval-delegations', dto);
      return data.data as ApprovalDelegation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/approval-delegations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
