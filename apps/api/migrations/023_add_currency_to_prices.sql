-- Migration: Add currency columns to product prices
-- Description: Store each price with its original currency to avoid conversion rounding errors

-- Add currency columns for each price field
ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_price_currency VARCHAR(3) DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS sale_price_currency VARCHAR(3) DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS wholesale_price_currency VARCHAR(3) DEFAULT 'BRL';

-- Add check constraints to ensure valid currencies
ALTER TABLE products
ADD CONSTRAINT check_cost_price_currency CHECK (cost_price_currency IN ('BRL', 'USD', 'PYG')),
ADD CONSTRAINT check_sale_price_currency CHECK (sale_price_currency IN ('BRL', 'USD', 'PYG')),
ADD CONSTRAINT check_wholesale_price_currency CHECK (wholesale_price_currency IN ('BRL', 'USD', 'PYG'));

-- Add comments
COMMENT ON COLUMN products.cost_price_currency IS 'Currency of the cost price';
COMMENT ON COLUMN products.sale_price_currency IS 'Currency of the sale price';
COMMENT ON COLUMN products.wholesale_price_currency IS 'Currency of the wholesale price';

-- Update existing products to use the default system currency
-- This assumes you'll run a script to set the correct currency based on system settings
