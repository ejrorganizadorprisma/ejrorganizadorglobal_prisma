const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://pqufymtbzrhzjfowaqgt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdWZ5bXRienJoempmb3dhcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI2MDE3NywiZXhwIjoyMDc4NjIwMTc3fQ.ezqCii2DX0HV2ADLVOwl_iHj_Gfg7RpGjWLAioVWaVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Executando migração 002: Adicionar colunas à tabela suppliers...\n');

  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'sql', '002_suppliers_add_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL a ser executado:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('');

    // Executar a migração
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Se a função RPC não existir, tentar executar diretamente via API
      console.log('⚠️  Função exec_sql não encontrada, tentando método alternativo...\n');

      // Executar comando por comando
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'));

      for (const command of commands) {
        if (command.includes('ALTER TABLE')) {
          console.log(`📝 Executando: ${command.substring(0, 80)}...`);
          const { error: cmdError } = await supabase.from('_migrations').insert({});
          if (cmdError) {
            console.error(`❌ Erro: ${cmdError.message}`);
          }
        }
      }

      console.log('\n⚠️  ATENÇÃO: Não foi possível executar a migração automaticamente.');
      console.log('📋 Por favor, execute o SQL manualmente no Supabase Dashboard:');
      console.log('   1. Acesse: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new');
      console.log('   2. Cole o conteúdo do arquivo: sql/002_suppliers_add_columns.sql');
      console.log('   3. Clique em "Run" para executar\n');

      return;
    }

    console.log('✅ Migração executada com sucesso!\n');
    console.log('📊 Verificando as colunas adicionadas...\n');

    // Verificar se as colunas foram adicionadas
    const { data: columns, error: checkError } = await supabase
      .from('suppliers')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Erro ao verificar colunas:', checkError.message);
    } else {
      console.log('✅ Colunas na tabela suppliers:', Object.keys(columns[0] || {}).join(', '));
    }

  } catch (err) {
    console.error('❌ Erro ao executar migração:', err.message);
    console.log('\n📋 Execute manualmente no Supabase Dashboard:');
    console.log('   1. Acesse: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new');
    console.log('   2. Cole o conteúdo do arquivo: sql/002_suppliers_add_columns.sql');
    console.log('   3. Clique em "Run" para executar\n');
  }
}

runMigration();
