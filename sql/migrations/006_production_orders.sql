-- ============================================================================
-- Migration 005: Production Orders (Fase 4)
-- ============================================================================
-- Criado: 2025-01-16
-- Descrição: Sistema de ordens de produção
--
-- Funcionalidades:
-- - Ordens de produção com planejamento
-- - Consumo de componentes
-- - Rastreamento de progresso
-- - Controle de qualidade
-- - Custos de produção
-- ============================================================================

-- Ordens de Produção
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
    'DRAFT',          -- Rascunho
    'PLANNED',        -- Planejada
    'RELEASED',       -- Liberada para produção
    'IN_PROGRESS',    -- Em produção
    'PAUSED',         -- Pausada
    'COMPLETED',      -- Completa
    'CANCELLED',      -- Cancelada
    'CLOSED'          -- Fechada (pós-produção)
  )),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),

  -- Datas
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  -- Custos (em centavos)
  material_cost INTEGER DEFAULT 0,
  labor_cost INTEGER DEFAULT 0,
  overhead_cost INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0,

  -- Relacionamentos
  related_quote_id TEXT, -- Se foi criada a partir de um orçamento
  related_service_order_id TEXT, -- Se foi criada para ordem de serviço
  created_by TEXT,
  assigned_to TEXT, -- Responsável pela produção

  -- Notas
  notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumo de Materiais na Produção
CREATE TABLE IF NOT EXISTS production_material_consumption (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  bom_item_id TEXT REFERENCES bom_items(id),
  quantity_planned INTEGER NOT NULL,
  quantity_consumed INTEGER DEFAULT 0,
  quantity_scrapped INTEGER DEFAULT 0,
  unit_cost INTEGER, -- Custo no momento do consumo (em centavos)
  consumed_by TEXT,
  consumed_at TIMESTAMPTZ,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operações de Produção (etapas do processo)
CREATE TABLE IF NOT EXISTS production_operations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  operation_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED')),

  -- Tempos
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Recursos
  assigned_to TEXT,
  workstation TEXT,
  required_skills TEXT, -- JSON array

  -- Qualidade
  quality_check_required BOOLEAN DEFAULT FALSE,
  quality_status TEXT CHECK (quality_status IN ('PENDING', 'PASSED', 'FAILED', 'WAIVED')),
  quality_notes TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Controle de Qualidade da Produção
CREATE TABLE IF NOT EXISTS production_quality_checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  production_operation_id TEXT REFERENCES production_operations(id),
  check_type TEXT CHECK (check_type IN ('IN_PROCESS', 'FINAL', 'FIRST_ARTICLE', 'RANDOM')),
  check_date TIMESTAMPTZ DEFAULT NOW(),
  checked_by TEXT,

  -- Resultados
  quantity_checked INTEGER,
  quantity_passed INTEGER,
  quantity_failed INTEGER,
  defect_rate DECIMAL(5,2),

  -- Defeitos
  defects_found TEXT, -- JSON array de defeitos
  corrective_actions TEXT,

  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'WAIVED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de Tempos de Produção
CREATE TABLE IF NOT EXISTS production_time_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  production_operation_id TEXT REFERENCES production_operations(id),
  user_id TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  activity_type TEXT CHECK (activity_type IN ('SETUP', 'PRODUCTION', 'QUALITY_CHECK', 'REWORK', 'DOWNTIME')),
  downtime_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apontamento de Produção (registro de quantidade produzida)
CREATE TABLE IF NOT EXISTS production_reportings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  reporting_date TIMESTAMPTZ DEFAULT NOW(),
  quantity_produced INTEGER NOT NULL CHECK (quantity_produced >= 0),
  quantity_scrapped INTEGER DEFAULT 0,
  scrap_reason TEXT,
  reported_by TEXT,
  shift TEXT, -- Turno de trabalho
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_priority ON production_orders(priority);
CREATE INDEX IF NOT EXISTS idx_production_orders_dates ON production_orders(planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_production_material_consumption_po ON production_material_consumption(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_material_consumption_product ON production_material_consumption(product_id);
CREATE INDEX IF NOT EXISTS idx_production_operations_po ON production_operations(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_operations_status ON production_operations(status);
CREATE INDEX IF NOT EXISTS idx_production_quality_checks_po ON production_quality_checks(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_time_logs_po ON production_time_logs(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_reportings_po ON production_reportings(production_order_id);

-- Triggers
CREATE TRIGGER trg_production_orders_updated_at
BEFORE UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_production_operations_updated_at
BEFORE UPDATE ON production_operations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Function para atualizar quantidade produzida
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

CREATE TRIGGER trg_update_production_quantities
AFTER INSERT OR UPDATE ON production_reportings
FOR EACH ROW
EXECUTE FUNCTION update_production_order_quantities();

-- Function para consumir materiais e atualizar estoque
CREATE OR REPLACE FUNCTION consume_production_materials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_consumed > OLD.quantity_consumed THEN
    -- Reduz o estoque
    UPDATE products
    SET current_stock = current_stock - (NEW.quantity_consumed - OLD.quantity_consumed)
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consume_materials
AFTER UPDATE OF quantity_consumed ON production_material_consumption
FOR EACH ROW
EXECUTE FUNCTION consume_production_materials();

-- Function para adicionar produtos finais ao estoque ao completar produção
CREATE OR REPLACE FUNCTION add_finished_goods_to_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    UPDATE products
    SET current_stock = current_stock + NEW.quantity_produced
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_add_finished_goods
AFTER UPDATE OF status ON production_orders
FOR EACH ROW
EXECUTE FUNCTION add_finished_goods_to_stock();

-- Function para reservar componentes ao liberar ordem de produção
CREATE OR REPLACE FUNCTION reserve_components_for_production()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'RELEASED' AND OLD.status != 'RELEASED' THEN
    -- Cria reservas para todos os componentes necessários
    INSERT INTO stock_reservations (product_id, quantity, reserved_for_type, reserved_for_id, reason)
    SELECT
      pmc.product_id,
      pmc.quantity_planned,
      'PRODUCTION_ORDER',
      NEW.id,
      'Reservado para ordem de produção ' || NEW.order_number
    FROM production_material_consumption pmc
    WHERE pmc.production_order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserve_components
AFTER UPDATE OF status ON production_orders
FOR EACH ROW
EXECUTE FUNCTION reserve_components_for_production();

-- Comentários
COMMENT ON TABLE production_orders IS 'Ordens de produção de produtos finais';
COMMENT ON TABLE production_material_consumption IS 'Consumo de componentes na produção';
COMMENT ON TABLE production_operations IS 'Operações/etapas do processo de produção';
COMMENT ON TABLE production_quality_checks IS 'Controle de qualidade durante e após produção';
COMMENT ON TABLE production_time_logs IS 'Registro de tempos de produção por operador';
COMMENT ON TABLE production_reportings IS 'Apontamentos de quantidade produzida';
