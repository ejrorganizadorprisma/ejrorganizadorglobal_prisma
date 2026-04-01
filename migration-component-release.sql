-- ==============================================
-- EJR Organizador - Component Release Migration
-- Adds fields for stock release tracking per component
-- ==============================================

-- Add release tracking fields to unit_components table
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE;
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS released_quantity INTEGER DEFAULT 0;
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE unit_components ADD COLUMN IF NOT EXISTS released_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Create index for release tracking
CREATE INDEX IF NOT EXISTS idx_unit_components_is_released ON unit_components(is_released);
CREATE INDEX IF NOT EXISTS idx_unit_components_released_by ON unit_components(released_by);

-- ==============================================
-- COMPONENT RELEASES TABLE (History of releases)
-- ==============================================
CREATE TABLE IF NOT EXISTS component_releases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  unit_component_id TEXT NOT NULL REFERENCES unit_components(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES production_batches(id) ON DELETE SET NULL,
  unit_id TEXT REFERENCES production_units(id) ON DELETE SET NULL,
  part_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_released INTEGER NOT NULL,
  released_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_component_releases_batch_id ON component_releases(batch_id);
CREATE INDEX IF NOT EXISTS idx_component_releases_unit_id ON component_releases(unit_id);
CREATE INDEX IF NOT EXISTS idx_component_releases_part_id ON component_releases(part_id);
CREATE INDEX IF NOT EXISTS idx_component_releases_released_at ON component_releases(released_at DESC);
CREATE INDEX IF NOT EXISTS idx_component_releases_unit_component_id ON component_releases(unit_component_id);
