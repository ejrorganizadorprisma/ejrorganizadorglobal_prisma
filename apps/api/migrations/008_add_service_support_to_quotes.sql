-- Migration 008: Add service support to quote items
-- Adds ability to create quotes for services in addition to products

-- 1. Create item type enum
DO $$ BEGIN
  CREATE TYPE quote_item_type AS ENUM ('PRODUCT', 'SERVICE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to quote_items table
ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS item_type quote_item_type NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_description TEXT;

-- 3. Make product_id nullable (since services don't have a product_id)
ALTER TABLE quote_items
  ALTER COLUMN product_id DROP NOT NULL;

-- 4. Add check constraint to ensure data integrity:
-- - If item_type is PRODUCT, product_id must be provided
-- - If item_type is SERVICE, service_name must be provided
ALTER TABLE quote_items
  ADD CONSTRAINT quote_items_type_check CHECK (
    (item_type = 'PRODUCT' AND product_id IS NOT NULL) OR
    (item_type = 'SERVICE' AND service_name IS NOT NULL)
  );

-- 5. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_items_type ON quote_items(item_type);

COMMENT ON COLUMN quote_items.item_type IS 'Tipo do item: PRODUCT (produto do catálogo) ou SERVICE (serviço personalizado)';
COMMENT ON COLUMN quote_items.service_name IS 'Nome do serviço (obrigatório quando item_type = SERVICE)';
COMMENT ON COLUMN quote_items.service_description IS 'Descrição detalhada do serviço (opcional)';
