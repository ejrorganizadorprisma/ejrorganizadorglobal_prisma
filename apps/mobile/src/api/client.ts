import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from '../utils/constants';

const STORAGE_KEY_URL = '@ejr_api_url';
const STORAGE_KEY_API_KEY = '@ejr_mobile_api_key';

let cachedBaseUrl: string | null = null;
let cachedApiKey: string | null = null;

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
  } = {}
): Promise<{ success: boolean; data?: T; error?: any; total?: number; pagination?: any }> {
  const baseUrl = await getBaseUrl();
  const apiKey = await getApiKey();
  const { method = 'GET', body, token } = options;

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

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || { message: `HTTP ${response.status}` } };
    }

    return json;
  } catch (error: any) {
    return { success: false, error: { message: error.message || 'Network error' } };
  }
}
