#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function backupDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Conectando ao Supabase...');
    await client.connect();
    console.log('✅ Conectado!\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');

    // Criar diretório de backups se não existir
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const backupFile = path.join(backupDir, `backup-complete-${timestamp}.sql`);
    let sqlDump = `-- Complete Database Backup: ${new Date().toISOString()}\n`;
    sqlDump += `-- Sistema: EJR Organizador\n`;
    sqlDump += `-- Includes: Schema structure + Data\n\n`;

    // 1. Backup de ENUMs
    console.log('📋 Fazendo backup de ENUMs...');
    const { rows: enums } = await client.query(`
      SELECT t.typname as enum_name,
             e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);

    sqlDump += `-- ============================================\n`;
    sqlDump += `-- ENUMS\n`;
    sqlDump += `-- ============================================\n\n`;

    // Agrupa valores por enum
    const enumsByName = {};
    for (const row of enums) {
      if (!enumsByName[row.enum_name]) {
        enumsByName[row.enum_name] = [];
      }
      enumsByName[row.enum_name].push(row.enum_value);
    }

    for (const [enumName, values] of Object.entries(enumsByName)) {
      const valuesList = values.map(v => `'${v}'`).join(', ');
      sqlDump += `-- Enum: ${enumName}\n`;
      sqlDump += `DO $$ BEGIN\n`;
      sqlDump += `  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumName}') THEN\n`;
      sqlDump += `    CREATE TYPE "${enumName}" AS ENUM (${valuesList});\n`;
      sqlDump += `  END IF;\n`;
      sqlDump += `END $$;\n\n`;
    }

    // Lista de tabelas para fazer backup
    const tables = [
      'users',
      'products',
      'customers',
      'suppliers',
      'quotes',
      'quote_items',
      'notifications',
      'inventory_movements',
      'production_orders',
      'production_material_consumption',
      'production_operations',
      'production_reportings',
      'bom_versions',
      'bom_items',
      'stock_reservations',
      'service_orders',
      'product_parts'
    ];

    // 2. Backup das estruturas das tabelas
    console.log('🏗️  Fazendo backup da estrutura das tabelas...');
    sqlDump += `\n-- ============================================\n`;
    sqlDump += `-- TABLE COLUMNS (ALTER TABLE para adicionar colunas faltantes)\n`;
    sqlDump += `-- ============================================\n\n`;

    for (const table of tables) {
      const { rows: columns } = await client.query(`
        SELECT column_name, data_type, udt_name, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      if (columns.length > 0) {
        sqlDump += `-- Table: ${table}\n`;
        for (const col of columns) {
          const dataType = col.udt_name;
          const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
          const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';

          sqlDump += `DO $$ BEGIN\n`;
          sqlDump += `  IF NOT EXISTS (\n`;
          sqlDump += `    SELECT 1 FROM information_schema.columns\n`;
          sqlDump += `    WHERE table_name = '${table}' AND column_name = '${col.column_name}'\n`;
          sqlDump += `  ) THEN\n`;
          sqlDump += `    ALTER TABLE "${table}" ADD COLUMN "${col.column_name}" ${dataType} ${nullable} ${defaultVal};\n`;
          sqlDump += `  END IF;\n`;
          sqlDump += `END $$;\n`;
        }
        sqlDump += `\n`;
      }
    }

    // 3. Backup dos dados
    sqlDump += `\n-- ============================================\n`;
    sqlDump += `-- DATA\n`;
    sqlDump += `-- ============================================\n\n`;

    for (const table of tables) {
      console.log(`📦 Fazendo backup da tabela: ${table}`);

      // Verifica se a tabela existe
      const { rows: tableExists } = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [table]
      );

      if (!tableExists[0].exists) {
        console.log(`  ⚠️  Tabela ${table} não existe, pulando...`);
        continue;
      }

      // Busca os dados
      const { rows } = await client.query(`SELECT * FROM "${table}"`);

      if (rows.length === 0) {
        console.log(`  ℹ️  Tabela ${table} está vazia`);
        continue;
      }

      sqlDump += `\n-- Table: ${table} (${rows.length} registros)\n`;

      // Gera INSERTs
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (Array.isArray(val)) return `'${JSON.stringify(val)}'`;
          return val;
        });

        sqlDump += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }

      console.log(`  ✅ ${rows.length} registros salvos`);
    }

    // Salva o arquivo
    fs.writeFileSync(backupFile, sqlDump);
    console.log(`\n💾 Backup completo salvo em: ${backupFile}`);
    console.log(`📊 Tamanho: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);

  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

backupDatabase();
