import { Pool, QueryResult } from 'pg';
import { env } from './env';

// Create a connection pool (optimized for serverless)
const isServerless = !!process.env.VERCEL;

// For serverless + Supabase pooler: switch from Session mode (port 5432) to Transaction mode (port 6543)
function getConnectionString(): string {
  let url = env.DATABASE_URL;
  if (isServerless && url?.includes('pooler.supabase.com')) {
    // Switch to transaction mode pooler (port 6543)
    url = url.replace(/pooler\.supabase\.com:5432/, 'pooler.supabase.com:6543');
    // Add pgbouncer param to disable prepared statements (required for transaction mode)
    if (!url.includes('pgbouncer=true')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
    console.log('🔄 Switched to Supabase Transaction mode pooler (port 6543)');
  }
  return url;
}

const connectionString = getConnectionString();
const pool = new Pool({
  connectionString,
  max: isServerless ? 1 : 20,
  idleTimeoutMillis: isServerless ? 1000 : 30000,
  connectionTimeoutMillis: isServerless ? 10000 : 5000,
  allowExitOnIdle: isServerless,
  ssl: (connectionString?.includes('supabase') || connectionString?.includes('sslmode=require')) ? { rejectUnauthorized: false } : undefined,
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't call process.exit in serverless environments
});

// Query helper function
export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (!isServerless) {
      console.log('📊 Query executed', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Query error', { text, error });
    throw error;
  }
};

// Transaction helper
export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const db = {
  query,
  transaction,
  pool,
};

export default db;
