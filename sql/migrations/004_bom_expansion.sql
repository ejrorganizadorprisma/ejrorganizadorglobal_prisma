-- ============================================================================
-- Migration 003: BOM Expansion (Fase 2)
-- ============================================================================
-- Criado: 2025-01-16
-- Descrição: Expansão do sistema BOM (Bill of Materials)
--
-- Adiciona funcionalidades avançadas ao BOM:
-- - Versionamento de BOMs
-- - BOMs alternativos
-- - Waste/scrap tracking
-- - Step-by-step assembly instructions
-- ============================================================================

-- Expandir tabela bom_items com campos adicionais
ALTER TABLE bom_items
ADD COLUMN IF NOT EXISTS scrap_percentage DECIMAL(5,2) DEFAULT 0 CHECK (scrap_percentage >= 0 AND scrap_percentage <= 100),
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS position INTEGER, -- Ordem de montagem
ADD COLUMN IF NOT EXISTS reference_designator TEXT; -- Ex: R1, C2, IC1 para componentes eletrônicos

-- Tabela de versões de BOM
CREATE TABLE IF NOT EXISTS bom_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  effective_date TIMESTAMPTZ,
  obsolete_date TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(product_id, version)
);

-- Vincular bom_items a versões
ALTER TABLE bom_items
ADD COLUMN IF NOT EXISTS bom_version_id TEXT REFERENCES bom_versions(id) ON DELETE CASCADE;

-- Tabela de instruções de montagem
CREATE TABLE IF NOT EXISTS assembly_instructions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bom_version_id TEXT REFERENCES bom_versions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_time_minutes INTEGER,
  required_tools TEXT, -- JSON array de ferramentas
  safety_notes TEXT,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de BOMs alternativos (componentes substitutos)
CREATE TABLE IF NOT EXISTS bom_alternatives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bom_item_id TEXT NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
  alternative_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- 1 = primeira alternativa
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bom_versions_product ON bom_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_status ON bom_versions(status);
CREATE INDEX IF NOT EXISTS idx_assembly_instructions_product ON assembly_instructions(product_id);
CREATE INDEX IF NOT EXISTS idx_assembly_instructions_version ON assembly_instructions(bom_version_id);
CREATE INDEX IF NOT EXISTS idx_bom_alternatives_item ON bom_alternatives(bom_item_id);

-- Comentários
COMMENT ON TABLE bom_versions IS 'Versões do BOM para controle de mudanças';
COMMENT ON TABLE assembly_instructions IS 'Instruções passo-a-passo para montagem';
COMMENT ON TABLE bom_alternatives IS 'Componentes alternativos/substitutos';
COMMENT ON COLUMN bom_items.scrap_percentage IS 'Percentual de perda esperada (waste/scrap)';
COMMENT ON COLUMN bom_items.is_optional IS 'Componente opcional na montagem';
COMMENT ON COLUMN bom_items.reference_designator IS 'Designador de referência (ex: R1, C2, IC1)';

-- Function para calcular custo total do BOM com scrap
CREATE OR REPLACE FUNCTION calculate_bom_cost_with_scrap(p_product_id TEXT, p_version_id TEXT DEFAULT NULL)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT
      bi.quantity,
      bi.scrap_percentage,
      p.cost_price
    FROM bom_items bi
    JOIN products p ON p.id = bi.component_id
    WHERE bi.product_id = p_product_id
      AND (p_version_id IS NULL OR bi.bom_version_id = p_version_id)
      AND bi.is_optional = FALSE
  LOOP
    -- Calcula quantidade necessária considerando scrap
    -- Ex: 10 unidades + 5% scrap = 10 * 1.05 = 10.5 unidades
    v_total := v_total + (
      v_item.quantity *
      (1 + (v_item.scrap_percentage / 100)) *
      v_item.cost_price
    );
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bom_versions_updated_at
BEFORE UPDATE ON bom_versions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_assembly_instructions_updated_at
BEFORE UPDATE ON assembly_instructions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
