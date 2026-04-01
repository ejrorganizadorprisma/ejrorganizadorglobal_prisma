-- Script para corrigir schema da tabela products
-- Data: 13/12/2025
-- Adiciona colunas faltantes que estão sendo usadas no código

-- 1. Adicionar coluna product_type
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'COMPONENT';

-- 2. Adicionar coluna is_assembly
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_assembly BOOLEAN DEFAULT FALSE;

-- 3. Adicionar coluna is_part
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_part BOOLEAN DEFAULT FALSE;

-- 4. Adicionar coluna assembly_cost
ALTER TABLE products
ADD COLUMN IF NOT EXISTS assembly_cost NUMERIC(15,2) DEFAULT 0;

-- 5. Adicionar coluna version (se necessário)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS version VARCHAR(50);

-- 6. Adicionar coluna warehouse_location (se necessário)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(100);

-- 7. Adicionar coluna lead_time_days (se necessário)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- 8. Adicionar coluna minimum_lot_quantity (se necessário)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS minimum_lot_quantity INTEGER DEFAULT 1;

-- 9. Adicionar coluna description (se necessário)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS description TEXT;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_is_assembly ON products(is_assembly);
CREATE INDEX IF NOT EXISTS idx_products_is_part ON products(is_part);

-- Adicionar constraint para product_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_product_type_check
    CHECK (product_type IN ('FINAL', 'COMPONENT'));
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN products.product_type IS 'Tipo do produto: FINAL (produto acabado) ou COMPONENT (componente)';
COMMENT ON COLUMN products.is_assembly IS 'Indica se o produto é uma montagem (possui BOM)';
COMMENT ON COLUMN products.is_part IS 'Indica se o produto é uma peça/componente';
COMMENT ON COLUMN products.assembly_cost IS 'Custo de montagem do produto';
COMMENT ON COLUMN products.version IS 'Versão do produto';
COMMENT ON COLUMN products.warehouse_location IS 'Localização física no armazém';
COMMENT ON COLUMN products.lead_time_days IS 'Prazo de entrega em dias';
COMMENT ON COLUMN products.minimum_lot_quantity IS 'Quantidade mínima de lote para compra';
