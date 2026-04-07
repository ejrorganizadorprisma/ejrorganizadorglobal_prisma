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

export interface MobilePermissions {
  customers: boolean;
  quotes: boolean;
  sales: boolean;
  products: boolean;
  collections?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mobileAccessDenied: boolean;
  mobileAccessError: string | null;
  mobilePermissions: MobilePermissions | null;
  companyName: string | null;
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
  mobilePermissions: null,
  companyName: null,

  login: async (email: string, password: string, connectionKey: string) => {
    try {
      await setApiKey(connectionKey);

      const result = await apiRequest<{ user: User; token: string; mobilePermissions?: MobilePermissions }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (result.success && result.data) {
        const { user, token } = result.data;
        const mobilePermissions = result.data.mobilePermissions || null;
        await SecureStore.setItemAsync('auth_token', token);
        if (mobilePermissions) {
          await AsyncStorage.setItem('@ejr_mobile_permissions', JSON.stringify(mobilePermissions));
        }
        const storedCompanyName = await AsyncStorage.getItem('@ejr_mobile_company_name');
        set({ user, token, isAuthenticated: true, isLoading: false, mobileAccessDenied: false, mobileAccessError: null, mobilePermissions, companyName: storedCompanyName });
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
    await AsyncStorage.removeItem('@ejr_mobile_permissions');
    await AsyncStorage.removeItem('@ejr_mobile_company_name');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobileAccessDenied: false, mobileAccessError: null, mobilePermissions: null, companyName: null });
  },

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        // Try to validate token with a timeout
        const result = await apiRequest<User & { mobilePermissions?: MobilePermissions }>('/auth/me', { token, timeoutMs: 10000 });
        if (result.success && result.data) {
          let mobilePermissions: MobilePermissions | null = result.data.mobilePermissions || null;
          if (mobilePermissions) {
            await AsyncStorage.setItem('@ejr_mobile_permissions', JSON.stringify(mobilePermissions));
          } else {
            const stored = await AsyncStorage.getItem('@ejr_mobile_permissions');
            if (stored) {
              mobilePermissions = JSON.parse(stored);
            }
          }
          const storedCompanyName = await AsyncStorage.getItem('@ejr_mobile_company_name');
          set({ user: result.data, token, isAuthenticated: true, isLoading: false, mobileAccessDenied: false, mobilePermissions, companyName: storedCompanyName });
          return;
        }

        // If API call failed but not a mobile access error, still allow offline access
        const errorMsg = result.error?.message;
        if (isMobileAccessError(errorMsg)) {
          await SecureStore.deleteItemAsync('auth_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobileAccessDenied: true, mobileAccessError: errorMsg, mobilePermissions: null, companyName: null });
          return;
        }

        // Network/timeout error: allow offline access with cached permissions
        const storedPerms = await AsyncStorage.getItem('@ejr_mobile_permissions');
        const mobilePermissions = storedPerms ? JSON.parse(storedPerms) : null;
        const storedCompanyNameOffline = await AsyncStorage.getItem('@ejr_mobile_company_name');
        set({ user: null, token, isAuthenticated: true, isLoading: false, mobileAccessDenied: false, mobilePermissions, companyName: storedCompanyNameOffline });
        return;
      }
    } catch (error) {
      // Token invalid or expired — allow offline access if token exists
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          const storedPerms = await AsyncStorage.getItem('@ejr_mobile_permissions');
          const mobilePermissions = storedPerms ? JSON.parse(storedPerms) : null;
          const storedCompanyNameCatch = await AsyncStorage.getItem('@ejr_mobile_company_name');
          set({ user: null, token, isAuthenticated: true, isLoading: false, mobileAccessDenied: false, mobilePermissions, companyName: storedCompanyNameCatch });
          return;
        }
      } catch { /* ignore */ }
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobilePermissions: null, companyName: null });
  },

  checkSession: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const result = await apiRequest<User & { mobilePermissions?: MobilePermissions }>('/auth/me', { token, timeoutMs: 10000 });
      if (result.success && result.data) {
        const mobilePermissions = result.data.mobilePermissions || null;
        if (mobilePermissions) {
          await AsyncStorage.setItem('@ejr_mobile_permissions', JSON.stringify(mobilePermissions));
        }
        set({ user: result.data, mobileAccessDenied: false, mobilePermissions: mobilePermissions || get().mobilePermissions });
      } else {
        const errorMsg = result.error?.message;
        if (isMobileAccessError(errorMsg)) {
          await SecureStore.deleteItemAsync('auth_token');
          set({ user: null, token: null, isAuthenticated: false, mobileAccessDenied: true, mobileAccessError: errorMsg, mobilePermissions: null });
        }
      }
    } catch {
      // silently fail
    }
  },
}));
