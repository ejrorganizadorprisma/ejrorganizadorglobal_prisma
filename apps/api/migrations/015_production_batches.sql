-- Migration: 015_production_batches
-- Description: Create tables for Production Batches (Lotes de Produção) module
-- Date: 2024-12-09

-- ============================================
-- PRODUCTION BATCHES (Lotes de Produção)
-- ============================================

CREATE TABLE IF NOT EXISTS production_batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  production_order_id TEXT REFERENCES production_orders(id) ON DELETE SET NULL,
  quantity_planned INTEGER NOT NULL DEFAULT 1,
  quantity_produced INTEGER NOT NULL DEFAULT 0,
  quantity_scrapped INTEGER NOT NULL DEFAULT 0,
  quantity_in_progress INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'PAUSED', 'TESTING', 'COMPLETED', 'CANCELLED')
  ),
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para production_batches
CREATE INDEX IF NOT EXISTS idx_production_batches_product_id ON production_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_production_order_id ON production_batches(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_production_batches_assigned_to ON production_batches(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_batches_created_at ON production_batches(created_at DESC);

-- ============================================
-- PRODUCTION UNITS (Unidades de Produção)
-- ============================================

CREATE TABLE IF NOT EXISTS production_units (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id TEXT NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  serial_number VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'IN_PRODUCTION', 'AWAITING_TEST', 'IN_TESTING', 'TEST_PASSED', 'TEST_FAILED', 'REWORK', 'COMPLETED', 'SCRAPPED')
  ),
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tested_at TIMESTAMPTZ,
  tested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  final_tested_at TIMESTAMPTZ,
  final_tested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, unit_number)
);

-- Indexes para production_units
CREATE INDEX IF NOT EXISTS idx_production_units_batch_id ON production_units(batch_id);
CREATE INDEX IF NOT EXISTS idx_production_units_status ON production_units(status);
CREATE INDEX IF NOT EXISTS idx_production_units_assigned_to ON production_units(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_units_serial_number ON production_units(serial_number) WHERE serial_number IS NOT NULL;

-- ============================================
-- UNIT COMPONENTS (Componentes da Unidade)
-- ============================================

CREATE TABLE IF NOT EXISTS unit_components (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  unit_id TEXT NOT NULL REFERENCES production_units(id) ON DELETE CASCADE,
  product_part_id TEXT NOT NULL REFERENCES product_parts(id),
  part_id TEXT NOT NULL REFERENCES products(id),
  quantity_required INTEGER NOT NULL DEFAULT 1,
  quantity_used INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'MOUNTED', 'DEFECTIVE', 'REPLACED')
  ),
  mounted_at TIMESTAMPTZ,
  mounted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para unit_components
CREATE INDEX IF NOT EXISTS idx_unit_components_unit_id ON unit_components(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_components_part_id ON unit_components(part_id);
CREATE INDEX IF NOT EXISTS idx_unit_components_status ON unit_components(status);

-- ============================================
-- UNIT TESTS (Testes da Unidade)
-- ============================================

CREATE TABLE IF NOT EXISTS unit_tests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  unit_id TEXT NOT NULL REFERENCES production_units(id) ON DELETE CASCADE,
  test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('ASSEMBLY', 'FINAL')),
  result VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    result IN ('PENDING', 'PASSED', 'FAILED', 'CONDITIONAL')
  ),
  tested_by TEXT NOT NULL REFERENCES users(id),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observations TEXT,
  defects_found TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para unit_tests
CREATE INDEX IF NOT EXISTS idx_unit_tests_unit_id ON unit_tests(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_tests_test_type ON unit_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_unit_tests_result ON unit_tests(result);
CREATE INDEX IF NOT EXISTS idx_unit_tests_tested_by ON unit_tests(tested_by);

-- ============================================
-- PRODUCTION HISTORY (Histórico de Produção)
-- ============================================

CREATE TABLE IF NOT EXISTS production_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('BATCH', 'UNIT', 'COMPONENT')),
  entity_id TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  performed_by TEXT NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para production_history
CREATE INDEX IF NOT EXISTS idx_production_history_entity ON production_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_production_history_performed_by ON production_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_production_history_performed_at ON production_history(performed_at DESC);

-- ============================================
-- TRIGGERS para updated_at
-- ============================================

-- Trigger para production_batches
CREATE OR REPLACE FUNCTION update_production_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_production_batches_updated_at ON production_batches;
CREATE TRIGGER trigger_production_batches_updated_at
  BEFORE UPDATE ON production_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_production_batches_updated_at();

-- Trigger para production_units
CREATE OR REPLACE FUNCTION update_production_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_production_units_updated_at ON production_units;
CREATE TRIGGER trigger_production_units_updated_at
  BEFORE UPDATE ON production_units
  FOR EACH ROW
  EXECUTE FUNCTION update_production_units_updated_at();

-- Trigger para unit_components
CREATE OR REPLACE FUNCTION update_unit_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unit_components_updated_at ON unit_components;
CREATE TRIGGER trigger_unit_components_updated_at
  BEFORE UPDATE ON unit_components
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_components_updated_at();

-- ============================================
-- FUNCTION: Gerar número do lote
-- ============================================

CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_batch_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(batch_number FROM 'LOTE-' || v_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM production_batches
  WHERE batch_number LIKE 'LOTE-' || v_year || '-%';

  v_batch_number := 'LOTE-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_batch_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Criar unidades ao liberar lote
-- ============================================

CREATE OR REPLACE FUNCTION create_batch_units()
RETURNS TRIGGER AS $$
DECLARE
  v_unit_number INTEGER;
  v_product_parts RECORD;
BEGIN
  -- Só executa quando status muda para RELEASED
  IF OLD.status != 'RELEASED' AND NEW.status = 'RELEASED' THEN
    -- Criar unidades de produção
    FOR v_unit_number IN 1..NEW.quantity_planned LOOP
      INSERT INTO production_units (batch_id, unit_number, status)
      VALUES (NEW.id, v_unit_number, 'PENDING');
    END LOOP;

    -- Criar componentes para cada unidade baseado no BOM
    FOR v_product_parts IN
      SELECT pp.id as product_part_id, pp.part_id, pp.quantity
      FROM product_parts pp
      WHERE pp.product_id = NEW.product_id
    LOOP
      INSERT INTO unit_components (unit_id, product_part_id, part_id, quantity_required)
      SELECT pu.id, v_product_parts.product_part_id, v_product_parts.part_id, v_product_parts.quantity
      FROM production_units pu
      WHERE pu.batch_id = NEW.id;
    END LOOP;

    -- Atualizar data de início real se não estiver definida
    IF NEW.actual_start_date IS NULL THEN
      NEW.actual_start_date = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_batch_units ON production_batches;
CREATE TRIGGER trigger_create_batch_units
  BEFORE UPDATE ON production_batches
  FOR EACH ROW
  EXECUTE FUNCTION create_batch_units();

-- ============================================
-- FUNCTION: Atualizar contadores do lote
-- ============================================

CREATE OR REPLACE FUNCTION update_batch_counters()
RETURNS TRIGGER AS $$
DECLARE
  v_produced INTEGER;
  v_scrapped INTEGER;
  v_in_progress INTEGER;
BEGIN
  -- Calcular contadores
  SELECT
    COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    COUNT(*) FILTER (WHERE status = 'SCRAPPED'),
    COUNT(*) FILTER (WHERE status IN ('IN_PRODUCTION', 'AWAITING_TEST', 'IN_TESTING', 'TEST_PASSED', 'TEST_FAILED', 'REWORK'))
  INTO v_produced, v_scrapped, v_in_progress
  FROM production_units
  WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id);

  -- Atualizar lote
  UPDATE production_batches
  SET
    quantity_produced = v_produced,
    quantity_scrapped = v_scrapped,
    quantity_in_progress = v_in_progress
  WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_batch_counters ON production_units;
CREATE TRIGGER trigger_update_batch_counters
  AFTER INSERT OR UPDATE OF status OR DELETE ON production_units
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_counters();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_history ENABLE ROW LEVEL SECURITY;

-- Policies para production_batches (todos podem ver, apenas gestores podem modificar)
DROP POLICY IF EXISTS production_batches_select ON production_batches;
DROP POLICY IF EXISTS production_batches_insert ON production_batches;
DROP POLICY IF EXISTS production_batches_update ON production_batches;
DROP POLICY IF EXISTS production_batches_delete ON production_batches;

CREATE POLICY production_batches_select ON production_batches FOR SELECT USING (true);
CREATE POLICY production_batches_insert ON production_batches FOR INSERT WITH CHECK (true);
CREATE POLICY production_batches_update ON production_batches FOR UPDATE USING (true);
CREATE POLICY production_batches_delete ON production_batches FOR DELETE USING (true);

-- Policies para production_units
DROP POLICY IF EXISTS production_units_select ON production_units;
DROP POLICY IF EXISTS production_units_insert ON production_units;
DROP POLICY IF EXISTS production_units_update ON production_units;
DROP POLICY IF EXISTS production_units_delete ON production_units;

CREATE POLICY production_units_select ON production_units FOR SELECT USING (true);
CREATE POLICY production_units_insert ON production_units FOR INSERT WITH CHECK (true);
CREATE POLICY production_units_update ON production_units FOR UPDATE USING (true);
CREATE POLICY production_units_delete ON production_units FOR DELETE USING (true);

-- Policies para unit_components
DROP POLICY IF EXISTS unit_components_select ON unit_components;
DROP POLICY IF EXISTS unit_components_insert ON unit_components;
DROP POLICY IF EXISTS unit_components_update ON unit_components;
DROP POLICY IF EXISTS unit_components_delete ON unit_components;

CREATE POLICY unit_components_select ON unit_components FOR SELECT USING (true);
CREATE POLICY unit_components_insert ON unit_components FOR INSERT WITH CHECK (true);
CREATE POLICY unit_components_update ON unit_components FOR UPDATE USING (true);
CREATE POLICY unit_components_delete ON unit_components FOR DELETE USING (true);

-- Policies para unit_tests
DROP POLICY IF EXISTS unit_tests_select ON unit_tests;
DROP POLICY IF EXISTS unit_tests_insert ON unit_tests;
DROP POLICY IF EXISTS unit_tests_update ON unit_tests;
DROP POLICY IF EXISTS unit_tests_delete ON unit_tests;

CREATE POLICY unit_tests_select ON unit_tests FOR SELECT USING (true);
CREATE POLICY unit_tests_insert ON unit_tests FOR INSERT WITH CHECK (true);
CREATE POLICY unit_tests_update ON unit_tests FOR UPDATE USING (true);
CREATE POLICY unit_tests_delete ON unit_tests FOR DELETE USING (true);

-- Policies para production_history
DROP POLICY IF EXISTS production_history_select ON production_history;
DROP POLICY IF EXISTS production_history_insert ON production_history;

CREATE POLICY production_history_select ON production_history FOR SELECT USING (true);
CREATE POLICY production_history_insert ON production_history FOR INSERT WITH CHECK (true);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE production_batches IS 'Lotes de produção - agrupa várias unidades do mesmo produto';
COMMENT ON TABLE production_units IS 'Unidades individuais de produção dentro de um lote';
COMMENT ON TABLE unit_components IS 'Componentes/peças de cada unidade de produção (baseado no BOM)';
COMMENT ON TABLE unit_tests IS 'Registros de testes (montagem e final) de cada unidade';
COMMENT ON TABLE production_history IS 'Histórico de todas as ações na produção para rastreabilidade';

COMMENT ON COLUMN production_batches.batch_number IS 'Número único do lote no formato LOTE-YYYY-NNNN';
COMMENT ON COLUMN production_units.unit_number IS 'Número sequencial da unidade dentro do lote';
COMMENT ON COLUMN production_units.serial_number IS 'Número de série opcional para rastreabilidade externa';
COMMENT ON COLUMN unit_components.quantity_required IS 'Quantidade do componente necessária (do BOM)';
COMMENT ON COLUMN unit_components.quantity_used IS 'Quantidade efetivamente usada na montagem';
COMMENT ON COLUMN unit_tests.test_type IS 'Tipo de teste: ASSEMBLY (pós-montagem) ou FINAL';
