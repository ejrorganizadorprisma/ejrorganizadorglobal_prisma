-- ============================================================================
-- Migration 002: Base BOM System
-- ============================================================================
-- Criado: 2025-01-16
-- Descrição: Sistema básico de BOM (Bill of Materials)
--
-- Cria a estrutura base necessária antes das expansões
-- ============================================================================

-- Tabela principal de BOM Items (se não existir)
CREATE TABLE IF NOT EXISTS bom_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit TEXT DEFAULT 'UN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, component_id)
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_bom_items_product ON bom_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_component ON bom_items(component_id);

-- Comentários
COMMENT ON TABLE bom_items IS 'Bill of Materials - relação entre produto final e componentes';
COMMENT ON COLUMN bom_items.product_id IS 'Produto final (montado)';
COMMENT ON COLUMN bom_items.component_id IS 'Componente necessário';
COMMENT ON COLUMN bom_items.quantity IS 'Quantidade do componente necessária';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bom_items_updated_at
BEFORE UPDATE ON bom_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
