import pkg from 'pg';
const { Client } = pkg;
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const migrationsPath = join(__dirname, '../../migrations');

  console.log('🔄 Executando migrações...\n');

  const client = new Client({
    connectionString: env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    const files = readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = join(migrationsPath, file);
      const sql = readFileSync(filePath, 'utf-8');

      console.log(`📝 Executando migração: ${file}`);

      try {
        await client.query(sql);
        console.log(`✅ ${file} executado com sucesso\n`);
      } catch (error: any) {
        // Ignora erro se o valor já existe
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  ${file} - valor já existe (ignorando)\n`);
        } else {
          console.error(`❌ Erro ao executar ${file}:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ Todas as migrações foram concluídas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
