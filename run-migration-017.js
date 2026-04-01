// Migration 017: Create release_batch_bypass_trigger function
// This script executes the migration using pg library

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
    const migrationPath = path.join(__dirname, 'apps/api/migrations/017_release_batch_rpc.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\nExecutando migration 017_release_batch_rpc.sql...');
    await client.query(migrationSQL);
    console.log('Migration 017 executada com sucesso!');

    // Also drop the problematic trigger
    console.log('\nDesabilitando trigger create_batch_units...');
    await client.query('DROP TRIGGER IF EXISTS trigger_create_batch_units ON production_batches;');
    console.log('Trigger desabilitado com sucesso!');

    console.log('\n=== SUCESSO ===');
    console.log('A liberação de lotes agora funcionará corretamente.');
  } catch (error) {
    console.error('Erro ao executar migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
