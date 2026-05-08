import * as SQLite from 'expo-sqlite';
import { DB_NAME, CREATE_TABLES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    for (const sql of CREATE_TABLES_SQL) {
      await db.execAsync(sql);
    }
    // Migracoes idempotentes para bancos antigos: adiciona colunas que
    // foram introduzidas depois do release inicial. SQLite nao suporta
    // "ADD COLUMN IF NOT EXISTS", entao tentamos e ignoramos o erro.
    try {
      await db.execAsync('ALTER TABLE sync_queue ADD COLUMN last_error TEXT');
    } catch {
      // coluna ja existe
    }
    try {
      // updated_at na sync_queue: usado para resolucao de conflito (servidor vence
      // se updated_at do servidor for mais recente que o local). SQLite nao
      // permite DEFAULT (datetime('now')) em ALTER TABLE; preenchemos com fallback
      // logo em seguida para nao deixar NULL em registros antigos.
      await db.execAsync('ALTER TABLE sync_queue ADD COLUMN updated_at TEXT');
      await db.execAsync("UPDATE sync_queue SET updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE updated_at IS NULL");
    } catch {
      // coluna ja existe
    }
  }
  return db;
}
