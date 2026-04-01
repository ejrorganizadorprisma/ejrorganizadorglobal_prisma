#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    console.log('📝 Lendo arquivo de migração...');
    const migrationPath = path.join(__dirname, 'add-production-role.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Aplicando migração: adicionar PRODUCTION ao enum UserRole...\n');

    await client.query(migrationSQL);

    console.log('✅ Migração aplicada com sucesso!\n');

    // Verificar resultado
    console.log('🔍 Verificando valores do enum...');
    const result = await client.query(`
      SELECT enumlabel as value
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
      ORDER BY enumlabel
    `);

    console.log('\n📊 Valores do enum UserRole:');
    result.rows.forEach(row => {
      console.log(`   - ${row.value}`);
    });

    console.log('\n✅ Tudo pronto! Agora você pode usar a função PRODUCTION.');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migração:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
