import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../config/database';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

const router = Router();

// Public: check if mobile app is enabled and key is valid (for app pre-login check)
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const result = await db.query(
      'SELECT mobile_app_enabled, mobile_app_api_key FROM system_settings LIMIT 1'
    );
    const settings = result.rows[0];

    if (!settings || !settings.mobile_app_enabled) {
      return res.json({ enabled: false, valid: false, message: 'Aplicativo desabilitado pelo administrador' });
    }

    const valid = !!(apiKey && apiKey === settings.mobile_app_api_key);
    res.json({
      enabled: true,
      valid,
      message: valid ? 'Conexão autorizada' : 'Chave de conexão inválida',
    });
  } catch {
    res.status(500).json({ error: 'Erro ao verificar acesso' });
  }
});

// Protected routes below
router.use(authenticate);

// Get mobile app settings (for admin page)
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT mobile_app_enabled, mobile_app_api_key FROM system_settings LIMIT 1'
    );
    const settings = result.rows[0];

    const externalUrl = process.env.MOBILE_APP_DOWNLOAD_URL;
    const localPath = path.join(process.cwd(), 'uploads', 'mobile', 'ejr-vendedor.apk');
    const localExists = fs.existsSync(localPath);
    let fileSize: number | null = null;
    if (localExists) {
      fileSize = fs.statSync(localPath).size;
    }

    res.json({
      data: {
        enabled: settings?.mobile_app_enabled ?? false,
        apiKey: settings?.mobile_app_api_key ?? null,
        appVersion: '1.0.0',
        appName: 'EJR Vendedor',
        platform: 'Android',
        package: 'com.ejr.vendedor',
        fileSize: fileSize || 74_000_000,
        downloadAvailable: !!(externalUrl || localExists),
        downloadUrl: externalUrl || (localExists ? '/api/v1/mobile-app/download' : null),
      },
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Update mobile app settings
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const { enabled, regenerateKey } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (enabled !== undefined) {
      updates.push(`mobile_app_enabled = $${idx}`);
      values.push(enabled);
      idx++;

      // Auto-generate key when enabling for the first time
      if (enabled) {
        const existing = await db.query(
          'SELECT mobile_app_api_key FROM system_settings LIMIT 1'
        );
        if (!existing.rows[0]?.mobile_app_api_key) {
          updates.push(`mobile_app_api_key = $${idx}`);
          values.push(randomUUID());
          idx++;
        }
      }
    }

    if (regenerateKey) {
      updates.push(`mobile_app_api_key = $${idx}`);
      values.push(randomUUID());
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhuma alteração fornecida' });
    }

    updates.push('updated_at = NOW()');

    await db.query(
      `UPDATE system_settings SET ${updates.join(', ')} WHERE id = (SELECT id FROM system_settings LIMIT 1)`,
      values
    );

    // Return updated settings
    const result = await db.query(
      'SELECT mobile_app_enabled, mobile_app_api_key FROM system_settings LIMIT 1'
    );
    const settings = result.rows[0];

    res.json({
      data: {
        enabled: settings.mobile_app_enabled,
        apiKey: settings.mobile_app_api_key,
      },
    });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Download APK
router.get('/download', (_req: Request, res: Response) => {
  const externalUrl = process.env.MOBILE_APP_DOWNLOAD_URL;

  if (externalUrl) {
    return res.redirect(externalUrl);
  }

  const localPath = path.join(process.cwd(), 'uploads', 'mobile', 'ejr-vendedor.apk');
  if (fs.existsSync(localPath)) {
    return res.download(localPath, 'ejr-vendedor.apk');
  }

  res.status(404).json({ error: 'APK não disponível' });
});

export default router;
