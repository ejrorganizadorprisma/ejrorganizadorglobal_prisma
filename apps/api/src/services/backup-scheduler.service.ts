import cron from 'node-cron';
import { Client } from 'pg';
import { env } from '../config/env';
import { db } from '../config/database';
import { logger } from '../config/logger';
import fs from 'fs';
import path from 'path';

export interface BackupSettings {
  id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM
  dayOfWeek: number; // 0-6
  dayOfMonth: number; // 1-28
  retentionDays: number;
  maxBackups: number;
  lastBackupAt: Date | null;
  nextBackupAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupHistoryEntry {
  id: string;
  filename: string;
  filePath: string | null;
  fileSize: number;
  tablesCount: number;
  recordsCount: number;
  backupType: 'manual' | 'scheduled';
  status: 'completed' | 'failed' | 'in_progress';
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: Date;
}

const BACKUPS_DIR = process.env.VERCEL
  ? path.join('/tmp', 'backups')
  : path.join(process.cwd(), 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

class BackupSchedulerService {
  private cronJob: cron.ScheduledTask | null = null;

  async init() {
    const settings = await this.getSettings();
    if (settings.enabled) {
      this.scheduleCron(settings);
      logger.info(`Backup scheduler initialized: ${settings.frequency} at ${settings.time}`);
    } else {
      logger.info('Backup scheduler is disabled');
    }
  }

  async getSettings(): Promise<BackupSettings> {
    const result = await db.query('SELECT * FROM backup_settings LIMIT 1');
    if (result.rows.length === 0) {
      // Create default settings
      const insertResult = await db.query(
        `INSERT INTO backup_settings (enabled, frequency, time, retention_days, max_backups)
         VALUES (false, 'daily', '02:00', 30, 10) RETURNING *`
      );
      return this.mapSettings(insertResult.rows[0]);
    }
    return this.mapSettings(result.rows[0]);
  }

  async updateSettings(data: Partial<BackupSettings>): Promise<BackupSettings> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.enabled !== undefined) {
      fields.push(`enabled = $${idx++}`);
      values.push(data.enabled);
    }
    if (data.frequency !== undefined) {
      fields.push(`frequency = $${idx++}`);
      values.push(data.frequency);
    }
    if (data.time !== undefined) {
      fields.push(`time = $${idx++}`);
      values.push(data.time);
    }
    if (data.dayOfWeek !== undefined) {
      fields.push(`day_of_week = $${idx++}`);
      values.push(data.dayOfWeek);
    }
    if (data.dayOfMonth !== undefined) {
      fields.push(`day_of_month = $${idx++}`);
      values.push(data.dayOfMonth);
    }
    if (data.retentionDays !== undefined) {
      fields.push(`retention_days = $${idx++}`);
      values.push(data.retentionDays);
    }
    if (data.maxBackups !== undefined) {
      fields.push(`max_backups = $${idx++}`);
      values.push(data.maxBackups);
    }

    fields.push('updated_at = NOW()');

    const settings = await this.getSettings();
    values.push(settings.id);

    const result = await db.query(
      `UPDATE backup_settings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const updated = this.mapSettings(result.rows[0]);

    // Reschedule cron
    this.stopCron();
    if (updated.enabled) {
      this.scheduleCron(updated);
    }
    // Compute next backup time
    await this.updateNextBackupAt(updated);

    // Re-fetch to get updated nextBackupAt
    return this.getSettings();
  }

  private async updateNextBackupAt(settings: BackupSettings) {
    if (!settings.enabled) {
      await db.query('UPDATE backup_settings SET next_backup_at = NULL WHERE id = $1', [settings.id]);
      return;
    }

    const next = this.computeNextBackup(settings);
    await db.query('UPDATE backup_settings SET next_backup_at = $1 WHERE id = $2', [next, settings.id]);
  }

  private computeNextBackup(settings: BackupSettings): Date {
    const [hours, minutes] = settings.time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (settings.frequency === 'daily') {
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (settings.frequency === 'weekly') {
      const currentDay = next.getDay();
      let daysUntil = settings.dayOfWeek - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
    } else if (settings.frequency === 'monthly') {
      next.setDate(settings.dayOfMonth);
      if (next <= now) next.setMonth(next.getMonth() + 1);
    }

    return next;
  }

  private buildCronExpression(settings: BackupSettings): string {
    const [hours, minutes] = settings.time.split(':').map(Number);

    switch (settings.frequency) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * ${settings.dayOfWeek}`;
      case 'monthly':
        return `${minutes} ${hours} ${settings.dayOfMonth} * *`;
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  private scheduleCron(settings: BackupSettings) {
    const expression = this.buildCronExpression(settings);
    logger.info(`Scheduling backup cron: ${expression}`);

    this.cronJob = cron.schedule(expression, async () => {
      logger.info('Executing scheduled backup...');
      try {
        await this.executeBackup('scheduled');
        logger.info('Scheduled backup completed successfully');
      } catch (error: any) {
        logger.error('Scheduled backup failed:', error.message);
      }
    });
  }

  private stopCron() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  async executeBackup(type: 'manual' | 'scheduled', userId?: string): Promise<BackupHistoryEntry> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(BACKUPS_DIR, filename);

    // Create in_progress record
    const historyResult = await db.query(
      `INSERT INTO backup_history (filename, file_path, backup_type, status, created_by)
       VALUES ($1, $2, $3, 'in_progress', $4) RETURNING *`,
      [filename, filePath, type, userId || null]
    );
    const historyId = historyResult.rows[0].id;

    const client = new Client({ connectionString: env.DATABASE_URL });

    try {
      await client.connect();

      // Get all tables in public schema dynamically
      const { rows: tableRows } = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`
      );
      const allTables = tableRows.map((r: any) => r.table_name);

      let sqlDump = `-- EJR Organizador - Database Backup\n`;
      sqlDump += `-- Date: ${new Date().toISOString()}\n`;
      sqlDump += `-- Type: ${type}\n\n`;

      let totalRecords = 0;
      let tablesCount = 0;

      for (const table of allTables) {
        // Get column info
        const { rows: columnInfo } = await client.query(
          `SELECT column_name, data_type, udt_name, is_generated
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        );

        const columnTypes = columnInfo.reduce((acc: any, col: any) => {
          acc[col.column_name] = {
            data_type: col.data_type,
            udt_name: col.udt_name,
            is_generated: col.is_generated,
          };
          return acc;
        }, {} as Record<string, any>);

        const { rows } = await client.query(`SELECT * FROM "${table}"`);

        if (rows.length === 0) continue;

        tablesCount++;
        totalRecords += rows.length;
        sqlDump += `\n-- Table: ${table} (${rows.length} records)\n`;

        for (const row of rows) {
          const columns = Object.keys(row).filter((col) => {
            const colType = columnTypes[col];
            return !colType || colType.is_generated === 'NEVER';
          });

          const values = columns.map((col) => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'object') {
              const colType = columnTypes[col];
              if (colType && colType.data_type === 'ARRAY') {
                if (Array.isArray(val)) {
                  if (val.length === 0) return `'{}'::${colType.udt_name}`;
                  const arrayValues = val
                    .map((v: any) => {
                      if (v === null) return 'NULL';
                      if (typeof v === 'string') return `"${v.replace(/"/g, '\\"').replace(/'/g, "''")}"`;
                      return String(v);
                    })
                    .join(',');
                  return `'{${arrayValues}}'::${colType.udt_name}`;
                }
              }
              const jsonStr = JSON.stringify(val).replace(/'/g, "''");
              return `'${jsonStr}'::jsonb`;
            }
            if (typeof val === 'number') return val.toString();
            return val;
          });

          sqlDump += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
        }
      }

      // Write to file
      fs.writeFileSync(filePath, sqlDump, 'utf-8');
      const fileSize = fs.statSync(filePath).size;

      // Update history record
      await db.query(
        `UPDATE backup_history
         SET status = 'completed', file_size = $1, tables_count = $2, records_count = $3
         WHERE id = $4`,
        [fileSize, tablesCount, totalRecords, historyId]
      );

      // Update last_backup_at
      await db.query('UPDATE backup_settings SET last_backup_at = NOW()');

      // Update next_backup_at
      const settings = await this.getSettings();
      if (settings.enabled) {
        await this.updateNextBackupAt(settings);
      }

      // Apply retention policy
      await this.applyRetention();

      const entry = await this.getHistoryEntry(historyId);
      return entry!;
    } catch (error: any) {
      logger.error('Backup execution error:', error);

      // Update history with error
      await db.query(
        `UPDATE backup_history SET status = 'failed', error_message = $1 WHERE id = $2`,
        [error.message, historyId]
      );

      // Clean up partial file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const entry = await this.getHistoryEntry(historyId);
      return entry!;
    } finally {
      await client.end();
    }
  }

  private async applyRetention() {
    const settings = await this.getSettings();

    // Delete backups older than retention days
    if (settings.retentionDays > 0) {
      const oldBackups = await db.query(
        `SELECT * FROM backup_history
         WHERE created_at < NOW() - INTERVAL '1 day' * $1
         AND status = 'completed'
         ORDER BY created_at ASC`,
        [settings.retentionDays]
      );

      for (const backup of oldBackups.rows) {
        await this.deleteBackupFile(backup);
      }
    }

    // Keep only max_backups
    if (settings.maxBackups > 0) {
      const excessBackups = await db.query(
        `SELECT * FROM backup_history
         WHERE status = 'completed'
         ORDER BY created_at DESC
         OFFSET $1`,
        [settings.maxBackups]
      );

      for (const backup of excessBackups.rows) {
        await this.deleteBackupFile(backup);
      }
    }
  }

  private async deleteBackupFile(backupRow: any) {
    if (backupRow.file_path && fs.existsSync(backupRow.file_path)) {
      fs.unlinkSync(backupRow.file_path);
    }
    await db.query('DELETE FROM backup_history WHERE id = $1', [backupRow.id]);
  }

  async getHistory(limit = 20, offset = 0): Promise<{ entries: BackupHistoryEntry[]; total: number }> {
    const countResult = await db.query('SELECT COUNT(*) FROM backup_history');
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT bh.*, u.name as user_name
       FROM backup_history bh
       LEFT JOIN users u ON u.id = bh.created_by
       ORDER BY bh.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      entries: result.rows.map(this.mapHistoryEntry),
      total,
    };
  }

  private async getHistoryEntry(id: string): Promise<BackupHistoryEntry | null> {
    const result = await db.query('SELECT * FROM backup_history WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapHistoryEntry(result.rows[0]);
  }

  async deleteBackup(id: string): Promise<void> {
    const result = await db.query('SELECT * FROM backup_history WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new Error('Backup not found');
    await this.deleteBackupFile(result.rows[0]);
  }

  getBackupFilePath(filename: string): string | null {
    const filePath = path.join(BACKUPS_DIR, filename);
    if (fs.existsSync(filePath)) return filePath;
    return null;
  }

  private mapSettings(row: any): BackupSettings {
    return {
      id: row.id,
      enabled: row.enabled,
      frequency: row.frequency,
      time: row.time,
      dayOfWeek: row.day_of_week,
      dayOfMonth: row.day_of_month,
      retentionDays: row.retention_days,
      maxBackups: row.max_backups,
      lastBackupAt: row.last_backup_at ? new Date(row.last_backup_at) : null,
      nextBackupAt: row.next_backup_at ? new Date(row.next_backup_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapHistoryEntry(row: any): BackupHistoryEntry {
    return {
      id: row.id,
      filename: row.filename,
      filePath: row.file_path,
      fileSize: parseInt(row.file_size) || 0,
      tablesCount: row.tables_count,
      recordsCount: row.records_count,
      backupType: row.backup_type,
      status: row.status,
      errorMessage: row.error_message,
      createdBy: row.user_name || row.created_by,
      createdAt: new Date(row.created_at),
    };
  }
}

export const backupScheduler = new BackupSchedulerService();
