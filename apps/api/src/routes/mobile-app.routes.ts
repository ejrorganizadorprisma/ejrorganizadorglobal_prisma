import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

const router = Router();

// Default GitHub release URL (used when MOBILE_APP_DOWNLOAD_URL env var is not set)
const DEFAULT_APK_URL = 'https://github.com/ejrorganizadorprisma/ejrorganizadorglobal_prisma/releases/download/v1.4.1/EJR-OrGlobal-v1.4.1.apk';
const DEFAULT_APK_VERSION = '1.4.1';
const DEFAULT_APK_SIZE = 74_701_571;

// PUBLIC: validate seller's token before login
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    // Check global toggle
    const settings = await db.query('SELECT mobile_app_enabled FROM system_settings LIMIT 1');
    if (!settings.rows[0]?.mobile_app_enabled) {
      return res.json({ enabled: false, valid: false, message: 'Aplicativo desabilitado pelo administrador' });
    }
    // Check seller token
    const user = await db.query(
      'SELECT id, mobile_app_authorized FROM users WHERE mobile_app_token = $1 LIMIT 1',
      [apiKey]
    );
    if (!user.rows[0]) {
      return res.json({ enabled: true, valid: false, message: 'Chave de conexão inválida' });
    }
    if (!user.rows[0].mobile_app_authorized) {
      return res.json({ enabled: true, valid: false, message: 'Vendedor não autorizado para o aplicativo' });
    }
    res.json({ enabled: true, valid: true, message: 'Conexão autorizada' });
  } catch {
    res.status(500).json({ error: 'Erro ao verificar acesso' });
  }
});

// PUBLIC: download APK (opened via window.open, no auth header)
router.get('/download', (_req: Request, res: Response) => {
  const externalUrl = process.env.MOBILE_APP_DOWNLOAD_URL || DEFAULT_APK_URL;
  if (externalUrl) return res.redirect(externalUrl);
  const localPath = path.join(process.cwd(), 'uploads', 'mobile', 'ejr-orglobal.apk');
  if (fs.existsSync(localPath)) return res.download(localPath, 'ejr-orglobal.apk');
  res.status(404).json({ error: 'APK não disponível' });
});

// Protected routes
router.use(authenticate);

// GET /settings - returns global status + sellers list with mobile info + download info
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settingsResult = await db.query('SELECT mobile_app_enabled FROM system_settings LIMIT 1');
    const globalEnabled = settingsResult.rows[0]?.mobile_app_enabled ?? false;

    // Get all SALESPERSON users with their mobile status
    const sellersResult = await db.query(`
      SELECT id, name, email, is_active,
        mobile_app_authorized, mobile_app_token, mobile_app_permissions,
        mobile_app_last_login, mobile_app_last_sync
      FROM users WHERE role = 'SALESPERSON' ORDER BY name
    `);

    // Stats
    const sellers = sellersResult.rows;
    const authorizedCount = sellers.filter(s => s.mobile_app_authorized).length;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeToday = sellers.filter(s => s.mobile_app_last_login && new Date(s.mobile_app_last_login) > oneDayAgo).length;

    // Download info
    const externalUrl = process.env.MOBILE_APP_DOWNLOAD_URL || DEFAULT_APK_URL;
    const localPath = path.join(process.cwd(), 'uploads', 'mobile', 'ejr-orglobal.apk');
    const localExists = fs.existsSync(localPath);
    let fileSize: number | null = null;
    if (localExists) fileSize = fs.statSync(localPath).size;

    res.json({
      data: {
        globalEnabled,
        sellers: sellers.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          isActive: s.is_active,
          authorized: s.mobile_app_authorized,
          token: s.mobile_app_token,
          permissions: s.mobile_app_permissions || { customers: true, quotes: true, sales: true, products: true, collections: true },
          lastLogin: s.mobile_app_last_login,
          lastSync: s.mobile_app_last_sync,
        })),
        stats: { authorizedCount, activeToday, totalSellers: sellers.length },
        download: {
          appVersion: DEFAULT_APK_VERSION,
          appName: 'EJR OrGlobal',
          platform: 'Android',
          fileSize: fileSize || DEFAULT_APK_SIZE,
          available: !!(externalUrl || localExists),
          url: externalUrl || (localExists ? '/mobile-app/download' : null),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PATCH /settings - toggle global enable
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    if (enabled !== undefined) {
      await db.query('UPDATE system_settings SET mobile_app_enabled = $1, updated_at = NOW() WHERE id = (SELECT id FROM system_settings LIMIT 1)', [enabled]);
    }
    const result = await db.query('SELECT mobile_app_enabled FROM system_settings LIMIT 1');
    res.json({ data: { enabled: result.rows[0].mobile_app_enabled } });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// PATCH /sellers/:id/authorize - authorize/deauthorize a seller
router.patch('/sellers/:id/authorize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { authorized } = req.body;

    if (authorized) {
      // Generate token if not exists
      const existing = await db.query('SELECT mobile_app_token FROM users WHERE id = $1', [id]);
      const token = existing.rows[0]?.mobile_app_token || randomUUID();
      await db.query(
        'UPDATE users SET mobile_app_authorized = true, mobile_app_token = $1 WHERE id = $2',
        [token, id]
      );
      const result = await db.query('SELECT mobile_app_authorized, mobile_app_token FROM users WHERE id = $1', [id]);
      res.json({ data: { authorized: true, token: result.rows[0].mobile_app_token } });
    } else {
      await db.query('UPDATE users SET mobile_app_authorized = false WHERE id = $1', [id]);
      res.json({ data: { authorized: false, token: null } });
    }
  } catch {
    res.status(500).json({ error: 'Erro ao autorizar vendedor' });
  }
});

// PATCH /sellers/:id/permissions - set seller permissions
router.patch('/sellers/:id/permissions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissions = req.body; // { customers, quotes, sales, products }
    await db.query('UPDATE users SET mobile_app_permissions = $1 WHERE id = $2', [JSON.stringify(permissions), id]);
    res.json({ data: { permissions } });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar permissões' });
  }
});

// POST /sellers/:id/regenerate-token
router.post('/sellers/:id/regenerate-token', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newToken = randomUUID();
    await db.query('UPDATE users SET mobile_app_token = $1 WHERE id = $2', [newToken, id]);
    res.json({ data: { token: newToken } });
  } catch {
    res.status(500).json({ error: 'Erro ao gerar novo token' });
  }
});

// POST /sync-done - called by mobile app after sync completes
router.post('/sync-done', async (req: AuthRequest, res: Response) => {
  try {
    await db.query('UPDATE users SET mobile_app_last_sync = NOW() WHERE id = $1', [req.user!.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao registrar sync' });
  }
});

export default router;
