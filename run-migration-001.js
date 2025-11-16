const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running Migration 001: Add Product Types\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', 'migrations', '001_add_product_types.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and filter out comments and empty lines
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      console.log(statement.substring(0, 80) + (statement.length > 80 ? '...' : ''));

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement);

        // Try alternate method: direct query
        console.log('Trying alternate method...');

        // For ALTER TABLE, we might need to use Supabase's admin API
        // For now, let's output the SQL for manual execution
        console.log('\n⚠️  Please execute this SQL manually in Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/_/sql\n');
        console.log(sqlContent);
        return;
      } else {
        console.log(`✅ Success\n`);
      }
    }

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    const { data: products, error: verifyError } = await supabase
      .from('products')
      .select('product_type')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.log('\n📋 Please run this migration manually in Supabase SQL Editor:');
      console.log(sqlContent);
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('\n📊 Next steps:');
      console.log('1. Check Supabase Dashboard > Table Editor > products');
      console.log('2. Verify new columns: product_type, version, status, etc.');
      console.log('3. Run backend code to test new fields');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\n📋 Manual migration required. Please execute in Supabase SQL Editor:');
    const sqlPath = path.join(__dirname, 'sql', 'migrations', '001_add_product_types.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(sqlContent);
  }
}

runMigration();
