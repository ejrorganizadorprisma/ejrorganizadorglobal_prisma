const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://pqufymtbzrhzjfowaqgt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdWZ5bXRienJoempmb3dhcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI2MDE3NywiZXhwIjoyMDc4NjIwMTc3fQ.ezqCii2DX0HV2ADLVOwl_iHj_Gfg7RpGjWLAioVWaVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Executando Migration 003: Product-Supplier Relationship...\n');

  try {
    const migrationPath = path.join(__dirname, 'migrations', '003_product_suppliers.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Executar a migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // Fallback: executar comando por comando
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'));

      for (const command of commands) {
        console.log(`Executando: ${command.substring(0, 60)}...`);
        const { error: cmdError } = await supabase.rpc('exec_sql', { sql_query: command });
        if (cmdError) {
          console.error(`❌ Erro no comando:`, cmdError.message);
          throw cmdError;
        }
      }
      return { data: null, error: null };
    });

    if (error) {
      throw error;
    }

    console.log('✅ Migration 003 executada com sucesso!');
    console.log('\n📋 Criado:');
    console.log('  - Tabela product_suppliers (relação many-to-many)');
    console.log('  - Campo preferred_supplier_id na tabela products');
    console.log('  - Índices para otimização de queries\n');

  } catch (err) {
    console.error('❌ Erro ao executar migration:', err.message);
    console.error('\n⚠️  Você precisará executar a migration manualmente no Supabase SQL Editor');
    console.error('📝 Arquivo: migrations/003_product_suppliers.sql\n');
    process.exit(1);
  }
}

runMigration();
