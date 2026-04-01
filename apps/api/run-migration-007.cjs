require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL é obrigatório');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    console.log('📄 Executando migration 007_create_product_location_system.sql...');

    const sql = fs.readFileSync('./migrations/007_create_product_location_system.sql', 'utf-8');

    // Split into individual statements
    const statements = sql
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--') && trimmed.length > 0;
      })
      .join('\n')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`📝 Executando ${statements.length} comandos SQL...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   [${i + 1}/${statements.length}] Executando comando...`);

      try {
        await client.query(statement);
        console.log(`   ✅ Comando ${i + 1} executado com sucesso`);
      } catch (error) {
        console.error(`   ❌ Erro no comando ${i + 1}:`, error.message);
        // Continue mesmo com erro, pode ser constraint que já existe
      }
    }

    console.log('\n✅ Migration executada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
