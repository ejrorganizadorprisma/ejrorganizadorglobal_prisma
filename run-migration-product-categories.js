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

console.log('🔄 Executing migration: Create product_categories table\n');

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

    // Create table
    const createTableSQL = `
      -- Create product_categories table
      CREATE TABLE IF NOT EXISTS product_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await client.query(createTableSQL);
    console.log('✅ Table product_categories created');

    // Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
      CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);
    `;

    await client.query(createIndexesSQL);
    console.log('✅ Indexes created');

    // Enable RLS
    const enableRLSSQL = `
      ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
    `;

    try {
      await client.query(enableRLSSQL);
      console.log('✅ RLS enabled');
    } catch (e) {
      console.log('ℹ️  RLS already enabled or not supported');
    }

    // Create policy
    const createPolicySQL = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'Allow all for authenticated users'
        ) THEN
          CREATE POLICY "Allow all for authenticated users" ON product_categories FOR ALL USING (true);
        END IF;
      END $$;
    `;

    try {
      await client.query(createPolicySQL);
      console.log('✅ Policy created');
    } catch (e) {
      console.log('ℹ️  Policy already exists or not supported');
    }

    // Migrate existing categories from products table
    const migrateSQL = `
      INSERT INTO product_categories (id, name, is_active, created_at, updated_at)
      SELECT
        'cat-' || substr(md5(LOWER(TRIM(category))), 1, 8) || '-' || substr(md5(random()::text), 1, 8),
        TRIM(category),
        true,
        NOW(),
        NOW()
      FROM (
        SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''
      ) AS distinct_categories
      ON CONFLICT (name) DO NOTHING;
    `;

    const result = await client.query(migrateSQL);
    console.log(`✅ Migrated existing categories from products table`);

    // Count categories
    const countResult = await client.query('SELECT COUNT(*) as count FROM product_categories');
    console.log(`✅ Total categories: ${countResult.rows[0].count}`);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error executing migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration();
