import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_TOKEN = '@ejr_expo_push_token';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

function getProjectId(): string | undefined {
  // Prefer EAS projectId quando disponivel; em dev local pode estar ausente
  // — Notifications.getExpoPushTokenAsync ainda funciona sem projectId em SDK
  // 52, embora gere warning. Mantemos undefined nesse caso.
  const easId =
    (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId;
  return easId;
}

/**
 * Solicita permissao de notificacao, obtem o Expo Push Token e registra no
 * backend. Retorna o token em caso de sucesso, ou null caso contrario.
 *
 * Falhas sao tratadas silenciosamente: o app continua funcionando sem push.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      // Emulador/simulador nao recebe push
      return null;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Padrao',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch { /* ignore */ }
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') {
      return null;
    }

    const projectId = getProjectId();
    let tokenResult: { data: string };
    try {
      tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
    } catch (err) {
      console.warn('[push] nao foi possivel obter Expo Push Token', err);
      return null;
    }

    const token = tokenResult.data;
    if (!token) return null;

    const authToken = await getToken();
    if (!authToken) {
      // Sem sessao ainda; salvamos para registrar depois.
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
      return token;
    }

    const result = await apiRequest('/push-tokens', {
      method: 'POST',
      token: authToken,
      body: {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: Device.modelName || undefined,
      },
    });

    if (result.success) {
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      console.warn('[push] backend rejeitou registro do token', result.error);
    }

    return token;
  } catch (err) {
    console.warn('[push] erro ao registrar para push notifications', err);
    return null;
  }
}

/**
 * Remove o token Expo Push do backend. Chamado no logout.
 */
export async function unregisterPushToken(token: string | null): Promise<void> {
  if (!token) return;
  try {
    const authToken = await getToken();
    if (!authToken) return;
    await apiRequest('/push-tokens', {
      method: 'DELETE',
      token: authToken,
      body: { token },
    });
  } catch {
    // ignore network errors no logout
  }
}

/**
 * Le o ultimo token salvo localmente (usado para chamar unregister no logout).
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Limpa o token armazenado localmente.
 */
export async function clearStoredPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
  } catch {
    /* ignore */
  }
}
