const { Client } = require('pg');
require('dotenv').config({ path: './apps/api/.env' });

async function executeMigration() {
  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  console.log('🔄 Executing migration: Add password_version to users table\n');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Execute the migration
    const sql = `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;
    `;

    await client.query(sql);

    console.log('✅ Migration executed successfully!');
    console.log('   - Added password_version column to users table');
    console.log('   - Default value: 1');
    console.log('   - All existing users now have password_version = 1\n');

  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration();
