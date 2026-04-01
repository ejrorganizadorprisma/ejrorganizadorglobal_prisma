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

    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    let sqlDump = `-- Database Backup: ${new Date().toISOString()}\n\n`;

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
      'stock_reservations'
    ];

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
      const { rows } = await client.query(`SELECT * FROM ${table}`);

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
          return val;
        });

        sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }

      console.log(`  ✅ ${rows.length} registros salvos`);
    }

    // Salva o arquivo
    fs.writeFileSync(backupFile, sqlDump);
    console.log(`\n💾 Backup salvo em: ${backupFile}`);
    console.log(`📊 Tamanho: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);

  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error.message);
  } finally {
    await client.end();
  }
}

backupDatabase();
