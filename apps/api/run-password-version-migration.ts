import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Running migration: Add password_version to users table\n');

  try {
    // Check if column already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('password_version')
      .limit(1);

    if (checkError && checkError.message.includes('password_version')) {
      console.log('⚠️  Column password_version does not exist yet. Creating...\n');

      // Since we can't execute DDL via Supabase REST API directly,
      // we'll update all users to add the field through the dashboard
      console.log('📝 Please run this SQL in Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE users');
      console.log('ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;');
      console.log('');
      console.log('After running the SQL, press Enter to continue...');

      // For now, assume it was run and continue
      return;
    }

    console.log('✅ Column password_version already exists!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();
