-- Add service support columns to quote_items
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(10) DEFAULT 'PRODUCT';
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS service_description TEXT;

-- Make product_id nullable (services don't have a product_id)
ALTER TABLE quote_items ALTER COLUMN product_id DROP NOT NULL;

-- Update existing rows
UPDATE quote_items SET item_type = 'PRODUCT' WHERE item_type IS NULL;
