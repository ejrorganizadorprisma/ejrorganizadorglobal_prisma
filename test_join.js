const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  console.log('\n🔍 Testando diferentes sintaxes de join...\n');

  // Teste 1: com nome da tabela simples
  console.log('1️⃣ Tentando: suppliers(*)');
  const { data: test1, error: err1 } = await supabase
    .from('product_suppliers')
    .select('*, suppliers(*)')
    .limit(1);
  if (err1) console.log('   ❌ Erro:', err1.message);
  else console.log('   ✅ Sucesso!');

  // Teste 2: com constraint name completo
  console.log('\n2️⃣ Tentando: suppliers!product_suppliers_supplier_id_fkey(*)');
  const { data: test2, error: err2 } = await supabase
    .from('product_suppliers')
    .select('*, suppliers!product_suppliers_supplier_id_fkey(*)')
    .limit(1);
  if (err2) console.log('   ❌ Erro:', err2.message);
  else console.log('   ✅ Sucesso! Estrutura dos dados:', JSON.stringify(test2, null, 2));
})();
