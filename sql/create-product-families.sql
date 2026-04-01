-- Criar tabela de famílias de produtos
CREATE TABLE IF NOT EXISTS product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_families_name ON product_families(name);
CREATE INDEX IF NOT EXISTS idx_product_families_is_active ON product_families(is_active);

-- Adicionar coluna family na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS family VARCHAR(100);

-- Índice para filtros por família
CREATE INDEX IF NOT EXISTS idx_products_family ON products(family);

-- Enable RLS
ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;

-- Policy para acesso autenticado
CREATE POLICY "Allow all operations for authenticated users" ON product_families
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_product_families_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_families_updated_at ON product_families;
CREATE TRIGGER trigger_update_product_families_updated_at
  BEFORE UPDATE ON product_families
  FOR EACH ROW
  EXECUTE FUNCTION update_product_families_updated_at();
