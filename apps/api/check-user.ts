import { supabase } from './src/config/supabase';

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
  console.log('Has password hash:', user.password_hash ? 'Yes (length: ' + user.password_hash.length + ')' : 'No');

  if (!user.is_active) {
    console.log('\n⚠️  WARNING: User is INACTIVE!');
  }

  if (!user.password_hash) {
    console.log('\n⚠️  WARNING: User has NO password hash!');
  }
}

checkUser().catch(console.error);
