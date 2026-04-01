import { Request, Response, NextFunction } from 'express';
import { backupScheduler } from '../services/backup-scheduler.service';
import { logger } from '../config/logger';

export class BackupController {
  // POST /api/v1/backup/execute - Execute a manual backup (saves to server)
  async executeBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const entry = await backupScheduler.executeBackup('manual', userId);
      res.json({ success: true, data: entry });
    } catch (error: any) {
      logger.error('Backup execution error:', error);
      next(error);
    }
  }

  // GET /api/v1/backup/history - Get backup history
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await backupScheduler.getHistory(limit, offset);
      res.json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/v1/backup/download/:filename - Download a specific backup file
  async downloadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;

      // Prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ success: false, error: { message: 'Filename invalid' } });
      }

      const filePath = backupScheduler.getBackupFilePath(filename);
      if (!filePath) {
        return res.status(404).json({ success: false, error: { message: 'Backup file not found' } });
      }

      res.download(filePath, filename);
    } catch (error: any) {
      next(error);
    }
  }

  // DELETE /api/v1/backup/:id - Delete a backup
  async deleteBackup(req: Request, res: Response, next: NextFunction) {
    try {
      await backupScheduler.deleteBackup(req.params.id);
      res.json({ success: true, message: 'Backup deleted' });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/v1/backup/settings - Get schedule settings
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await backupScheduler.getSettings();
      res.json({ success: true, data: settings });
    } catch (error: any) {
      next(error);
    }
  }

  // PATCH /api/v1/backup/settings - Update schedule settings
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await backupScheduler.updateSettings(req.body);
      res.json({ success: true, data: settings });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/v1/backup/info - Database info (keep for compatibility)
  async getBackupInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { db } = await import('../config/database');

      const tables = [
        'users', 'products', 'customers', 'suppliers', 'quotes',
        'production_orders', 'sales', 'sale_items', 'sale_payments',
        'services', 'service_orders', 'purchase_budgets', 'supplier_orders',
        'production_batches', 'backup_history',
      ];

      const tableCounts: Record<string, number> = {};

      for (const table of tables) {
        try {
          const { rows } = await db.query(`SELECT COUNT(*) as count FROM "${table}"`);
          tableCounts[table] = parseInt(rows[0].count);
        } catch {
          // Table may not exist, skip
        }
      }

      res.json({
        success: true,
        data: {
          tables: tableCounts,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // POST /api/v1/backup/restore - Restore from uploaded SQL (keep for compatibility)
  async restoreBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { sql } = req.body;

      if (!sql) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'SQL backup not provided' },
        });
      }

      const { Client } = await import('pg');
      const { env: envConfig } = await import('../config/env');
      const client = new Client({ connectionString: envConfig.DATABASE_URL });
      await client.connect();

      const lines = sql.split('\n');
      const commands: string[] = [];
      let currentCommand = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('--') || trimmedLine.length === 0) continue;
        currentCommand += ' ' + line;
        if (trimmedLine.endsWith(';')) {
          commands.push(currentCommand.trim());
          currentCommand = '';
        }
      }
      if (currentCommand.trim()) commands.push(currentCommand.trim());

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < commands.length; i++) {
        try {
          await client.query(commands[i]);
          successCount++;
        } catch (cmdError: any) {
          errorCount++;
          errors.push(`Cmd ${i + 1}: ${cmdError.message}`);
        }
      }

      await client.end();

      if (errorCount > 0 && successCount === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'RESTORE_FAILED', message: `Restore failed. ${errorCount} errors.`, details: errors.slice(0, 10) },
        });
      }

      res.json({
        success: true,
        message: `Backup restored. ${successCount} commands${errorCount > 0 ? `, ${errorCount} errors (skipped)` : ''}.`,
        stats: { total: commands.length, success: successCount, errors: errorCount },
      });
    } catch (error: any) {
      next(error);
    }
  }
}
