import { Response, NextFunction } from 'express';
import { db } from '../config/database';
import { BadRequestError } from '../utils/errors';
import type { AuthRequest } from '../middleware/auth';

const ALLOWED_PLATFORMS = ['ios', 'android', 'web'] as const;
type Platform = (typeof ALLOWED_PLATFORMS)[number];

export class PushTokensController {
  /**
   * POST /api/v1/push-tokens
   * body: { token, platform, deviceName? }
   *
   * Upsert pelo par (user_id, expo_token). Atualiza last_used_at e platform.
   */
  register = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token, platform, deviceName } = req.body || {};

      if (!token || typeof token !== 'string') {
        throw new BadRequestError('token é obrigatório');
      }
      if (!platform || !ALLOWED_PLATFORMS.includes(platform as Platform)) {
        throw new BadRequestError(
          `platform deve ser um de: ${ALLOWED_PLATFORMS.join(', ')}`
        );
      }

      const id = `dpt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const result = await db.query(
        `INSERT INTO device_push_tokens (id, user_id, expo_token, platform, device_name, last_used_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, expo_token) DO UPDATE SET
           platform     = EXCLUDED.platform,
           device_name  = COALESCE(EXCLUDED.device_name, device_push_tokens.device_name),
           updated_at   = NOW(),
           last_used_at = NOW()
         RETURNING id, user_id, expo_token, platform, device_name, created_at, updated_at, last_used_at`,
        [id, userId, token, platform, deviceName || null]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Token registrado',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/push-tokens
   * body: { token }
   *
   * Remove o token do usuário autenticado. Idempotente (retorna sucesso mesmo
   * se o token não existir — útil para chamadas no logout).
   */
  remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body || {};

      if (!token || typeof token !== 'string') {
        throw new BadRequestError('token é obrigatório');
      }

      const result = await db.query(
        `DELETE FROM device_push_tokens WHERE user_id = $1 AND expo_token = $2`,
        [userId, token]
      );

      res.json({
        success: true,
        removed: result.rowCount || 0,
        message: 'Token removido',
      });
    } catch (err) {
      next(err);
    }
  };
}
