-- 051: Cadastro de Marcas (tabela brands) + FK em products
-- Marca é atributo comercial do produto, podendo (opcionalmente) estar ligada a
-- uma Indústria (manufacturers). Idempotente.

CREATE TABLE IF NOT EXISTS brands (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code            TEXT,
  name            TEXT NOT NULL,
  manufacturer_id TEXT REFERENCES manufacturers(id) ON DELETE SET NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_name_lower ON brands (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_code ON brands (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brands_manufacturer_id ON brands (manufacturer_id);

-- FK + texto denormalizado em products (texto facilita listagem/sync)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);
