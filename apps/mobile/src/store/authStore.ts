import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const result = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (result.success && result.data) {
        const { user, token } = result.data;
        await SecureStore.setItemAsync('auth_token', token);
        set({ user, token, isAuthenticated: true });
        return { success: true };
      }

      return { success: false, error: result.error?.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        set({ token, isLoading: true });
        // Verify token with /auth/me
        const result = await apiRequest<User>('/auth/me', { token });
        if (result.success && result.data) {
          set({ user: result.data, isAuthenticated: true, isLoading: false });
          return;
        }
      }
    } catch (error) {
      // Token invalid or expired
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkSession: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const result = await apiRequest<User>('/auth/me', { token });
      if (result.success && result.data) {
        set({ user: result.data });
      }
    } catch (error) {
      // silently fail
    }
  },
}));
