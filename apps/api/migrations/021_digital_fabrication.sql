-- ============================================
-- MÓDULO DE FABRICAÇÃO DIGITAL (3D e LASER)
-- ============================================

-- Tipos de máquina
CREATE TYPE fabrication_machine_type AS ENUM ('PRINTER_3D', 'LASER_CUTTER');

-- Status dos lotes de fabricação
CREATE TYPE fabrication_job_status AS ENUM (
  'DRAFT',        -- Rascunho
  'QUEUED',       -- Na fila
  'IN_PROGRESS',  -- Em execução
  'PAUSED',       -- Pausado
  'COMPLETED',    -- Concluído
  'FAILED',       -- Falhou
  'CANCELLED'     -- Cancelado
);

-- Tipos de material
CREATE TYPE material_type AS ENUM (
  -- Filamentos 3D
  'PLA', 'ABS', 'PETG', 'TPU', 'NYLON', 'ASA', 'PC', 'PVA', 'HIPS',
  'WOOD', 'CARBON_FIBER', 'OTHER_FILAMENT',
  -- Materiais Laser
  'MDF_3MM', 'MDF_6MM', 'MDF_9MM', 'MDF_12MM', 'MDF_15MM',
  'ACRYLIC_2MM', 'ACRYLIC_3MM', 'ACRYLIC_5MM', 'ACRYLIC_10MM',
  'PLYWOOD_3MM', 'PLYWOOD_6MM', 'CARDBOARD', 'LEATHER', 'FABRIC',
  'PAPER', 'EVA', 'CORK', 'OTHER_LASER'
);

-- Unidades de medida para materiais
CREATE TYPE material_unit AS ENUM (
  'GRAMS',      -- Gramas
  'KILOGRAMS',  -- Quilogramas
  'METERS_SQ',  -- Metros quadrados
  'CM_SQ',      -- Centímetros quadrados
  'METERS',     -- Metros lineares
  'UNITS'       -- Unidades (chapas, etc)
);

-- ============================================
-- TABELA: MÁQUINAS DE FABRICAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS fabrication_machines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  type fabrication_machine_type NOT NULL,
  model VARCHAR(100),
  brand VARCHAR(100),
  build_volume_x DECIMAL(10, 2),  -- mm
  build_volume_y DECIMAL(10, 2),  -- mm
  build_volume_z DECIMAL(10, 2),  -- mm (para 3D)
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: LOTES DE FABRICAÇÃO DIGITAL
-- ============================================

CREATE TABLE IF NOT EXISTS digital_fabrication_batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  machine_type fabrication_machine_type NOT NULL,
  machine_id TEXT REFERENCES fabrication_machines(id),
  status fabrication_job_status DEFAULT 'DRAFT',

  -- Datas
  planned_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Responsáveis
  created_by TEXT NOT NULL REFERENCES users(id),
  operator_id TEXT REFERENCES users(id),

  -- Totais (calculados/atualizados por triggers ou aplicação)
  total_material_planned DECIMAL(12, 4) DEFAULT 0,
  total_material_used DECIMAL(12, 4) DEFAULT 0,
  total_material_wasted DECIMAL(12, 4) DEFAULT 0,
  material_unit material_unit DEFAULT 'GRAMS',

  total_items_planned INTEGER DEFAULT 0,
  total_items_produced INTEGER DEFAULT 0,
  total_items_failed INTEGER DEFAULT 0,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para lotes
CREATE INDEX idx_digital_fab_batches_status ON digital_fabrication_batches(status);
CREATE INDEX idx_digital_fab_batches_machine_type ON digital_fabrication_batches(machine_type);
CREATE INDEX idx_digital_fab_batches_created_at ON digital_fabrication_batches(created_at DESC);
CREATE INDEX idx_digital_fab_batches_operator ON digital_fabrication_batches(operator_id);

-- ============================================
-- TABELA: ITENS DO LOTE DE FABRICAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS digital_fabrication_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id TEXT NOT NULL REFERENCES digital_fabrication_batches(id) ON DELETE CASCADE,

  -- Produto (opcional - se existir no cadastro)
  product_id TEXT REFERENCES products(id),
  item_name VARCHAR(200) NOT NULL,
  file_name VARCHAR(255),

  -- Quantidades
  quantity_planned INTEGER NOT NULL DEFAULT 1,
  quantity_produced INTEGER DEFAULT 0,
  quantity_failed INTEGER DEFAULT 0,

  -- Material
  material_type material_type NOT NULL,
  material_product_id TEXT REFERENCES products(id),  -- Produto do estoque (filamento, MDF)
  material_planned DECIMAL(12, 4) DEFAULT 0,         -- Material por unidade
  material_used DECIMAL(12, 4) DEFAULT 0,
  material_unit material_unit NOT NULL,

  -- Para Laser - dimensões em mm
  cut_width DECIMAL(10, 2),
  cut_height DECIMAL(10, 2),
  cut_area_per_unit DECIMAL(12, 4),  -- Área calculada em cm² ou m²

  -- Para 3D - tempo
  print_time_minutes INTEGER,
  actual_print_time_minutes INTEGER,

  -- Configurações (JSON para flexibilidade)
  print_settings JSONB,  -- layer_height, infill, walls, supports, temps, speed
  laser_settings JSONB,  -- power, speed, passes, focus

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para itens
CREATE INDEX idx_digital_fab_items_batch ON digital_fabrication_items(batch_id);
CREATE INDEX idx_digital_fab_items_product ON digital_fabrication_items(product_id);
CREATE INDEX idx_digital_fab_items_material_product ON digital_fabrication_items(material_product_id);

-- ============================================
-- TABELA: CONSUMO DE MATERIAL
-- ============================================

CREATE TABLE IF NOT EXISTS fabrication_material_consumption (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id TEXT NOT NULL REFERENCES digital_fabrication_batches(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES digital_fabrication_items(id) ON DELETE SET NULL,

  material_product_id TEXT NOT NULL REFERENCES products(id),
  quantity_consumed DECIMAL(12, 4) NOT NULL DEFAULT 0,
  quantity_wasted DECIMAL(12, 4) DEFAULT 0,
  unit material_unit NOT NULL,

  consumed_by TEXT NOT NULL REFERENCES users(id),
  consumed_at TIMESTAMPTZ DEFAULT NOW(),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consumo
CREATE INDEX idx_fab_consumption_batch ON fabrication_material_consumption(batch_id);
CREATE INDEX idx_fab_consumption_material ON fabrication_material_consumption(material_product_id);
CREATE INDEX idx_fab_consumption_date ON fabrication_material_consumption(consumed_at DESC);

-- ============================================
-- TABELA: HISTÓRICO DE FABRICAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS digital_fabrication_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id TEXT NOT NULL REFERENCES digital_fabrication_batches(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES digital_fabrication_items(id) ON DELETE SET NULL,

  action VARCHAR(50) NOT NULL,  -- STARTED, PAUSED, RESUMED, COMPLETED, FAILED, CANCELLED, MATERIAL_CONSUMED
  previous_status VARCHAR(50),
  new_status VARCHAR(50),

  details JSONB,  -- Detalhes extras

  performed_by TEXT NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX idx_fab_history_batch ON digital_fabrication_history(batch_id);
CREATE INDEX idx_fab_history_action ON digital_fabrication_history(action);
CREATE INDEX idx_fab_history_date ON digital_fabrication_history(performed_at DESC);

-- ============================================
-- FUNÇÃO: Gerar número do lote de fabricação
-- ============================================

CREATE OR REPLACE FUNCTION generate_fabrication_batch_number(p_machine_type fabrication_machine_type)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_batch_number VARCHAR(50);
BEGIN
  -- Define o prefixo baseado no tipo
  IF p_machine_type = 'PRINTER_3D' THEN
    v_prefix := '3D';
  ELSE
    v_prefix := 'LASER';
  END IF;

  v_year := EXTRACT(YEAR FROM NOW())::VARCHAR;

  -- Busca o próximo número na sequência para este ano e tipo
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(batch_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM digital_fabrication_batches
  WHERE machine_type = p_machine_type
    AND batch_number LIKE v_prefix || '-' || v_year || '-%';

  v_batch_number := v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 4, '0');

  RETURN v_batch_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Gerar número do lote automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION trigger_generate_fabrication_batch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
    NEW.batch_number := generate_fabrication_batch_number(NEW.machine_type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_fabrication_batch_number
  BEFORE INSERT ON digital_fabrication_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_fabrication_batch_number();

-- ============================================
-- TRIGGER: Atualizar updated_at
-- ============================================

CREATE TRIGGER trg_digital_fab_batches_updated_at
  BEFORE UPDATE ON digital_fabrication_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_digital_fab_items_updated_at
  BEFORE UPDATE ON digital_fabrication_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fabrication_machines_updated_at
  BEFORE UPDATE ON fabrication_machines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO: Calcular área de corte
-- ============================================

CREATE OR REPLACE FUNCTION calculate_cut_area_cm2(width_mm DECIMAL, height_mm DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (width_mm / 10) * (height_mm / 10);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Calcular área de corte automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION trigger_calculate_cut_area()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cut_width IS NOT NULL AND NEW.cut_height IS NOT NULL THEN
    NEW.cut_area_per_unit := calculate_cut_area_cm2(NEW.cut_width, NEW.cut_height);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_cut_area
  BEFORE INSERT OR UPDATE ON digital_fabrication_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_cut_area();

-- ============================================
-- FUNÇÃO: Atualizar totais do lote
-- ============================================

CREATE OR REPLACE FUNCTION update_fabrication_batch_totals(p_batch_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_items_planned INTEGER;
  v_items_produced INTEGER;
  v_items_failed INTEGER;
  v_material_planned DECIMAL;
  v_material_used DECIMAL;
  v_material_wasted DECIMAL;
BEGIN
  -- Calcular totais dos itens
  SELECT
    COALESCE(SUM(quantity_planned), 0),
    COALESCE(SUM(quantity_produced), 0),
    COALESCE(SUM(quantity_failed), 0),
    COALESCE(SUM(material_planned * quantity_planned), 0),
    COALESCE(SUM(material_used), 0)
  INTO v_items_planned, v_items_produced, v_items_failed, v_material_planned, v_material_used
  FROM digital_fabrication_items
  WHERE batch_id = p_batch_id;

  -- Calcular desperdício total do consumo
  SELECT COALESCE(SUM(quantity_wasted), 0)
  INTO v_material_wasted
  FROM fabrication_material_consumption
  WHERE batch_id = p_batch_id;

  -- Atualizar o lote
  UPDATE digital_fabrication_batches
  SET
    total_items_planned = v_items_planned,
    total_items_produced = v_items_produced,
    total_items_failed = v_items_failed,
    total_material_planned = v_material_planned,
    total_material_used = v_material_used,
    total_material_wasted = v_material_wasted,
    updated_at = NOW()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Atualizar totais do lote quando item é alterado
-- ============================================

CREATE OR REPLACE FUNCTION trigger_update_batch_totals_on_item()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_fabrication_batch_totals(OLD.batch_id);
    RETURN OLD;
  ELSE
    PERFORM update_fabrication_batch_totals(NEW.batch_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_batch_totals_on_item
  AFTER INSERT OR UPDATE OR DELETE ON digital_fabrication_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_batch_totals_on_item();

CREATE OR REPLACE FUNCTION trigger_update_batch_totals_on_consumption()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_fabrication_batch_totals(OLD.batch_id);
    RETURN OLD;
  ELSE
    PERFORM update_fabrication_batch_totals(NEW.batch_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_batch_totals_on_consumption
  AFTER INSERT OR UPDATE OR DELETE ON fabrication_material_consumption
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_batch_totals_on_consumption();

-- ============================================
-- HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE fabrication_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_fabrication_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_fabrication_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrication_material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_fabrication_history ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (permite tudo)
CREATE POLICY "Service role full access on fabrication_machines"
  ON fabrication_machines FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on digital_fabrication_batches"
  ON digital_fabrication_batches FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on digital_fabrication_items"
  ON digital_fabrication_items FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on fabrication_material_consumption"
  ON fabrication_material_consumption FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on digital_fabrication_history"
  ON digital_fabrication_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Nota: A permissão 'digital_fabrication' é gerenciada no código TypeScript (AppPage enum)

-- ============================================
-- INSERIR MÁQUINAS PADRÃO (OPCIONAL)
-- ============================================

INSERT INTO fabrication_machines (name, type, brand, model, build_volume_x, build_volume_y, build_volume_z, is_active, notes)
VALUES
  ('Impressora 3D Principal', 'PRINTER_3D', 'Creality', 'Ender 3 Pro', 220, 220, 250, true, 'Impressora 3D FDM principal'),
  ('Cortadora Laser', 'LASER_CUTTER', 'K40', '40W CO2', 300, 200, NULL, true, 'Cortadora laser CO2 40W')
ON CONFLICT DO NOTHING;

-- Confirmação
SELECT 'Módulo de Fabricação Digital criado com sucesso!' as resultado;
