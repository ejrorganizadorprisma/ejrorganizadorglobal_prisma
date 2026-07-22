import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  ResolveMembership, TicketListItem, TicketDetail, TicketComment,
  MuralSuggestion, ResolveTeamMember, AdminOverview,
} from '@ejr/shared-types';

export function useResolveMe() {
  return useQuery({
    queryKey: ['resolve', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/resolve/me');
      return data.data as ResolveMembership & { userId: string };
    },
  });
}

export function useTickets(scope?: 'all', options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['resolve', 'tickets', scope || 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/resolve/tickets', { params: scope ? { scope } : {} });
      return data.data as { tickets: TicketListItem[]; membership: ResolveMembership };
    },
    enabled: options?.enabled ?? true,
  });
}

export function useTicket(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['resolve', 'ticket', id],
    queryFn: async () => {
      const { data } = await api.get(`/resolve/tickets/${id}`);
      return data.data as { ticket: TicketDetail; membership: ResolveMembership };
    },
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await api.post('/resolve/tickets', dto);
      return data.data as TicketListItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resolve'] }),
  });
}

export function useTicketAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, value, comment }: { id: string; action: string; value?: string; comment?: string }) => {
      const { data } = await api.patch(`/resolve/tickets/${id}`, { action, value, comment });
      return data.data as TicketListItem;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['resolve', 'ticket', v.id] });
      qc.invalidateQueries({ queryKey: ['resolve', 'tickets'] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, internal }: { id: string; body: string; internal?: boolean }) => {
      const { data } = await api.post(`/resolve/tickets/${id}/comments`, { body, internal });
      return data.data as TicketComment;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['resolve', 'ticket', v.id] }),
  });
}

export function useVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/resolve/tickets/${id}/vote`);
      return data.data as { voted: boolean; votes: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resolve', 'mural'] }),
  });
}

export function useMural() {
  return useQuery({
    queryKey: ['resolve', 'mural'],
    queryFn: async () => {
      const { data } = await api.get('/resolve/mural');
      return data.data as { suggestions: MuralSuggestion[]; loggedIn: boolean };
    },
  });
}

export function useTeam(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['resolve', 'team'],
    queryFn: async () => {
      const { data } = await api.get('/resolve/team');
      return data.data as { members: ResolveTeamMember[]; implicitAdmins: ResolveTeamMember[] };
    },
    enabled: options?.enabled ?? true,
  });
}

export function useSearchTeamUsers() {
  return useMutation({
    mutationFn: async (q: string) => {
      const { data } = await api.get('/resolve/team/users', { params: { q } });
      return data.data.users as Array<{ id: string; name: string; email: string | null; role: string; isMember: boolean }>;
    },
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.post('/resolve/team', { userId, role });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resolve', 'team'] }),
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role, active }: { memberId: string; role?: string; active?: boolean }) => {
      await api.patch(`/resolve/team/${memberId}`, { role, active });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resolve', 'team'] }),
  });
}

export function useAdminOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['resolve', 'admin', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/resolve/admin/overview');
      return data.data as AdminOverview;
    },
    enabled: options?.enabled ?? true,
  });
}
