-- ============================================================================
-- Fix Production Orders - Criar todas as tabelas necessárias
-- ============================================================================

-- 1. Criar tabela de versões de BOM se não existir
CREATE TABLE IF NOT EXISTS bom_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id),
  version_number INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, version_number)
);

-- 2. Criar tabela de itens de BOM se não existir
CREATE TABLE IF NOT EXISTS bom_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bom_version_id TEXT NOT NULL REFERENCES bom_versions(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit TEXT,
  scrap_percentage DECIMAL(5,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de reservas de estoque se não existir
CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_for_type TEXT CHECK (reserved_for_type IN ('QUOTE', 'PRODUCTION_ORDER', 'SERVICE_ORDER', 'MANUAL')),
  reserved_for_id TEXT,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de ordens de produção
CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_number TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  bom_version_id TEXT REFERENCES bom_versions(id),
  quantity_planned INTEGER NOT NULL CHECK (quantity_planned > 0),
  quantity_produced INTEGER DEFAULT 0,
  quantity_scrapped INTEGER DEFAULT 0,
  quantity_pending INTEGER GENERATED ALWAYS AS (quantity_planned - quantity_produced - quantity_scrapped) STORED,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'CLOSED'
  )),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  material_cost INTEGER DEFAULT 0,
  labor_cost INTEGER DEFAULT 0,
  overhead_cost INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0,
  related_quote_id TEXT,
  related_service_order_id TEXT,
  created_by TEXT,
  assigned_to TEXT,
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Criar tabela de consumo de materiais
CREATE TABLE IF NOT EXISTS production_material_consumption (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  bom_item_id TEXT REFERENCES bom_items(id),
  quantity_planned INTEGER NOT NULL,
  quantity_consumed INTEGER DEFAULT 0,
  quantity_scrapped INTEGER DEFAULT 0,
  unit_cost INTEGER,
  consumed_by TEXT,
  consumed_at TIMESTAMPTZ,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar tabela de operações de produção
CREATE TABLE IF NOT EXISTS production_operations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  operation_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED')),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to TEXT,
  workstation TEXT,
  required_skills TEXT,
  quality_check_required BOOLEAN DEFAULT FALSE,
  quality_status TEXT CHECK (quality_status IN ('PENDING', 'PASSED', 'FAILED', 'WAIVED')),
  quality_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Criar tabela de apontamentos de produção
CREATE TABLE IF NOT EXISTS production_reportings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  reporting_date TIMESTAMPTZ DEFAULT NOW(),
  quantity_produced INTEGER NOT NULL CHECK (quantity_produced >= 0),
  quantity_scrapped INTEGER DEFAULT 0,
  scrap_reason TEXT,
  reported_by TEXT,
  shift TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_priority ON production_orders(priority);
CREATE INDEX IF NOT EXISTS idx_production_material_consumption_po ON production_material_consumption(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_operations_po ON production_operations(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_reportings_po ON production_reportings(production_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_product ON bom_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_version ON bom_items(bom_version_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_production_order_quantities()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE production_orders
  SET
    quantity_produced = (
      SELECT COALESCE(SUM(quantity_produced), 0)
      FROM production_reportings
      WHERE production_order_id = NEW.production_order_id
    ),
    quantity_scrapped = (
      SELECT COALESCE(SUM(quantity_scrapped), 0)
      FROM production_reportings
      WHERE production_order_id = NEW.production_order_id
    )
  WHERE id = NEW.production_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_production_quantities ON production_reportings;
CREATE TRIGGER trg_update_production_quantities
AFTER INSERT OR UPDATE ON production_reportings
FOR EACH ROW
EXECUTE FUNCTION update_production_order_quantities();

DROP TRIGGER IF EXISTS trg_production_orders_updated_at ON production_orders;
CREATE TRIGGER trg_production_orders_updated_at
BEFORE UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_production_operations_updated_at ON production_operations;
CREATE TRIGGER trg_production_operations_updated_at
BEFORE UPDATE ON production_operations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
