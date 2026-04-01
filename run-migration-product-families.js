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
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('Executing migration: Create product_families table and add family column to products\n');

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeMigration() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Create table product_families
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS product_families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await client.query(createTableSQL);
    console.log('Table product_families created');

    // Create indexes for product_families
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_product_families_name ON product_families(name);
      CREATE INDEX IF NOT EXISTS idx_product_families_is_active ON product_families(is_active);
    `;

    await client.query(createIndexesSQL);
    console.log('Indexes created for product_families');

    // Enable RLS
    try {
      await client.query('ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;');
      console.log('RLS enabled for product_families');
    } catch (e) {
      console.log('RLS already enabled or not supported');
    }

    // Create policy
    const createPolicySQL = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'product_families' AND policyname = 'Allow all for authenticated users'
        ) THEN
          CREATE POLICY "Allow all for authenticated users" ON product_families FOR ALL USING (true);
        END IF;
      END $$;
    `;

    try {
      await client.query(createPolicySQL);
      console.log('Policy created for product_families');
    } catch (e) {
      console.log('Policy already exists or not supported');
    }

    // Add family column to products table
    const addColumnSQL = `
      ALTER TABLE products ADD COLUMN IF NOT EXISTS family TEXT;
    `;

    await client.query(addColumnSQL);
    console.log('Column family added to products table');

    // Create index for family in products
    const createProductsFamilyIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_products_family ON products(family);
    `;

    await client.query(createProductsFamilyIndexSQL);
    console.log('Index created for products.family');

    // Count families
    const countResult = await client.query('SELECT COUNT(*) as count FROM product_families');
    console.log(`Total families: ${countResult.rows[0].count}`);

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Error executing migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration();
