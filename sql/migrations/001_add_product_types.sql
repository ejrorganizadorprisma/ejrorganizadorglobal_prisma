-- Migration 001: Add Product Types and Manufacturing Fields
-- Description: Extends products table to support FINAL products vs COMPONENTS
-- Date: 2025-11-16

-- Step 1: Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'FINAL' CHECK (product_type IN ('FINAL', 'COMPONENT'));

ALTER TABLE products
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('DEVELOPMENT', 'PRODUCTION', 'ACTIVE', 'DISCONTINUED'));

-- Component-specific fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS warehouse_location TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS minimum_lot_quantity INTEGER;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS technical_description TEXT;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_type_status ON products(product_type, status);

-- Step 3: Update existing products to be FINAL type by default
UPDATE products
SET product_type = 'FINAL'
WHERE product_type IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN products.product_type IS 'FINAL = Product sold to customers, COMPONENT = Part used in assembly';
COMMENT ON COLUMN products.status IS 'DEVELOPMENT = Being developed, PRODUCTION = Prototype phase, ACTIVE = Ready for sale, DISCONTINUED = No longer available';
COMMENT ON COLUMN products.warehouse_location IS 'Physical location in warehouse (e.g., A-12-3)';
COMMENT ON COLUMN products.lead_time_days IS 'Supplier delivery time in days (for components)';
COMMENT ON COLUMN products.minimum_lot_quantity IS 'Minimum purchase quantity (for components)';

-- Step 5: Create view for quick access to components and final products
CREATE OR REPLACE VIEW v_components AS
SELECT * FROM products WHERE product_type = 'COMPONENT';

CREATE OR REPLACE VIEW v_final_products AS
SELECT * FROM products WHERE product_type = 'FINAL';

-- Verification query
-- SELECT product_type, COUNT(*) as count FROM products GROUP BY product_type;
