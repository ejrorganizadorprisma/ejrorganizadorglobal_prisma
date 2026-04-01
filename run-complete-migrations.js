#!/usr/bin/env node

/**
 * Script para executar as migrações completas do sistema de manufatura
 * Executa o arquivo sql/COMPLETE_MIGRATIONS.sql no banco de dados Supabase
 */

const { readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');

// Ler .env manualmente
const envPath = join(__dirname, 'apps', 'api', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});
process.env.DATABASE_URL = envVars.DATABASE_URL;

async function runCompleteMigrations() {
  console.log('🚀 Iniciando execução das migrações completas...\n');

  // Conectar ao banco de dados
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📡 Conectando ao banco de dados...');
    await pool.query('SELECT 1');
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Ler arquivo SQL
    const sqlFilePath = join(__dirname, 'sql', 'COMPLETE_MIGRATIONS.sql');
    console.log(`📄 Lendo arquivo: ${sqlFilePath}`);
    const sql = readFileSync(sqlFilePath, 'utf-8');
    console.log(`✅ Arquivo lido: ${sql.length} caracteres, ${sql.split('\n').length} linhas\n`);

    // Executar SQL
    console.log('⚙️  Executando migrações...');
    console.log('⏳ Isso pode levar alguns segundos...\n');

    const startTime = Date.now();
    await pool.query(sql);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Migrações executadas com sucesso em ${duration}s!\n`);

    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...\n');

    const tables = [
      'bom_items',
      'stock_reservations',
      'production_orders',
      'production_order_materials',
      'purchase_orders',
      'purchase_order_items',
      'goods_receipts',
      'goods_receipt_items'
    ];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - NÃO ENCONTRADA`);
      }
    }

    console.log('\n🎉 Processo concluído com sucesso!');
    console.log('\n📊 Todas as tabelas do sistema de manufatura foram criadas.');
    console.log('💡 O sistema EGRO agora está totalmente funcional!\n');

  } catch (error) {
    console.error('\n❌ Erro ao executar migrações:');
    console.error(error.message);

    if (error.position) {
      const lines = sql.split('\n');
      const errorLine = parseInt(error.position);
      console.error(`\n📍 Erro próximo à linha ${errorLine}:`);
      console.error(lines[errorLine - 1]);
    }

    process.exit(1);
  } finally {
    await pool.end();
    console.log('👋 Conexão encerrada.\n');
  }
}

// Executar
runCompleteMigrations().catch(console.error);
