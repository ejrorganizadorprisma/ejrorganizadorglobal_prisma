import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_API_URL } from '../utils/constants';

const STORAGE_KEY_URL = '@ejr_api_url';
const STORAGE_KEY_API_KEY = '@ejr_mobile_api_key';
const REQUEST_TIMEOUT_MS = 15000;

const SECURE_REFRESH_KEY = 'refresh_token';

let cachedBaseUrl: string | null = null;
let cachedApiKey: string | null = null;

// In-memory access token (curta duracao, 15 min). Persistimos em SecureStore
// somente o refresh token; access pode ser regerado a partir dele.
let inMemoryAccessToken: string | null = null;

// Global handler invoked when API returns 401 with expired/invalid token
// AND no refresh foi possivel. authStore registra isso para forcar logout.
let onTokenExpired: (() => void) | null = null;
export function setTokenExpiredHandler(fn: () => void) {
  onTokenExpired = fn;
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}
export function getAccessTokenSync(): string | null {
  return inMemoryAccessToken;
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (token === null) {
    try { await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY); } catch { /* ignore */ }
  } else {
    await SecureStore.setItemAsync(SECURE_REFRESH_KEY, token);
  }
}
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_REFRESH_KEY);
  } catch {
    return null;
  }
}

function looksLikeTokenExpired(msg?: string): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return lower.includes('token') && (lower.includes('expirado') || lower.includes('inválido') || lower.includes('invalido'));
}

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const stored = await AsyncStorage.getItem(STORAGE_KEY_URL);
  cachedBaseUrl = stored || DEFAULT_API_URL;
  return cachedBaseUrl;
}

export async function getApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;
  cachedApiKey = await AsyncStorage.getItem(STORAGE_KEY_API_KEY);
  return cachedApiKey;
}

export async function setApiKey(key: string): Promise<void> {
  cachedApiKey = key;
  await AsyncStorage.setItem(STORAGE_KEY_API_KEY, key);
}

export function clearBaseUrlCache() {
  cachedBaseUrl = null;
}

export function clearApiKeyCache() {
  cachedApiKey = null;
}

// --- Refresh logic ---------------------------------------------------------
let isRefreshing = false;
let refreshWaiters: Array<(ok: boolean) => void> = [];

async function performRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise<boolean>((resolve) => refreshWaiters.push(resolve));
  }
  isRefreshing = true;
  try {
    const refresh = await getRefreshToken();
    if (!refresh) {
      refreshWaiters.forEach((cb) => cb(false));
      refreshWaiters = [];
      return false;
    }
    const baseUrl = await getBaseUrl();
    const apiKey = await getApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
      'X-Client-Type': 'mobile',
    };
    if (apiKey) headers['X-Mobile-API-Key'] = apiKey;

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!response.ok) {
      refreshWaiters.forEach((cb) => cb(false));
      refreshWaiters = [];
      return false;
    }

    const json = await response.json();
    const data = json?.data || json;
    if (!data?.accessToken || !data?.refreshToken) {
      refreshWaiters.forEach((cb) => cb(false));
      refreshWaiters = [];
      return false;
    }

    setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    refreshWaiters.forEach((cb) => cb(true));
    refreshWaiters = [];
    return true;
  } catch {
    refreshWaiters.forEach((cb) => cb(false));
    refreshWaiters = [];
    return false;
  } finally {
    isRefreshing = false;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    timeoutMs?: number;
    _retry?: boolean;
  } = {}
): Promise<{ success: boolean; data?: T; error?: any; total?: number; pagination?: any }> {
  const baseUrl = await getBaseUrl();
  const apiKey = await getApiKey();
  const { method = 'GET', body, token, timeoutMs = REQUEST_TIMEOUT_MS, _retry = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
    'X-Client-Type': 'mobile',
  };
  if (apiKey) {
    headers['X-Mobile-API-Key'] = apiKey;
  }
  // Token explicito vence sobre o in-memory (usado em loadToken / chamadas iniciais).
  const effectiveToken = token ?? inMemoryAccessToken;
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok) {
      const errCode = json?.error?.code;
      const errMsg = json?.error?.message || json?.message || `HTTP ${response.status}`;

      // Token expirado: tenta refresh + retry uma unica vez.
      if (
        response.status === 401 &&
        errCode === 'TOKEN_EXPIRED' &&
        !_retry &&
        !endpoint.startsWith('/auth/login') &&
        !endpoint.startsWith('/auth/refresh')
      ) {
        const ok = await performRefresh();
        if (ok) {
          return apiRequest<T>(endpoint, { ...options, _retry: true });
        }
        // Refresh falhou — caia no logout handler.
        if (onTokenExpired) {
          try { onTokenExpired(); } catch { /* ignore */ }
        }
        return { success: false, error: { code: errCode, message: errMsg } };
      }

      // Auto-logout em outros 401 com mensagem token-related (legado).
      if (response.status === 401 && looksLikeTokenExpired(errMsg) && onTokenExpired) {
        try { onTokenExpired(); } catch { /* ignore */ }
      }
      return { success: false, error: json?.error || { message: errMsg } };
    }

    return json;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const message = error.name === 'AbortError'
      ? 'Tempo limite excedido'
      : (error.message || 'Erro de rede');
    return { success: false, error: { message } };
  }
}
