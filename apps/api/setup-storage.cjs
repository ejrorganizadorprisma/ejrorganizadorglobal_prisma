const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://iwkjxkjxwbdjxkwbvmhj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2p4a2p4d2Jkanhrd2J2bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkwMzEzMCwiZXhwIjoyMDkwNDc5MTMwfQ.TS9y8q9_7UA0QRDzXqS3FjxOJ3CDuyf8JVCorVNr4Q0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log('🔧 Configurando Supabase Storage para imagens de produtos...\n');

  try {
    // Criar bucket 'product-images' se não existir
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError.message);
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'product-images');

    if (bucketExists) {
      console.log('✅ Bucket "product-images" já existe!\n');
    } else {
      console.log('📦 Criando bucket "product-images"...');

      const { data, error } = await supabase.storage.createBucket('product-images', {
        public: true, // Imagens públicas para exibição
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
      });

      if (error) {
        console.error('❌ Erro ao criar bucket:', error.message);
        console.log('\n⚠️  Por favor, crie o bucket manualmente:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/storage/buckets');
        console.log('   2. Clique em "New bucket"');
        console.log('   3. Nome: product-images');
        console.log('   4. Marque como "Public bucket"');
        console.log('   5. Clique em "Create bucket"\n');
        return;
      }

      console.log('✅ Bucket "product-images" criado com sucesso!\n');
    }

    // Verificar políticas de acesso
    console.log('📋 Configuração do bucket:');
    console.log('   - Nome: product-images');
    console.log('   - Acesso: Público');
    console.log('   - Tamanho máximo: 5MB');
    console.log('   - Formatos: JPEG, PNG, WebP, GIF\n');

    console.log('✅ Storage configurado com sucesso!');
    console.log('\n📝 URLs das imagens terão o formato:');
    console.log(`   ${supabaseUrl}/storage/v1/object/public/product-images/FILENAME\n`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

setupStorage();
