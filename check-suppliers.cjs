const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/home/nmaldaner/projetos/estoque/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  const { data, error, count } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total suppliers:', count);
    console.log('Suppliers:', JSON.stringify(data, null, 2));
  }
})();
