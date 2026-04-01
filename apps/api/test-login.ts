import { supabase } from './src/config/supabase';
import { comparePassword } from './src/utils/password';

async function testLogin() {
  const email = 'admin@ejr.com';
  const password = process.argv[2];

  if (!password) {
    console.log('Usage: npx tsx test-login.ts <password>');
    console.log('Example: npx tsx test-login.ts admin123');
    process.exit(1);
  }

  console.log(`Testing login for: ${email}`);
  console.log(`Password: ${password}\n`);

  // Fetch user
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error || !users || users.length === 0) {
    console.log('❌ User not found!');
    return;
  }

  const user = users[0];
  console.log('✅ User found!');
  console.log('User ID:', user.id);
  console.log('Is Active:', user.is_active);
  console.log('Role:', user.role);
  console.log('Password hash length:', user.password_hash?.length || 0);
  console.log();

  // Check if active
  if (!user.is_active) {
    console.log('❌ LOGIN FAILED: User is inactive');
    return;
  }

  // Verify password
  console.log('Comparing password...');
  try {
    const isPasswordValid = await comparePassword(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);

    if (isPasswordValid) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('Token would be generated for user:', user.email);
    } else {
      console.log('\n❌ LOGIN FAILED: Invalid password');
      console.log('\nTIP: Make sure you are using the correct password.');
      console.log('If you forgot the password, you can reset it using the admin panel.');
    }
  } catch (error) {
    console.error('\n❌ Error comparing password:', error);
  }
}

testLogin().catch(console.error);
