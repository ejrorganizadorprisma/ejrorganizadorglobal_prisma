#!/usr/bin/env node

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

/**
 * Script para preparar o schema do banco antes de um restore
 * Adiciona colunas e valores de enum que podem estar faltando
 */
async function prepareSchema() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    console.log('📋 Preparando schema do banco de dados...\n');

    // 1. Adiciona valores ao enum UserRole se não existirem
    console.log('🔧 Verificando enum UserRole...');
    const userRoleValues = ['OWNER', 'DIRECTOR', 'MANAGER', 'COORDINATOR', 'SALESPERSON', 'STOCK', 'TECHNICIAN'];

    for (const value of userRoleValues) {
      try {
        // Verifica se o valor já existe
        const { rows } = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = $1
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
          )
        `, [value]);

        if (!rows[0].exists) {
          await client.query(`ALTER TYPE "UserRole" ADD VALUE '${value}'`);
          console.log(`  ✓ Adicionado valor '${value}' ao enum UserRole`);
        } else {
          console.log(`  ○ Valor '${value}' já existe no enum UserRole`);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ○ Valor '${value}' já existe no enum UserRole`);
        } else {
          console.log(`  ⚠️  Erro ao adicionar '${value}': ${error.message}`);
        }
      }
    }

    // 2. Adiciona enum QuoteItemType se não existir
    console.log('\n🔧 Verificando enum QuoteItemType...');
    try {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteItemType') THEN
            CREATE TYPE "QuoteItemType" AS ENUM ('PRODUCT', 'SERVICE');
          END IF;
        END $$;
      `);
      console.log('  ✓ Enum QuoteItemType verificado/criado');
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar enum QuoteItemType: ${error.message}`);
    }

    // 3. Adiciona colunas à tabela products se não existirem
    console.log('\n🔧 Verificando colunas da tabela products...');

    const productColumns = [
      { name: 'space_id', type: 'TEXT', default: null },
      { name: 'shelf_id', type: 'TEXT', default: null },
      { name: 'section_id', type: 'TEXT', default: null },
      { name: 'preferred_supplier_id', type: 'TEXT', default: null },
      { name: 'reserved_stock', type: 'INTEGER', default: 0 }
    ];

    for (const column of productColumns) {
      try {
        // Verifica se a coluna já existe
        const { rows } = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'products'
            AND column_name = $1
          )
        `, [column.name]);

        if (!rows[0].exists) {
          const defaultClause = column.default !== null ? `DEFAULT ${column.default}` : '';
          await client.query(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type} ${defaultClause}`);
          console.log(`  ✓ Adicionada coluna '${column.name}' (${column.type})`);
        } else {
          console.log(`  ○ Coluna '${column.name}' já existe`);
        }
      } catch (error) {
        console.log(`  ⚠️  Erro ao adicionar '${column.name}': ${error.message}`);
      }
    }

    // 4. Adiciona colunas à tabela quote_items se não existirem
    console.log('\n🔧 Verificando colunas da tabela quote_items...');

    const quoteItemColumns = [
      { name: 'item_type', type: '"QuoteItemType"', default: "'PRODUCT'" },
      { name: 'service_name', type: 'TEXT', default: null },
      { name: 'service_description', type: 'TEXT', default: null }
    ];

    for (const column of quoteItemColumns) {
      try {
        const { rows } = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'quote_items'
            AND column_name = $1
          )
        `, [column.name]);

        if (!rows[0].exists) {
          const defaultClause = column.default !== null ? `DEFAULT ${column.default}` : '';
          await client.query(`ALTER TABLE quote_items ADD COLUMN ${column.name} ${column.type} ${defaultClause}`);
          console.log(`  ✓ Adicionada coluna '${column.name}' (${column.type})`);
        } else {
          console.log(`  ○ Coluna '${column.name}' já existe`);
        }
      } catch (error) {
        console.log(`  ⚠️  Erro ao adicionar '${column.name}': ${error.message}`);
      }
    }

    // 5. Torna product_id nullable em quote_items (pode ser serviço)
    try {
      await client.query(`
        ALTER TABLE quote_items ALTER COLUMN product_id DROP NOT NULL
      `);
      console.log('  ✓ Coluna product_id em quote_items agora permite NULL');
    } catch (error) {
      if (!error.message.includes('column "product_id" of relation "quote_items" is not a not-null constraint')) {
        console.log(`  ○ Coluna product_id já permite NULL`);
      }
    }

    console.log('\n✅ Schema preparado com sucesso!\n');

  } catch (error) {
    console.error('\n❌ Erro ao preparar schema:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  prepareSchema();
}

module.exports = { prepareSchema };
