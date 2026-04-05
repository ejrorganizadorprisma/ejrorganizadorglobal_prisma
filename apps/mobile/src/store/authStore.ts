import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, setApiKey, clearApiKeyCache } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  mobileAccessDenied: boolean;
  mobileAccessError: string | null;
  login: (email: string, password: string, connectionKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const MOBILE_ACCESS_ERRORS = [
  'Acesso via aplicativo desabilitado pelo administrador',
  'Chave de conexão inválida',
];

function isMobileAccessError(message?: string): boolean {
  if (!message) return false;
  return MOBILE_ACCESS_ERRORS.some(e => message.includes(e));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  mobileAccessDenied: false,
  mobileAccessError: null,

  login: async (email: string, password: string, connectionKey: string) => {
    try {
      // Save the connection key before making the request
      await setApiKey(connectionKey);

      const result = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (result.success && result.data) {
        const { user, token } = result.data;
        await SecureStore.setItemAsync('auth_token', token);
        set({ user, token, isAuthenticated: true, mobileAccessDenied: false, mobileAccessError: null });
        return { success: true };
      }

      const errorMsg = result.error?.message || 'Login failed';

      if (isMobileAccessError(errorMsg)) {
        set({ mobileAccessDenied: true, mobileAccessError: errorMsg });
      }

      return { success: false, error: errorMsg };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null, isAuthenticated: false, mobileAccessDenied: false, mobileAccessError: null });
  },

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        set({ token, isLoading: true });
        const result = await apiRequest<User>('/auth/me', { token });
        if (result.success && result.data) {
          set({ user: result.data, isAuthenticated: true, isLoading: false, mobileAccessDenied: false });
          return;
        }

        // Check if it's a mobile access error (admin disabled or key changed)
        const errorMsg = result.error?.message;
        if (isMobileAccessError(errorMsg)) {
          await SecureStore.deleteItemAsync('auth_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobileAccessDenied: true, mobileAccessError: errorMsg });
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
        set({ user: result.data, mobileAccessDenied: false });
      } else {
        const errorMsg = result.error?.message;
        if (isMobileAccessError(errorMsg)) {
          await SecureStore.deleteItemAsync('auth_token');
          set({ user: null, token: null, isAuthenticated: false, mobileAccessDenied: true, mobileAccessError: errorMsg });
        }
      }
    } catch (error) {
      // silently fail
    }
  },
}));
