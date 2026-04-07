import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from '../utils/constants';

const STORAGE_KEY_URL = '@ejr_api_url';
const STORAGE_KEY_API_KEY = '@ejr_mobile_api_key';
const REQUEST_TIMEOUT_MS = 15000;

let cachedBaseUrl: string | null = null;
let cachedApiKey: string | null = null;

// Global handler invoked when API returns 401 with expired/invalid token.
// authStore registers itself here to force logout when this happens.
let onTokenExpired: (() => void) | null = null;
export function setTokenExpiredHandler(fn: () => void) {
  onTokenExpired = fn;
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

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    timeoutMs?: number;
  } = {}
): Promise<{ success: boolean; data?: T; error?: any; total?: number; pagination?: any }> {
  const baseUrl = await getBaseUrl();
  const apiKey = await getApiKey();
  const { method = 'GET', body, token, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
  };
  if (apiKey) {
    headers['X-Mobile-API-Key'] = apiKey;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
      const errMsg = json?.error?.message || json?.message || `HTTP ${response.status}`;
      // Auto-logout on expired/invalid JWT (401 + token-related message)
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
