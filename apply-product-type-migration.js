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
    const migrationPath = path.join(__dirname, 'add-product-type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Aplicando migração: adicionar product_type...\n');

    await client.query(migrationSQL);

    console.log('✅ Migração aplicada com sucesso!\n');

    // Verificar resultado
    console.log('🔍 Verificando mudanças...');
    const result = await client.query(`
      SELECT
        product_type,
        COUNT(*) as count
      FROM products
      GROUP BY product_type
      ORDER BY product_type
    `);

    console.log('\n📊 Produtos por tipo:');
    result.rows.forEach(row => {
      console.log(`   ${row.product_type || 'NULL'}: ${row.count} produtos`);
    });

    // Mostrar alguns produtos de exemplo
    const samples = await client.query(`
      SELECT id, code, name, product_type
      FROM products
      LIMIT 5
    `);

    console.log('\n📦 Exemplos de produtos:');
    samples.rows.forEach(p => {
      console.log(`   - [${p.code}] ${p.name} → ${p.product_type}`);
    });

    console.log('\n✅ Tudo pronto! A coluna product_type foi adicionada com sucesso.');
    console.log('   Todos os produtos existentes foram marcados como COMPONENT.');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migração:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
