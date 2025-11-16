-- ============================================================================
-- MIGRAÇÕES COMPLETAS - SISTEMA DE MANUFATURA
-- ============================================================================
-- Criado: 2025-01-16
-- Descrição: Todas as migrações do sistema de manufatura consolidadas
--
-- IMPORTANTE: Execute este arquivo no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- Migration 002: Base BOM System
-- ============================================================================
-- Sistema básico de BOM (Bill of Materials)
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

-- Function para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at (apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bom_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_bom_items_updated_at
    BEFORE UPDATE ON bom_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================================
-- Migration 003: Stock Reservations (Fase 1B)
-- ============================================================================
-- Sistema de reservas de estoque para produção
-- ============================================================================

-- Tabela de reservas de estoque
CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_for_type TEXT NOT NULL CHECK (reserved_for_type IN ('PRODUCTION_ORDER', 'SERVICE_ORDER', 'QUOTE', 'MANUAL')),
  reserved_for_id TEXT,
  reserved_by TEXT,
  reason TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSUMED', 'CANCELLED', 'EXPIRED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_type ON stock_reservations(reserved_for_type, reserved_for_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status = 'ACTIVE';

-- Adicionar campo de estoque reservado
ALTER TABLE products
ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0);

-- Comentários
COMMENT ON TABLE stock_reservations IS 'Reservas de estoque para produção, ordens de serviço e orçamentos';
COMMENT ON COLUMN stock_reservations.reserved_for_type IS 'Tipo de entidade: PRODUCTION_ORDER, SERVICE_ORDER, QUOTE, MANUAL';
COMMENT ON COLUMN stock_reservations.status IS 'ACTIVE: ativa | CONSUMED: consumida | CANCELLED: cancelada | EXPIRED: expirada';
COMMENT ON COLUMN products.reserved_stock IS 'Quantidade de estoque reservado (não disponível para venda)';

-- Function para calcular estoque disponível
CREATE OR REPLACE FUNCTION get_available_stock(p_product_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_current INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT current_stock, reserved_stock
  INTO v_current, v_reserved
  FROM products
  WHERE id = p_product_id;

  RETURN COALESCE(v_current, 0) - COALESCE(v_reserved, 0);
END;
$$ LANGUAGE plpgsql;

-- Function para atualizar reserved_stock
CREATE OR REPLACE FUNCTION update_reserved_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET reserved_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM stock_reservations
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND status = 'ACTIVE'
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar reserved_stock
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_reserved_stock'
  ) THEN
    CREATE TRIGGER trg_update_reserved_stock
    AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_reserved_stock();
  END IF;
END $$;

-- ============================================================================
-- Migration 004: BOM Expansion (Fase 2)
-- ============================================================================
-- Expansão do sistema BOM
-- ============================================================================

-- Expandir bom_items
ALTER TABLE bom_items
ADD COLUMN IF NOT EXISTS scrap_percentage DECIMAL(5,2) DEFAULT 0 CHECK (scrap_percentage >= 0 AND scrap_percentage <= 100),
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS position INTEGER,
ADD COLUMN IF NOT EXISTS reference_designator TEXT;

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
  required_tools TEXT,
  safety_notes TEXT,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de BOMs alternativos
CREATE TABLE IF NOT EXISTS bom_alternatives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bom_item_id TEXT NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
  alternative_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
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

-- Function para calcular custo do BOM
CREATE OR REPLACE FUNCTION calculate_bom_cost_with_scrap(p_product_id TEXT, p_version_id TEXT DEFAULT NULL)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT bi.quantity, bi.scrap_percentage, p.cost_price
    FROM bom_items bi
    JOIN products p ON p.id = bi.component_id
    WHERE bi.product_id = p_product_id
      AND (p_version_id IS NULL OR bi.bom_version_id = p_version_id)
      AND bi.is_optional = FALSE
  LOOP
    v_total := v_total + (v_item.quantity * (1 + (v_item.scrap_percentage / 100)) * v_item.cost_price);
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bom_versions_updated_at') THEN
    CREATE TRIGGER trg_bom_versions_updated_at
    BEFORE UPDATE ON bom_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assembly_instructions_updated_at') THEN
    CREATE TRIGGER trg_assembly_instructions_updated_at
    BEFORE UPDATE ON assembly_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================================
-- Migration 005: Purchase Management (Fase 3)
-- ============================================================================
-- Sistema de gestão de compras
-- ============================================================================

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 0,
  minimum_order_value INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Endereços de fornecedores
CREATE TABLE IF NOT EXISTS supplier_addresses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('BILLING', 'SHIPPING', 'BOTH')),
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'BR',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contatos de fornecedores
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relação Produto-Fornecedor
CREATE TABLE IF NOT EXISTS product_suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  unit_price INTEGER NOT NULL,
  minimum_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 0,
  is_preferred BOOLEAN DEFAULT FALSE,
  last_purchase_price INTEGER,
  last_purchase_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, supplier_id)
);

-- Ordens de Compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED')),
  order_date TIMESTAMPTZ DEFAULT NOW(),
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  subtotal INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  shipping_cost INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  payment_terms TEXT,
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
  shipping_address_id TEXT REFERENCES supplier_addresses(id),
  notes TEXT,
  internal_notes TEXT,
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Ordem de Compra
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  total_price INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  quantity_pending INTEGER GENERATED ALWAYS AS (quantity - quantity_received) STORED,
  expected_delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recebimentos de Mercadorias
CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  receipt_number TEXT UNIQUE NOT NULL,
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  receipt_date TIMESTAMPTZ DEFAULT NOW(),
  invoice_number TEXT,
  invoice_date TIMESTAMPTZ,
  invoice_amount INTEGER,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INSPECTED', 'APPROVED', 'REJECTED', 'RETURNED')),
  quality_check_status TEXT CHECK (quality_check_status IN ('PENDING', 'PASSED', 'FAILED', 'PARTIAL')),
  inspected_by TEXT,
  inspected_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens Recebidos
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id TEXT REFERENCES purchase_order_items(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity_ordered INTEGER,
  quantity_received INTEGER NOT NULL CHECK (quantity_received >= 0),
  quantity_accepted INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,
  unit_price INTEGER,
  quality_status TEXT CHECK (quality_status IN ('PENDING', 'APPROVED', 'REJECTED', 'QUARANTINE')),
  rejection_reason TEXT,
  lot_number TEXT,
  expiry_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_supplier ON goods_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts(status);

-- Comentários
COMMENT ON TABLE suppliers IS 'Fornecedores de componentes e materiais';
COMMENT ON TABLE product_suppliers IS 'Relação produto-fornecedor com preços e lead times';
COMMENT ON TABLE purchase_orders IS 'Ordens de compra enviadas a fornecedores';
COMMENT ON TABLE goods_receipts IS 'Recebimentos de mercadorias';

-- Functions
CREATE OR REPLACE FUNCTION update_stock_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_accepted > 0 THEN
    UPDATE products
    SET current_stock = current_stock + NEW.quantity_accepted
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_po_item_received_qty()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_order_items
  SET quantity_received = quantity_received + NEW.quantity_accepted
  WHERE id = NEW.purchase_order_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_suppliers_updated_at') THEN
    CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_suppliers_updated_at') THEN
    CREATE TRIGGER trg_product_suppliers_updated_at BEFORE UPDATE ON product_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_purchase_orders_updated_at') THEN
    CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goods_receipts_updated_at') THEN
    CREATE TRIGGER trg_goods_receipts_updated_at BEFORE UPDATE ON goods_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_stock_on_receipt') THEN
    CREATE TRIGGER trg_update_stock_on_receipt AFTER INSERT OR UPDATE OF quantity_accepted ON goods_receipt_items FOR EACH ROW EXECUTE FUNCTION update_stock_on_receipt();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_po_item_received_qty') THEN
    CREATE TRIGGER trg_update_po_item_received_qty AFTER INSERT OR UPDATE OF quantity_accepted ON goods_receipt_items FOR EACH ROW WHEN (NEW.purchase_order_item_id IS NOT NULL) EXECUTE FUNCTION update_po_item_received_qty();
  END IF;
END $$;

-- ============================================================================
-- Migration 006: Production Orders (Fase 4)
-- ============================================================================
-- Sistema de ordens de produção
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
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'CLOSED')),
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

-- Consumo de Materiais
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

-- Operações de Produção
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

-- Controle de Qualidade
CREATE TABLE IF NOT EXISTS production_quality_checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  production_operation_id TEXT REFERENCES production_operations(id),
  check_type TEXT CHECK (check_type IN ('IN_PROCESS', 'FINAL', 'FIRST_ARTICLE', 'RANDOM')),
  check_date TIMESTAMPTZ DEFAULT NOW(),
  checked_by TEXT,
  quantity_checked INTEGER,
  quantity_passed INTEGER,
  quantity_failed INTEGER,
  defect_rate DECIMAL(5,2),
  defects_found TEXT,
  corrective_actions TEXT,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'WAIVED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tempos de Produção
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

-- Apontamentos de Produção
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
CREATE INDEX IF NOT EXISTS idx_production_orders_dates ON production_orders(planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_production_material_consumption_po ON production_material_consumption(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_operations_po ON production_operations(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_quality_checks_po ON production_quality_checks(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_time_logs_po ON production_time_logs(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_reportings_po ON production_reportings(production_order_id);

-- Comentários
COMMENT ON TABLE production_orders IS 'Ordens de produção de produtos finais';
COMMENT ON TABLE production_material_consumption IS 'Consumo de componentes na produção';
COMMENT ON TABLE production_operations IS 'Operações/etapas do processo de produção';

-- Functions
CREATE OR REPLACE FUNCTION update_production_order_quantities()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE production_orders
  SET
    quantity_produced = (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_reportings WHERE production_order_id = NEW.production_order_id),
    quantity_scrapped = (SELECT COALESCE(SUM(quantity_scrapped), 0) FROM production_reportings WHERE production_order_id = NEW.production_order_id)
  WHERE id = NEW.production_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION consume_production_materials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_consumed > OLD.quantity_consumed THEN
    UPDATE products SET current_stock = current_stock - (NEW.quantity_consumed - OLD.quantity_consumed) WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_finished_goods_to_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity_produced WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reserve_components_for_production()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'RELEASED' AND OLD.status != 'RELEASED' THEN
    INSERT INTO stock_reservations (product_id, quantity, reserved_for_type, reserved_for_id, reason)
    SELECT pmc.product_id, pmc.quantity_planned, 'PRODUCTION_ORDER', NEW.id, 'Reservado para OP ' || NEW.order_number
    FROM production_material_consumption pmc WHERE pmc.production_order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_production_orders_updated_at') THEN
    CREATE TRIGGER trg_production_orders_updated_at BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_production_operations_updated_at') THEN
    CREATE TRIGGER trg_production_operations_updated_at BEFORE UPDATE ON production_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_production_quantities') THEN
    CREATE TRIGGER trg_update_production_quantities AFTER INSERT OR UPDATE ON production_reportings FOR EACH ROW EXECUTE FUNCTION update_production_order_quantities();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_consume_materials') THEN
    CREATE TRIGGER trg_consume_materials AFTER UPDATE OF quantity_consumed ON production_material_consumption FOR EACH ROW EXECUTE FUNCTION consume_production_materials();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_add_finished_goods') THEN
    CREATE TRIGGER trg_add_finished_goods AFTER UPDATE OF status ON production_orders FOR EACH ROW EXECUTE FUNCTION add_finished_goods_to_stock();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reserve_components') THEN
    CREATE TRIGGER trg_reserve_components AFTER UPDATE OF status ON production_orders FOR EACH ROW EXECUTE FUNCTION reserve_components_for_production();
  END IF;
END $$;

-- ============================================================================
-- FIM DAS MIGRAÇÕES
-- ============================================================================
