const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://pqufymtbzrhzjfowaqgt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdWZ5bXRienJoempmb3dhcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI2MDE3NywiZXhwIjoyMDc4NjIwMTc3fQ.ezqCii2DX0HV2ADLVOwl_iHj_Gfg7RpGjWLAioVWaVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStoragePolicies() {
  console.log('🔐 Configurando políticas de acesso do Storage...\n');

  try {
    // IMPORTANTE: As políticas RLS para Storage precisam ser criadas manualmente
    // no painel do Supabase, pois a API do cliente não permite criar políticas.

    console.log('⚠️  Para configurar as permissões do bucket, siga estes passos:\n');
    console.log('1. Acesse: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/storage/buckets');
    console.log('2. Clique no bucket "product-images"');
    console.log('3. Vá em "Policies" (Políticas)');
    console.log('4. Adicione as seguintes políticas:\n');

    console.log('📝 POLÍTICA 1: Permitir INSERT (Upload)');
    console.log('   - Nome: "Allow authenticated users to upload"');
    console.log('   - Operation: INSERT');
    console.log('   - Policy definition:');
    console.log('     auth.role() = \'authenticated\'');
    console.log('');

    console.log('📝 POLÍTICA 2: Permitir SELECT (Leitura)');
    console.log('   - Nome: "Allow public read access"');
    console.log('   - Operation: SELECT');
    console.log('   - Policy definition:');
    console.log('     true');
    console.log('');

    console.log('📝 POLÍTICA 3: Permitir DELETE (Deletar)');
    console.log('   - Nome: "Allow authenticated users to delete"');
    console.log('   - Operation: DELETE');
    console.log('   - Policy definition:');
    console.log('     auth.role() = \'authenticated\'');
    console.log('');

    console.log('ℹ️  Ou use SQL diretamente no SQL Editor do Supabase:\n');
    console.log('-- Permitir upload para usuários autenticados');
    console.log('CREATE POLICY "Allow authenticated users to upload"');
    console.log('ON storage.objects FOR INSERT');
    console.log('TO authenticated');
    console.log('WITH CHECK (bucket_id = \'product-images\');\n');

    console.log('-- Permitir leitura pública');
    console.log('CREATE POLICY "Allow public read access"');
    console.log('ON storage.objects FOR SELECT');
    console.log('TO public');
    console.log('USING (bucket_id = \'product-images\');\n');

    console.log('-- Permitir delete para usuários autenticados');
    console.log('CREATE POLICY "Allow authenticated users to delete"');
    console.log('ON storage.objects FOR DELETE');
    console.log('TO authenticated');
    console.log('USING (bucket_id = \'product-images\');\n');

    console.log('✅ Após configurar as políticas, o upload de imagens funcionará corretamente!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

setupStoragePolicies();
