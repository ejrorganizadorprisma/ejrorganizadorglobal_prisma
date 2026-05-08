import { db } from '../config/database';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface TokenRow {
  id: string;
  expo_token: string;
}

// Lazy reference para o módulo expo-server-sdk. Carregado dinamicamente na
// primeira chamada de push para evitar que `createRequire` (usado pela lib)
// rode no boot do bundle CJS do Vercel — onde import.meta.url fica undefined
// e quebra o servidor inteiro com ERR_INVALID_ARG_VALUE.
let expoModulePromise: Promise<any> | null = null;
async function loadExpo(): Promise<any> {
  if (!expoModulePromise) {
    expoModulePromise = import('expo-server-sdk').catch((err) => {
      console.error('[push] expo-server-sdk indisponível:', err);
      expoModulePromise = null;
      throw err;
    });
  }
  return expoModulePromise;
}

/**
 * Serviço de push notifications usando Expo Push API.
 *
 * Singleton. Tokens inválidos (DeviceNotRegistered) são removidos do banco.
 *
 * Todos os disparos são "fire-and-forget" — chame com .catch(err => console.error(...))
 * para não bloquear o fluxo principal se o push falhar (rede / SDK / DB).
 */
export class PushNotificationsService {
  private expo: any | null = null;
  private static _instance: PushNotificationsService | null = null;

  private constructor() {}

  static instance(): PushNotificationsService {
    if (!this._instance) {
      this._instance = new PushNotificationsService();
    }
    return this._instance;
  }

  private async getExpo(): Promise<any> {
    if (!this.expo) {
      const mod = await loadExpo();
      const ExpoCtor = mod.Expo || mod.default?.Expo || mod.default;
      this.expo = new ExpoCtor({
        accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
      });
    }
    return this.expo;
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const result = await db.query<TokenRow>(
        `SELECT id, expo_token FROM device_push_tokens WHERE user_id = $1`,
        [userId]
      );
      if (result.rowCount === 0) return;
      await this.dispatch(result.rows, payload);
    } catch (err) {
      console.error('[push] sendToUser falhou:', err);
    }
  }

  async sendToRoles(roles: string[], payload: PushPayload): Promise<void> {
    if (!roles || roles.length === 0) return;
    try {
      const result = await db.query<TokenRow>(
        `SELECT dpt.id, dpt.expo_token
           FROM device_push_tokens dpt
           JOIN users u ON u.id = dpt.user_id
          WHERE u.role = ANY($1::text[])
            AND u.is_active = true`,
        [roles]
      );
      if (result.rowCount === 0) return;
      await this.dispatch(result.rows, payload);
    } catch (err) {
      console.error('[push] sendToRoles falhou:', err);
    }
  }

  private async dispatch(rows: TokenRow[], payload: PushPayload): Promise<void> {
    let mod: any;
    let expo: any;
    try {
      mod = await loadExpo();
      expo = await this.getExpo();
    } catch {
      return;
    }
    const ExpoCtor = mod.Expo || mod.default?.Expo || mod.default;

    const messages: any[] = [];
    const messageToTokenRow: TokenRow[] = [];

    for (const row of rows) {
      if (!ExpoCtor.isExpoPushToken(row.expo_token)) {
        await this.deleteTokenById(row.id).catch(() => undefined);
        continue;
      }
      messages.push({
        to: row.expo_token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      });
      messageToTokenRow.push(row);
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);

    let chunkOffset = 0;
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const associatedRow = messageToTokenRow[chunkOffset + i];
          if (ticket.status === 'error') {
            const code = (ticket.details as any)?.error;
            if (code === 'DeviceNotRegistered') {
              await this.deleteTokenById(associatedRow.id).catch(() => undefined);
            } else {
              console.warn('[push] ticket error:', ticket.message, code);
            }
          }
        }
      } catch (err) {
        console.error('[push] erro ao enviar chunk:', err);
      }
      chunkOffset += chunk.length;
    }
  }

  private async deleteTokenById(id: string): Promise<void> {
    await db.query(`DELETE FROM device_push_tokens WHERE id = $1`, [id]);
  }
}
