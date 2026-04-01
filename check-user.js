import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from both possible locations
dotenv.config({ path: join(__dirname, 'apps/api/.env') });
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('Checking user: admin@ejr.com\n');

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, is_active, password_hash')
    .eq('email', 'admin@ejr.com')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ User not found!');
    console.log('\nListing all users:');

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, name, role, is_active');

    console.table(allUsers);
    return;
  }

  const user = data[0];
  console.log('✅ User found!');
  console.log('\nUser details:');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Name:', user.name);
  console.log('Role:', user.role);
  console.log('Is Active:', user.is_active);
  console.log('Has password hash:', user.password_hash ? 'Yes' : 'No');

  if (!user.is_active) {
    console.log('\n⚠️  WARNING: User is INACTIVE!');
  }

  if (!user.password_hash) {
    console.log('\n⚠️  WARNING: User has NO password hash!');
  }
}

checkUser().catch(console.error);
