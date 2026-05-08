import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  apiRequest,
  setApiKey,
  clearApiKeyCache,
  setTokenExpiredHandler,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
} from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../db/migrations';
import {
  registerForPushNotifications,
  unregisterPushToken,
  getStoredPushToken,
  clearStoredPushToken,
} from '../lib/pushNotifications';

// Check if API error indicates an expired/invalid token
function isTokenExpiredError(message?: string, code?: string): boolean {
  if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID') return true;
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('token') && (lower.includes('expirado') || lower.includes('inválido') || lower.includes('invalido'));
}

// Reset sync queue retry counter so stuck items get pushed again
async function resetSyncQueueAttempts() {
  try {
    const db = await getDatabase();
    await db.runAsync('UPDATE sync_queue SET attempts = 0');
  } catch {
    // table may not exist yet
  }
}

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
  token: string | null; // access token (mantido em memoria + estado)
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

// Migra storage legado: se houver auth_token salvo em SecureStore (fluxo antigo),
// limpamos para forcar re-login. O novo fluxo nao usa essa key.
async function migrateLegacyToken() {
  try {
    const legacy = await SecureStore.getItemAsync('auth_token');
    if (legacy) {
      await SecureStore.deleteItemAsync('auth_token');
    }
  } catch { /* ignore */ }
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

      const result = await apiRequest<{
        user: User;
        token: string; // back-compat (= accessToken)
        accessToken?: string;
        refreshToken?: string;
        mobilePermissions?: MobilePermissions;
      }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (result.success && result.data) {
        const { user } = result.data;
        const accessToken = result.data.accessToken || result.data.token;
        const refreshToken = result.data.refreshToken;
        const mobilePermissions = result.data.mobilePermissions || null;

        setAccessToken(accessToken);
        if (refreshToken) {
          await setRefreshToken(refreshToken);
        } else {
          // Caso o backend ainda nao tenha sido atualizado, limpa qualquer
          // refresh antigo para evitar uso indevido.
          await setRefreshToken(null);
        }

        if (mobilePermissions) {
          await AsyncStorage.setItem('@ejr_mobile_permissions', JSON.stringify(mobilePermissions));
        }
        await resetSyncQueueAttempts();
        const storedCompanyName = await AsyncStorage.getItem('@ejr_mobile_company_name');
        set({
          user,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          mobileAccessDenied: false,
          mobileAccessError: null,
          mobilePermissions,
          companyName: storedCompanyName,
        });
        registerForPushNotifications().catch(() => { /* ignore */ });
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
    // Remove Expo Push token ANTES de invalidar a sessao (precisa do JWT).
    try {
      const pushToken = await getStoredPushToken();
      if (pushToken) {
        await unregisterPushToken(pushToken);
      }
      await clearStoredPushToken();
    } catch { /* ignore */ }

    // Avisa o servidor para revogar o refresh.
    try {
      const refresh = await getRefreshToken();
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: refresh ? { refreshToken: refresh } : {},
      });
    } catch { /* ignore */ }

    setAccessToken(null);
    await setRefreshToken(null);
    await SecureStore.deleteItemAsync('auth_token').catch(() => {}); // legacy
    await AsyncStorage.removeItem('@ejr_mobile_permissions');
    await AsyncStorage.removeItem('@ejr_mobile_company_name');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      mobileAccessDenied: false,
      mobileAccessError: null,
      mobilePermissions: null,
      companyName: null,
    });
  },

  loadToken: async () => {
    try {
      await migrateLegacyToken();
      const refresh = await getRefreshToken();

      if (!refresh) {
        // Sem refresh, sem sessao.
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobilePermissions: null, companyName: null });
        return;
      }

      // Tenta /auth/me. Se 401 TOKEN_EXPIRED, o apiRequest vai tentar refresh
      // automaticamente e retentar.
      const result = await apiRequest<User & { mobilePermissions?: MobilePermissions }>('/auth/me', { timeoutMs: 10000 });

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
        set({
          user: result.data,
          token: null, // access fica em memoria via setAccessToken, nao replicamos no store
          isAuthenticated: true,
          isLoading: false,
          mobileAccessDenied: false,
          mobilePermissions,
          companyName: storedCompanyName,
        });
        registerForPushNotifications().catch(() => { /* ignore */ });
        return;
      }

      const errorMsg = result.error?.message;
      const errorCode = result.error?.code;

      if (isMobileAccessError(errorMsg)) {
        await setRefreshToken(null);
        setAccessToken(null);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobileAccessDenied: true, mobileAccessError: errorMsg, mobilePermissions: null, companyName: null });
        return;
      }

      if (isTokenExpiredError(errorMsg, errorCode)) {
        await setRefreshToken(null);
        setAccessToken(null);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobileAccessDenied: false, mobileAccessError: null, mobilePermissions: null, companyName: null });
        return;
      }

      // Erro de rede: permite acesso offline com permissoes cacheadas.
      const storedPerms = await AsyncStorage.getItem('@ejr_mobile_permissions');
      const mobilePermissions = storedPerms ? JSON.parse(storedPerms) : null;
      const storedCompanyNameOffline = await AsyncStorage.getItem('@ejr_mobile_company_name');
      set({
        user: null,
        token: null,
        isAuthenticated: true, // permite uso offline
        isLoading: false,
        mobileAccessDenied: false,
        mobilePermissions,
        companyName: storedCompanyNameOffline,
      });
    } catch {
      // Erros aleatorios — trata como sessao ausente.
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, mobilePermissions: null, companyName: null });
    }
  },

  checkSession: async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return;
      const result = await apiRequest<User & { mobilePermissions?: MobilePermissions }>('/auth/me', { timeoutMs: 10000 });
      if (result.success && result.data) {
        const mobilePermissions = result.data.mobilePermissions || null;
        if (mobilePermissions) {
          await AsyncStorage.setItem('@ejr_mobile_permissions', JSON.stringify(mobilePermissions));
        }
        set({ user: result.data, mobileAccessDenied: false, mobilePermissions: mobilePermissions || get().mobilePermissions });
      } else {
        const errorMsg = result.error?.message;
        if (isMobileAccessError(errorMsg)) {
          await setRefreshToken(null);
          setAccessToken(null);
          set({ user: null, token: null, isAuthenticated: false, mobileAccessDenied: true, mobileAccessError: errorMsg, mobilePermissions: null });
        }
      }
    } catch {
      // silently fail
    }
  },
}));

// Force logout when API reports expired/invalid token AND refresh failed.
setTokenExpiredHandler(() => {
  try {
    setAccessToken(null);
    setRefreshToken(null).catch(() => {});
    SecureStore.deleteItemAsync('auth_token').catch(() => {}); // legacy
    AsyncStorage.removeItem('@ejr_mobile_permissions').catch(() => {});
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      mobileAccessDenied: false,
      mobileAccessError: null,
      mobilePermissions: null,
      companyName: null,
    });
  } catch { /* ignore */ }
});
