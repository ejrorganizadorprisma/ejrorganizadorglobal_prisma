import { supabase } from './src/config/supabase';

async function checkPermissions() {
  console.log('Checking OWNER permissions\n');

  const { data: permissions, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('role', 'OWNER');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!permissions || permissions.length === 0) {
    console.log('❌ No permissions found for OWNER role!');
    console.log('\nThis is likely the problem - OWNER should have all permissions.');
    return;
  }

  console.log(`✅ Found ${permissions.length} permissions for OWNER role\n`);
  console.table(permissions);
}

checkPermissions().catch(console.error);
