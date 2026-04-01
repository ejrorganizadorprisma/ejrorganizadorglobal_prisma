-- Migration: Add wholesale_price column to products table
-- Description: Adds a wholesale price field to support different pricing tiers

-- Add wholesale_price column (stored in centavos like other prices)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS wholesale_price INTEGER NOT NULL DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN products.wholesale_price IS 'Wholesale price in centavos (cents)';
