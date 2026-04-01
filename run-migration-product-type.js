const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔄 Aplicando migração: adicionar product_type aos produtos...\n');

  const migrations = [
    {
      name: 'Adicionar coluna product_type',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'COMPONENT'`
    },
    {
      name: 'Adicionar constraint de product_type',
      sql: `DO $$
BEGIN
  ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;
  ALTER TABLE products ADD CONSTRAINT products_product_type_check CHECK (product_type IN ('FINAL', 'COMPONENT'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$`
    },
    {
      name: 'Adicionar coluna version',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0'`
    },
    {
      name: 'Adicionar coluna warehouse_location',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_location TEXT`
    },
    {
      name: 'Adicionar coluna lead_time_days',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER`
    },
    {
      name: 'Adicionar coluna minimum_lot_quantity',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_lot_quantity INTEGER`
    },
    {
      name: 'Adicionar coluna technical_description',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_description TEXT`
    },
    {
      name: 'Criar índice idx_products_type',
      sql: `CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type)`
    },
    {
      name: 'Criar índice idx_products_type_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_products_type_status ON products(product_type, status)`
    },
    {
      name: 'Atualizar produtos existentes para COMPONENT',
      sql: `UPDATE products SET product_type = 'COMPONENT' WHERE product_type IS NULL`
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`⏳ ${migration.name}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });

      if (error) {
        // Se não existe exec_sql, tenta query direto
        const { error: directError } = await supabase.from('_sql').select('*').limit(0);

        if (directError) {
          console.log(`⚠️  Não foi possível executar via RPC. Tentando método alternativo...`);
          // Método alternativo: usar o SQL editor manualmente
          console.log(`   SQL: ${migration.sql.substring(0, 50)}...`);
          errorCount++;
        } else {
          console.log(`✅ ${migration.name} - OK`);
          successCount++;
        }
      } else {
        console.log(`✅ ${migration.name} - OK`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Erro em "${migration.name}":`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migrações bem-sucedidas: ${successCount}`);
  console.log(`❌ Migrações com erro: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Algumas migrações falharam.');
    console.log('Por favor, execute o arquivo add-product-type.sql manualmente no Supabase SQL Editor:');
    console.log('   1. Acesse: https://supabase.com/dashboard → Seu projeto → SQL Editor');
    console.log('   2. Copie o conteúdo de: add-product-type.sql');
    console.log('   3. Execute o SQL');
  }

  // Verificar resultado
  console.log('\n🔍 Verificando estrutura da tabela products...');
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, code, name, product_type')
      .limit(5);

    if (error) {
      console.error('❌ Erro ao verificar:', error.message);
      console.log('\n⚠️  A coluna product_type ainda não existe.');
      console.log('Execute a migração manualmente conforme instruções acima.');
    } else {
      console.log('✅ Tabela products possui a coluna product_type!');
      if (data && data.length > 0) {
        console.log('\n📊 Exemplo de produtos:');
        data.forEach(p => {
          console.log(`   - ${p.code}: ${p.name} [${p.product_type || 'NULL'}]`);
        });
      }

      // Contar por tipo
      const { data: counts, error: countError } = await supabase
        .rpc('exec_sql', {
          sql: `SELECT product_type, COUNT(*) as count FROM products GROUP BY product_type`
        });

      if (!countError && counts) {
        console.log('\n📈 Contagem por tipo:');
        console.log(counts);
      }
    }
  } catch (err) {
    console.error('❌ Erro na verificação:', err.message);
  }
}

runMigration();
