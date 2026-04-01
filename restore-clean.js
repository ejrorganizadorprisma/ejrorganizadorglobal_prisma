#!/usr/bin/env node

const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function cleanAndRestore(backupFile) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Lista de tabelas na ordem correta (respeita foreign keys)
    const tablesToClean = [
      'product_parts',
      'bom_items',
      'bom_versions',
      'production_reportings',
      'production_operations',
      'production_material_consumption',
      'production_orders',
      'service_orders',
      'stock_reservations',
      'inventory_movements',
      'quote_items',
      'quotes',
      'notifications',
      'products',
      'suppliers',
      'customers',
      'users'
    ];

    console.log('🗑️  Limpando tabelas...\n');

    for (const table of tablesToClean) {
      try {
        const { rowCount } = await client.query(`DELETE FROM "${table}"`);
        if (rowCount > 0) {
          console.log(`  ✓ ${table}: ${rowCount} registros removidos`);
        } else {
          console.log(`  ○ ${table}: vazia`);
        }
      } catch (error) {
        // Ignora erros de tabelas que não existem
        if (!error.message.includes('does not exist')) {
          console.log(`  ⚠️  ${table}: ${error.message.substring(0, 60)}`);
        }
      }
    }

    await client.end();

    console.log('\n✅ Limpeza concluída!\n');

    // Prepara o schema antes de restaurar
    console.log('🔧 Preparando schema do banco...\n');
    const prepareSchemaScript = path.join(__dirname, 'prepare-schema.js');
    execSync(`node "${prepareSchemaScript}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });

    console.log('\n📦 Restaurando backup...\n');

    // Executa o script de restore
    const restoreScript = path.join(__dirname, 'restore-backup.js');
    const fullBackupPath = path.isAbsolute(backupFile)
      ? backupFile
      : path.join(__dirname, backupFile);

    execSync(`node "${restoreScript}" "${fullBackupPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

// Processa argumentos
const backupFile = process.argv[2];

if (!backupFile) {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Script de Restore Limpo - EJR Organizador            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('⚠️  ATENÇÃO: Este script irá APAGAR TODOS os dados e restaurar do backup!\n');
  console.log('Uso: node restore-clean.js <caminho-do-backup>\n');
  console.log('Exemplo:');
  console.log('  node restore-clean.js backups/backup-dados-organizador-2025-11-29T13-48-20-121Z.sql\n');
  process.exit(0);
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     ⚠️  ATENÇÃO: OPERAÇÃO DESTRUTIVA                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log('Este script irá:\n');
console.log('  1. Preparar o schema do banco (adicionar colunas/enums faltantes)');
console.log('  2. APAGAR TODOS os dados do banco');
console.log('  3. Restaurar do backup: ' + path.basename(backupFile) + '\n');
console.log('Iniciando em 3 segundos...\n');

setTimeout(() => {
  cleanAndRestore(backupFile);
}, 3000);
