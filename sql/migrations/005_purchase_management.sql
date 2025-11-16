-- ============================================================================
-- Migration 004: Purchase Management (Fase 3)
-- ============================================================================
-- Criado: 2025-01-16
-- Descrição: Sistema completo de gestão de compras
--
-- Funcionalidades:
-- - Ordens de compra (purchase orders)
-- - Cotações de fornecedores
-- - Recebimento de mercadorias
-- - Relação produto-fornecedor
-- ============================================================================

-- Tabela de fornecedores (suppliers) - expandir a existente ou criar
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT, -- CNPJ/CPF
  email TEXT,
  phone TEXT,
  website TEXT,
  payment_terms TEXT, -- Ex: "30 dias", "à vista"
  lead_time_days INTEGER DEFAULT 0,
  minimum_order_value INTEGER DEFAULT 0, -- em centavos
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
  supplier_sku TEXT, -- Código do produto no fornecedor
  unit_price INTEGER NOT NULL, -- em centavos
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
  subtotal INTEGER DEFAULT 0, -- em centavos
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
  unit_price INTEGER NOT NULL, -- em centavos
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  total_price INTEGER NOT NULL, -- em centavos
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
  invoice_amount INTEGER, -- em centavos
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
  unit_price INTEGER, -- em centavos
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

-- Triggers para atualizar updated_at
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_product_suppliers_updated_at
BEFORE UPDATE ON product_suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_goods_receipts_updated_at
BEFORE UPDATE ON goods_receipts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Function para atualizar estoque ao receber mercadorias
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

CREATE TRIGGER trg_update_stock_on_receipt
AFTER INSERT OR UPDATE OF quantity_accepted ON goods_receipt_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_receipt();

-- Function para atualizar quantidade recebida no purchase_order_item
CREATE OR REPLACE FUNCTION update_po_item_received_qty()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_order_items
  SET quantity_received = quantity_received + NEW.quantity_accepted
  WHERE id = NEW.purchase_order_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_po_item_received_qty
AFTER INSERT OR UPDATE OF quantity_accepted ON goods_receipt_items
FOR EACH ROW
WHEN (NEW.purchase_order_item_id IS NOT NULL)
EXECUTE FUNCTION update_po_item_received_qty();

-- Comentários
COMMENT ON TABLE suppliers IS 'Fornecedores de componentes e materiais';
COMMENT ON TABLE product_suppliers IS 'Relação produto-fornecedor com preços e lead times';
COMMENT ON TABLE purchase_orders IS 'Ordens de compra enviadas a fornecedores';
COMMENT ON TABLE purchase_order_items IS 'Itens das ordens de compra';
COMMENT ON TABLE goods_receipts IS 'Recebimentos de mercadorias';
COMMENT ON TABLE goods_receipt_items IS 'Itens recebidos com controle de qualidade';
