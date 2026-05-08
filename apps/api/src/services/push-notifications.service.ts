import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
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

/**
 * Serviço de push notifications usando Expo Push API.
 *
 * Singleton: uma instância de Expo (que faz fetch no servidor da Expo) por processo.
 * Tokens inválidos (DeviceNotRegistered) são removidos automaticamente do banco.
 *
 * Todos os disparos são "fire-and-forget" — chame com .catch(err => console.error(...))
 * para não bloquear o fluxo principal se o push falhar (rede / SDK / DB).
 */
export class PushNotificationsService {
  private expo: Expo;
  private static _instance: PushNotificationsService | null = null;

  private constructor() {
    // accessToken é opcional (público). Pode-se passar process.env.EXPO_ACCESS_TOKEN se houver.
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
    });
  }

  static instance(): PushNotificationsService {
    if (!this._instance) {
      this._instance = new PushNotificationsService();
    }
    return this._instance;
  }

  /**
   * Disparar push para todos os dispositivos de um usuário.
   * Idempotente em caso de erro: loga e continua.
   */
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

  /**
   * Disparar push para todos os usuários ativos com um dos roles informados.
   */
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

  /**
   * Núcleo do envio: filtra tokens válidos, monta mensagens, envia em chunks
   * e remove tokens inválidos do banco com base nos tickets retornados.
   */
  private async dispatch(rows: TokenRow[], payload: PushPayload): Promise<void> {
    const messages: ExpoPushMessage[] = [];
    const messageToTokenRow: TokenRow[] = [];

    for (const row of rows) {
      if (!Expo.isExpoPushToken(row.expo_token)) {
        // Token mal formado — remove
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

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    let chunkOffset = 0;
    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // Remove tokens cuja ticket veio com error (DeviceNotRegistered etc)
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
