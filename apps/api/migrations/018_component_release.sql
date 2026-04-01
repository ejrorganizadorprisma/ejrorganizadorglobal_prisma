-- Migration: 018_component_release
-- Description: Add component release functionality - admin releases components from stock to production
-- Date: 2024-12-10

-- Adicionar campos de liberação na tabela unit_components
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS is_released BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS released_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS released_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Criar índice para buscar componentes liberados/não liberados
CREATE INDEX IF NOT EXISTS idx_unit_components_is_released ON unit_components(is_released);

-- Tabela de histórico de liberações de componentes
CREATE TABLE IF NOT EXISTS component_releases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  unit_component_id TEXT NOT NULL REFERENCES unit_components(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES production_units(id) ON DELETE CASCADE,
  part_id TEXT NOT NULL REFERENCES products(id),
  quantity_released INTEGER NOT NULL,
  released_by TEXT NOT NULL REFERENCES users(id),
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para component_releases
CREATE INDEX IF NOT EXISTS idx_component_releases_batch_id ON component_releases(batch_id);
CREATE INDEX IF NOT EXISTS idx_component_releases_unit_id ON component_releases(unit_id);
CREATE INDEX IF NOT EXISTS idx_component_releases_part_id ON component_releases(part_id);
CREATE INDEX IF NOT EXISTS idx_component_releases_released_by ON component_releases(released_by);
CREATE INDEX IF NOT EXISTS idx_component_releases_released_at ON component_releases(released_at DESC);

-- RLS para component_releases
ALTER TABLE component_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS component_releases_select ON component_releases;
DROP POLICY IF EXISTS component_releases_insert ON component_releases;
DROP POLICY IF EXISTS component_releases_update ON component_releases;
DROP POLICY IF EXISTS component_releases_delete ON component_releases;

CREATE POLICY component_releases_select ON component_releases FOR SELECT USING (true);
CREATE POLICY component_releases_insert ON component_releases FOR INSERT WITH CHECK (true);
CREATE POLICY component_releases_update ON component_releases FOR UPDATE USING (true);
CREATE POLICY component_releases_delete ON component_releases FOR DELETE USING (true);

-- Comentários
COMMENT ON COLUMN unit_components.is_released IS 'Indica se o componente foi liberado do estoque para produção';
COMMENT ON COLUMN unit_components.released_quantity IS 'Quantidade liberada do estoque';
COMMENT ON COLUMN unit_components.released_at IS 'Data/hora da liberação';
COMMENT ON COLUMN unit_components.released_by IS 'Usuário que liberou o componente';
COMMENT ON TABLE component_releases IS 'Histórico de liberações de componentes do estoque';
