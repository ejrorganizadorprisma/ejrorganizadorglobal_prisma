const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, 'apps/api/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let databaseUrl = '';

for (const line of envLines) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.substring('DATABASE_URL='.length).trim();
    break;
  }
}

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

async function executeMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

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
