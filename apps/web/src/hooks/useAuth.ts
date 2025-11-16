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
      set({ user: null, isAuthenticated: false });
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  },

  fetchUser: async () => {
    // AUTENTICAÇÃO DESABILITADA - Mock user
    set({
      user: {
        id: 'mock-user-id',
        name: 'Administrador',
        email: 'admin@ejr.com',
        role: 'OWNER',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
