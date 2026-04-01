-- Adicionar campo de unidade aos produtos
-- Data: 13/12/2025

-- 1. Adicionar coluna unit
ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'UNIT';

-- 2. Criar índice
CREATE INDEX IF NOT EXISTS idx_products_unit ON products(unit);

-- 3. Adicionar constraint para validar valores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_unit_check'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_unit_check
    CHECK (unit IN ('UNIT', 'METER', 'WEIGHT', 'LITER'));
  END IF;
END $$;

-- 4. Comentário
COMMENT ON COLUMN products.unit IS 'Unidade de medida: UNIT (unidade), METER (metro), WEIGHT (peso), LITER (litro)';
