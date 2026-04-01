-- Migration: 014_supplier_orders.sql
-- Descrição: Cria estrutura para pedidos por fornecedor (agrupados a partir de ordens de compra)

-- 1. Adicionar supplier_id nos itens da ordem de compra (se não existir)
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL;

-- 2. Adicionar flag para definir fornecedor como padrão
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS set_as_preferred_supplier BOOLEAN DEFAULT FALSE;

-- 3. Criar tabela de pedidos por fornecedor (supplier_orders)
CREATE TABLE IF NOT EXISTS supplier_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_number TEXT UNIQUE NOT NULL,

  -- Fornecedor do pedido
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,

  -- Origem: Ordem de Compra
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,

  -- Código de grupo para identificar pedidos da mesma OC
  group_code TEXT NOT NULL,

  -- Status do pedido
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED')),

  -- Datas
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,

  -- Valores (em centavos)
  subtotal INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,

  -- Condições
  payment_terms TEXT,

  -- Observações
  notes TEXT,
  internal_notes TEXT,

  -- Auditoria
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Criar tabela de itens do pedido por fornecedor
CREATE TABLE IF NOT EXISTS supplier_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Referências
  supplier_order_id TEXT NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  purchase_order_item_id TEXT REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Quantidades
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0,
  quantity_pending INTEGER GENERATED ALWAYS AS (quantity - quantity_received) STORED,

  -- Valores (em centavos)
  unit_price INTEGER NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,

  -- Datas
  expected_delivery_date TIMESTAMPTZ,

  -- Observações
  notes TEXT,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_purchase_order_id ON supplier_orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_group_code ON supplier_orders(group_code);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_date ON supplier_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_supplier_order_items_supplier_order_id ON supplier_order_items(supplier_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_product_id ON supplier_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_supplier_id ON purchase_order_items(supplier_id);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_supplier_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_supplier_orders_updated_at ON supplier_orders;
CREATE TRIGGER trigger_supplier_orders_updated_at
  BEFORE UPDATE ON supplier_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_orders_updated_at();

-- 7. Habilitar RLS
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_items ENABLE ROW LEVEL SECURITY;

-- 8. Políticas de acesso (permitir tudo para usuários autenticados por enquanto)
DROP POLICY IF EXISTS supplier_orders_all ON supplier_orders;
CREATE POLICY supplier_orders_all ON supplier_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS supplier_order_items_all ON supplier_order_items;
CREATE POLICY supplier_order_items_all ON supplier_order_items FOR ALL USING (true) WITH CHECK (true);
