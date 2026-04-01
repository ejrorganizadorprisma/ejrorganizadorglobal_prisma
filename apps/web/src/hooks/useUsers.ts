import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { UserRole, UpdateUserDTO, CreateUserDTO } from '@ejr/shared-types';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  allowedHours?: {
    timeRanges: Array<{
      start: string;
      end: string;
    }>;
    days?: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export function useUsers(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: User[]; pagination: any }>('/users', {
        params,
      });
      return data;
    },
  });
}

export function useUser(id?: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: User }>(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDTO }) => {
      const response = await api.patch<{ data: User }>(`/users/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar usuário');
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: User; message: string }>(
        `/users/${id}/toggle-status`
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error('Erro ao alterar status do usuário');
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDTO) => {
      const response = await api.post<{ data: User }>('/auth/register', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado com sucesso');
    },
    // Removido onError genérico para permitir que o componente mostre o erro específico
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário deletado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao deletar usuário');
    },
  });
}
