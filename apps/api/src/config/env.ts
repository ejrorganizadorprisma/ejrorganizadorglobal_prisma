import dotenv from 'dotenv';

// Load .env only in non-serverless environments
if (!process.env.VERCEL) {
  dotenv.config();
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  FRONTEND_URL: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173'],
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',
  // Trim defensivo — env vars do Vercel podem vir com \n acidental no copy-paste,
  // o que quebra URLs montadas e tokens.
  SUPABASE_URL: process.env.SUPABASE_URL?.trim().replace(/\/+$/, ''),
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim(),
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY?.trim(),
};

// Validação de variáveis obrigatórias
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variável de ambiente ${envVar} não configurada!`);
  }
}
