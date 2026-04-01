-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON product_categories
  FOR ALL USING (true);

-- Migrate existing categories from products table
INSERT INTO product_categories (id, name, is_active, created_at, updated_at)
SELECT
  'cat-' || md5(LOWER(TRIM(category))) || '-' || substr(md5(random()::text), 1, 8),
  TRIM(category),
  true,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''
) AS distinct_categories
ON CONFLICT (name) DO NOTHING;
