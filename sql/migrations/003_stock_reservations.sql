-- ============================================================================
-- Migration 002: Stock Reservations (Fase 1B)
-- ============================================================================
-- Criado: 2025-01-16
-- Descrição: Sistema de reservas de estoque para produção
--
-- Permite reservar componentes para ordens de produção futuras,
-- evitando venda/uso de estoque já comprometido.
-- ============================================================================

-- Tabela de reservas de estoque
CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_for_type TEXT NOT NULL CHECK (reserved_for_type IN ('PRODUCTION_ORDER', 'SERVICE_ORDER', 'QUOTE', 'MANUAL')),
  reserved_for_id TEXT, -- ID da ordem/orçamento relacionado
  reserved_by TEXT, -- Usuário que criou a reserva
  reason TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSUMED', 'CANCELLED', 'EXPIRED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_type ON stock_reservations(reserved_for_type, reserved_for_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status = 'ACTIVE';

-- Adicionar campos de estoque disponível/reservado na tabela products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0);

-- Comentários
COMMENT ON TABLE stock_reservations IS 'Reservas de estoque para produção, ordens de serviço e orçamentos';
COMMENT ON COLUMN stock_reservations.reserved_for_type IS 'Tipo de entidade: PRODUCTION_ORDER, SERVICE_ORDER, QUOTE, MANUAL';
COMMENT ON COLUMN stock_reservations.status IS 'ACTIVE: ativa | CONSUMED: consumida | CANCELLED: cancelada | EXPIRED: expirada';
COMMENT ON COLUMN products.reserved_stock IS 'Quantidade de estoque reservado (não disponível para venda)';

-- Function para calcular estoque disponível (current_stock - reserved_stock)
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

-- Trigger para atualizar reserved_stock automaticamente
CREATE OR REPLACE FUNCTION update_reserved_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcula o reserved_stock do produto
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

CREATE TRIGGER trg_update_reserved_stock
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW
EXECUTE FUNCTION update_reserved_stock();
