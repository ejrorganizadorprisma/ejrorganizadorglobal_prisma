-- ============================================
-- PURCHASE REQUESTS MODULE (Lista de Necessidades)
-- ============================================

-- Tabela principal de requisições de compra
CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requested_by TEXT NOT NULL REFERENCES users(id),
  department TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED')),
  justification TEXT,
  requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  converted_to_purchase_order_id TEXT REFERENCES purchase_orders(id),
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela de itens da requisição
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id TEXT PRIMARY KEY,
  purchase_request_id TEXT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2),
  estimated_total DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_by ON purchase_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_date ON purchase_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_purchase_request_id ON purchase_request_items(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_product_id ON purchase_request_items(product_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_purchase_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_requests_updated_at();

-- Função para gerar número de requisição
CREATE OR REPLACE FUNCTION generate_purchase_request_number()
RETURNS TEXT AS $$
DECLARE
  last_number TEXT;
  next_number INTEGER;
BEGIN
  SELECT request_number INTO last_number
  FROM purchase_requests
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_number IS NULL THEN
    RETURN 'REQ-000001';
  END IF;

  next_number := (regexp_match(last_number, 'REQ-(\d+)'))[1]::INTEGER + 1;
  RETURN 'REQ-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE purchase_requests IS 'Requisições de compra/necessidades solicitadas por funcionários';
COMMENT ON TABLE purchase_request_items IS 'Itens das requisições de compra';
COMMENT ON COLUMN purchase_requests.status IS 'PENDING: Aguardando aprovação, APPROVED: Aprovada, REJECTED: Rejeitada, CONVERTED: Convertida em OC, CANCELLED: Cancelada';
COMMENT ON COLUMN purchase_requests.priority IS 'Prioridade da requisição: LOW, NORMAL, HIGH, URGENT';
