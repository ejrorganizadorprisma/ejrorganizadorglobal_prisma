#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URL from .env
const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

// SQL files directory
const sqlDir = path.join(__dirname, 'sql');

// Get all SQL files in order
const sqlFiles = [
  '00_drop_all_tables.sql',
  '01_create_types.sql',
  '02_create_users_table.sql',
  '03_create_products_table.sql',
  '04_create_customers_table.sql',
  '05_create_quotes_tables.sql',
  '06_create_suppliers_table.sql',
  '07_create_notifications_table.sql',
  '08_create_inventory_movements_table.sql',
  '09_create_functions.sql',
  '10_create_triggers.sql',
  '11_seed_data.sql',
  '12_create_product_parts_table.sql',
  '13_alter_products_add_bom_fields.sql',
  '14_create_service_orders_table.sql',
  '15_create_service_parts_table.sql',
  '002_suppliers_add_columns.sql',
];

async function runMigrations() {
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

    for (const file of sqlFiles) {
      const filePath = path.join(sqlDir, file);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Arquivo não encontrado: ${file} - Pulando...`);
        continue;
      }

      console.log(`📄 Executando: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${file} executado com sucesso!`);
      } catch (error) {
        console.error(`❌ Erro ao executar ${file}:`, error.message);
        // Continue with next file even if there's an error
        // (some files might fail if tables already exist, etc.)
      }
      console.log('');
    }

    console.log('🎉 Todas as migrations foram processadas!');
    console.log('\n📝 Credenciais de admin:');
    console.log('   Email: admin@ejr.com');
    console.log('   Senha: admin123');

  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

runMigrations();
