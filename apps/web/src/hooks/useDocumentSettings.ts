import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  DocumentSettings,
  CreateDocumentSettingsDTO,
  UpdateDocumentSettingsDTO,
  ApiResponse,
} from '@ejr/shared-types';

// Fetch all document settings
export function useDocumentSettings() {
  return useQuery<DocumentSettings[]>({
    queryKey: ['document-settings'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DocumentSettings[]>>('/document-settings');
      return data.data || [];
    },
  });
}

// Fetch single document settings by ID
export function useDocumentSettingsById(id: string, options?: { enabled?: boolean }) {
  return useQuery<DocumentSettings>({
    queryKey: ['document-settings', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DocumentSettings>>(`/document-settings/${id}`);
      return data.data!;
    },
    enabled: options?.enabled ?? true,
  });
}

// Fetch default document settings
export function useDefaultDocumentSettings() {
  return useQuery<DocumentSettings>({
    queryKey: ['document-settings', 'default'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DocumentSettings>>('/document-settings/default');
      return data.data!;
    },
    retry: 1, // Only retry once for default settings
  });
}

// Create document settings
export function useCreateDocumentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDocumentSettingsDTO) => {
      const response = await api.post<ApiResponse<DocumentSettings>>('/document-settings', data);
      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-settings'] });
    },
  });
}

// Update document settings
export function useUpdateDocumentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDocumentSettingsDTO }) => {
      const response = await api.put<ApiResponse<DocumentSettings>>(`/document-settings/${id}`, data);
      return response.data.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-settings'] });
      queryClient.invalidateQueries({ queryKey: ['document-settings', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['document-settings', 'default'] });
    },
  });
}

// Delete document settings
export function useDeleteDocumentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/document-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-settings'] });
    },
  });
}

// Set as default
export function useSetDefaultDocumentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put<ApiResponse<DocumentSettings>>(
        `/document-settings/${id}/set-default`
      );
      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-settings'] });
      queryClient.invalidateQueries({ queryKey: ['document-settings', 'default'] });
    },
  });
}
