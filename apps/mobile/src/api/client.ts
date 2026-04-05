import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from '../utils/constants';

let cachedBaseUrl: string | null = null;

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const stored = await AsyncStorage.getItem('api_url');
  cachedBaseUrl = stored || DEFAULT_API_URL;
  return cachedBaseUrl;
}

export function clearBaseUrlCache() {
  cachedBaseUrl = null;
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
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
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
