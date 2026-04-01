#!/usr/bin/env node
/**
 * Script para executar arquivos SQL no banco de dados PostgreSQL
 * Uso: node execute-sql.js <arquivo.sql>
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Configuração do banco de dados
const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function executeSQLFile(filePath) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log(`📝 Lendo arquivo SQL: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo não encontrado: ${filePath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📦 SQL carregado (${sql.length} caracteres)`);

    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!');

    console.log('🚀 Executando SQL...');
    const result = await client.query(sql);

    console.log('✅ SQL executado com sucesso!');
    console.log('📊 Tabelas criadas:');
    console.log('   - purchase_requests');
    console.log('   - purchase_request_items');
    console.log('   - Índices criados');
    console.log('   - Triggers configurados');
    console.log('   - Funções criadas');

    return result;
  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
    if (error.detail) {
      console.error('Detalhes:', error.detail);
    }
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

// Executar
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('❌ Uso: node execute-sql.js <arquivo.sql>');
  console.error('Exemplo: node execute-sql.js create-purchase-requests.sql');
  process.exit(1);
}

const fullPath = path.resolve(sqlFile);
executeSQLFile(fullPath)
  .then(() => {
    console.log('\n🎉 Pronto! As tabelas foram criadas com sucesso.');
    console.log('Você pode agora usar o módulo de Lista de Necessidades.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha ao executar SQL');
    process.exit(1);
  });
