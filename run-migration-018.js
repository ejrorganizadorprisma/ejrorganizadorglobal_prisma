// Migration 018: Component Release functionality
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Conectando ao banco de dados...');
    await client.connect();
    console.log('Conectado!');

    // Read migration file
    const migrationPath = path.join(__dirname, 'apps/api/migrations/018_component_release.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\nExecutando migration 018_component_release.sql...');
    await client.query(migrationSQL);
    console.log('Migration 018 executada com sucesso!');

    console.log('\n=== SUCESSO ===');
    console.log('Campos de liberação de componentes adicionados.');
  } catch (error) {
    console.error('Erro ao executar migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
