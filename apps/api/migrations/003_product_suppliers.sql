-- Migration 003: Product-Supplier Relationship
-- Permite que produtos sejam associados a múltiplos fornecedores

-- Tabela intermediária para relação many-to-many entre produtos e fornecedores
CREATE TABLE IF NOT EXISTS product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

  -- Informações específicas do fornecedor para este produto
  supplier_sku VARCHAR(100),  -- Código do produto no catálogo do fornecedor
  unit_price INTEGER NOT NULL DEFAULT 0,  -- Preço unitário em centavos
  minimum_quantity INTEGER DEFAULT 1,  -- Quantidade mínima de compra
  lead_time_days INTEGER DEFAULT 0,  -- Prazo de entrega específico deste item
  is_preferred BOOLEAN DEFAULT false,  -- Se é o fornecedor preferencial para este produto

  -- Metadados
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Garantir que não haja duplicatas
  UNIQUE(product_id, supplier_id)
);

-- Adicionar campo de fornecedor preferencial na tabela de produtos
-- Nota: suppliers.id é TEXT, então usamos TEXT aqui também
ALTER TABLE products
ADD COLUMN IF NOT EXISTS preferred_supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_is_preferred ON product_suppliers(is_preferred) WHERE is_preferred = true;
CREATE INDEX IF NOT EXISTS idx_products_preferred_supplier_id ON products(preferred_supplier_id);

-- Comentários para documentação
COMMENT ON TABLE product_suppliers IS 'Tabela intermediária para relacionamento many-to-many entre produtos e fornecedores';
COMMENT ON COLUMN product_suppliers.supplier_sku IS 'Código do produto no catálogo do fornecedor';
COMMENT ON COLUMN product_suppliers.unit_price IS 'Preço unitário em centavos cobrado por este fornecedor';
COMMENT ON COLUMN product_suppliers.minimum_quantity IS 'Quantidade mínima de compra deste fornecedor';
COMMENT ON COLUMN product_suppliers.lead_time_days IS 'Prazo de entrega específico deste fornecedor para este produto';
COMMENT ON COLUMN product_suppliers.is_preferred IS 'Indica se este é o fornecedor preferencial para este produto';
