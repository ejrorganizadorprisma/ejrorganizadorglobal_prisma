-- Add product_type column to products table
-- This enables differentiation between final products and components

-- Add product_type column (default: COMPONENT)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'COMPONENT';

-- Add constraint
DO $$
BEGIN
  ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_product_type_check;

  ALTER TABLE products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('FINAL', 'COMPONENT'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add version column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';

-- Add other columns from migration
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
CREATE INDEX IF NOT EXISTS idx_products_type_status ON products(product_type, status);

-- Update existing products to be COMPONENT type by default
UPDATE products
SET product_type = 'COMPONENT'
WHERE product_type IS NULL;

-- Verify the migration
SELECT
  product_type,
  COUNT(*) as count
FROM products
GROUP BY product_type;
