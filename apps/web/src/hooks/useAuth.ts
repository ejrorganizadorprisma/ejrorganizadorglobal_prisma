import { create} from 'zustand';
import { api } from '../lib/api';
import type { User, LoginDTO, AuthResponse } from '@ejr/shared-types';
import { toast } from 'sonner';

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
      console.log('🔐 Tentando fazer login com:', data.email);
      set({ isLoading: true });
      const response = await api.post<{ success: boolean; data: AuthResponse }>(
        '/auth/login',
        data
      );
      console.log('✅ Login bem-sucedido!', response.data);

      // Salvar token no localStorage para uso em rede
      if (response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
      }

      set({
        user: response.data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro no login:', error.response?.data || error.message);
      set({ isLoading: false });
      const message = error.response?.data?.error?.message || 'Erro ao fazer login';
      toast.error(message);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token'); // Remove token do localStorage
      set({ user: null, isAuthenticated: false });
      toast.success('Logout realizado com sucesso!');
      // Redireciona para a página de login
      window.location.href = '/login';
    } catch (error) {
      toast.error('Erro ao fazer logout');
      // Mesmo com erro, limpa o estado e redireciona
      localStorage.removeItem('token'); // Remove token do localStorage
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
      // Silencia erro 401 (não autenticado) - esperado quando não há token
      if (error.response?.status !== 401) {
        console.error('Erro ao buscar usuário:', error);
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
