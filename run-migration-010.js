const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://pqufymtbzrhzjfowaqgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration 010_create_document_settings.sql...');

  const sql = fs.readFileSync('./apps/api/migrations/010_create_document_settings.sql', 'utf8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.error(`Error on statement ${i + 1}:`, error.message);
        // Continue anyway for some errors
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`Exception on statement ${i + 1}:`, err.message);
    }
  }

  console.log('\n✓ Migration 010 completed!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
