-- Adicionar campos de BOM (Bill of Materials) à tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_assembly BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_part BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS assembly_cost INTEGER DEFAULT 0;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_is_assembly ON products(is_assembly);
CREATE INDEX IF NOT EXISTS idx_products_is_part ON products(is_part);

-- Comentários explicativos
COMMENT ON COLUMN products.is_assembly IS 'Indica se o produto é montado a partir de peças (possui BOM)';
COMMENT ON COLUMN products.is_part IS 'Indica se o produto é uma peça/componente';
COMMENT ON COLUMN products.assembly_cost IS 'Custo de montagem em centavos';
