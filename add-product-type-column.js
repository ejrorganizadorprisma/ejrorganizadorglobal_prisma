const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addProductTypeColumn() {
  console.log('Adding product_type column to products table...');

  try {
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add product_type column if it doesn't exist
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'FINAL' CHECK (product_type IN ('FINAL', 'COMPONENT'));

        -- Add version column
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';

        -- Update status column constraint if needed
        DO $$
        BEGIN
          ALTER TABLE products
          DROP CONSTRAINT IF EXISTS products_status_check;

          ALTER TABLE products
          ADD CONSTRAINT products_status_check
          CHECK (status IN ('DEVELOPMENT', 'PRODUCTION', 'ACTIVE', 'DISCONTINUED'));
        EXCEPTION
          WHEN OTHERS THEN NULL;
        END $$;

        -- Add other columns
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS warehouse_location TEXT;

        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS minimum_lot_quantity INTEGER;

        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS technical_description TEXT;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
        CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
        CREATE INDEX IF NOT EXISTS idx_products_type_status ON products(product_type, status);

        -- Update existing products to be FINAL type by default
        UPDATE products
        SET product_type = 'FINAL'
        WHERE product_type IS NULL;
      `
    });

    if (error) {
      console.error('Error executing migration:', error);
      console.log('\nTrying direct SQL execution...');

      // Try executing each statement separately
      const statements = [
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'FINAL'`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0'`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_location TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_lot_quantity INTEGER`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_description TEXT`,
        `CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type)`,
        `UPDATE products SET product_type = 'FINAL' WHERE product_type IS NULL`
      ];

      for (const sql of statements) {
        console.log(`Executing: ${sql}`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql });
        if (stmtError) {
          console.error(`  Error: ${stmtError.message}`);
        } else {
          console.log('  ✓ Success');
        }
      }
    } else {
      console.log('✓ Migration executed successfully!');
    }

    // Verify the changes
    console.log('\nVerifying changes...');
    const { data, error: verifyError } = await supabase
      .from('products')
      .select('id, code, name, product_type')
      .limit(5);

    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      console.log('Sample products with product_type:');
      console.log(data);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addProductTypeColumn();
