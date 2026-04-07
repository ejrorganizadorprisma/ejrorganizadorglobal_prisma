import { db } from '../config/database';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

let ensurePromise: Promise<void> | null = null;

/**
 * Apply schema migrations idempotently. Safe to call on every request —
 * uses a process-level promise so the work happens once per cold start.
 *
 * Migrations live in `src/migrations/*.sql` and must be written so they can
 * be re-run without errors (use IF NOT EXISTS, etc).
 *
 * A `_schema_migrations` table tracks which files have been applied.
 */
export async function ensureSchema(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS _schema_migrations (
          filename TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Try multiple paths because in Vercel build the layout differs
      const candidatePaths = [
        join(process.cwd(), 'apps/api/src/migrations'),
        join(process.cwd(), 'src/migrations'),
        join(__dirname, '../migrations'),
      ];

      let migrationsDir: string | null = null;
      for (const p of candidatePaths) {
        try {
          readdirSync(p);
          migrationsDir = p;
          break;
        } catch {
          /* try next */
        }
      }

      if (!migrationsDir) {
        console.warn('[ensureSchema] migrations directory not found');
        return;
      }

      const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const applied = await db.query(
          'SELECT 1 FROM _schema_migrations WHERE filename = $1 LIMIT 1',
          [file]
        );
        if (applied.rowCount && applied.rowCount > 0) continue;

        const sql = readFileSync(join(migrationsDir, file), 'utf-8');
        try {
          await db.query(sql);
          await db.query(
            'INSERT INTO _schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
            [file]
          );
          console.log(`[ensureSchema] applied ${file}`);
        } catch (err: any) {
          // Tolerate "already exists" since older deployments may have applied
          // pieces manually. Mark as applied so we stop retrying.
          if (err.message?.includes('already exists')) {
            await db.query(
              'INSERT INTO _schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
              [file]
            );
            console.warn(`[ensureSchema] ${file} partially exists, marked as applied`);
          } else {
            console.error(`[ensureSchema] ${file} failed:`, err.message);
            // Reset promise so the next cold start retries
            ensurePromise = null;
            throw err;
          }
        }
      }
    } catch (err) {
      // Reset so future calls can retry
      ensurePromise = null;
      throw err;
    }
  })();
  return ensurePromise;
}
