import { create } from 'zustand';
import { api } from '../lib/api';
import type { User, LoginDTO } from '@ejr/shared-types';
import { toast } from 'sonner';

interface LoginResponseData {
  user: Omit<User, 'passwordHash'>;
  // csrfToken vem no body por conveniencia (tambem esta no cookie nao-HttpOnly).
  csrfToken?: string;
}

interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginDTO) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (data: LoginDTO) => {
    try {
      set({ isLoading: true });
      const response = await api.post<{ success: boolean; data: LoginResponseData }>(
        '/auth/login',
        data
      );

      // Tokens viajam em cookies HttpOnly — nao tocamos localStorage.
      // O cookie csrfToken (nao-HttpOnly) e setado pelo servidor;
      // o interceptor le ele em mutations subsequentes.
      set({
        user: response.data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.error?.message || 'Erro ao fazer login';
      toast.error(message);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignora — vamos limpar o estado local mesmo se a chamada falhar.
    } finally {
      // Higiene: limpa qualquer "token" antigo deixado no localStorage por
      // versoes anteriores da app.
      try { localStorage.removeItem('token'); } catch { /* ignore */ }
      set({ user: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<{ success: boolean; data: Omit<User, 'passwordHash'> }>(
        '/auth/me'
      );
      set({
        user: response.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      // Silencia erro 401 (esperado quando nao ha sessao)
      if (error.response?.status !== 401) {
        console.error('Erro ao buscar usuario:', error);
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
