-- Migration: Adicionar nome e referência à requisição de compra nas Ordens de Compra
-- Data: 2025-12-08

-- Adiciona campo 'name' para dar um título/nome à ordem de compra
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS name TEXT;

-- Adiciona campo 'purchase_request_id' para relacionar com a requisição de origem
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS purchase_request_id TEXT REFERENCES purchase_requests(id) ON DELETE SET NULL;

-- Cria índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_purchase_orders_name ON purchase_orders(name);

-- Cria índice para busca por requisição de origem
CREATE INDEX IF NOT EXISTS idx_purchase_orders_purchase_request_id ON purchase_orders(purchase_request_id);

-- Comentário explicativo
COMMENT ON COLUMN purchase_orders.name IS 'Nome/título da ordem de compra para identificação rápida';
COMMENT ON COLUMN purchase_orders.purchase_request_id IS 'Referência à requisição de compra que originou esta OC';
