const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data: users, error } = await supabase
    .from('users')
    .select('name, email, role')
    .ilike('name', '%leo%');

  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Usuários encontrados:', JSON.stringify(users, null, 2));
  }
})();
