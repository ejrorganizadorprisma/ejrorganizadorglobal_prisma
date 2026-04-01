const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required');
  process.exit(1);
}

async function runMigration(migrationFile) {
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log(`📝 Running migration: ${path.basename(migrationFile)}`);
  console.log(`SQL:\n${sql}\n`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Try alternative method using pg client
    console.log('\n🔄 Trying alternative method with SQL API...');
    try {
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement) continue;

        console.log(`\nExecuting: ${statement.substring(0, 100)}...`);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`Failed: ${error}`);
          throw new Error(`HTTP ${response.status}: ${error}`);
        }

        console.log('✅ Statement executed');
      }

      console.log('\n✅ Migration completed via alternative method!');
    } catch (altError) {
      console.error('\n❌ Alternative method also failed:', altError.message);
      console.error('\n📋 Please run this SQL manually in Supabase SQL Editor:');
      console.error('━'.repeat(80));
      console.error(sql);
      console.error('━'.repeat(80));
      process.exit(1);
    }
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  console.error('Example: node run-migration.js apps/api/migrations/011_allow_null_supplier_in_purchase_orders.sql');
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

runMigration(migrationFile);
