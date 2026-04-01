#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function fixProductionOrders() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Conectando ao Supabase...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    const sqlFile = path.join(__dirname, 'fix-production-orders.sql');
    console.log('📄 Executando: fix-production-orders.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await client.query(sql);
    console.log('✅ Tabelas de produção criadas com sucesso!\n');

    console.log('🎉 Sistema de ordens de produção configurado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

fixProductionOrders();
