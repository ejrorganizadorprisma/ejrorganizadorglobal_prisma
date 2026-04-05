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
  }
  return db;
}
