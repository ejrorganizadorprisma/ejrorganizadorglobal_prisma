-- ============================================
-- MIGRAÇÃO 002: Adicionar colunas faltantes na tabela suppliers
-- Data: 2025-11-16
-- Objetivo: Completar schema de fornecedores conforme PRD
-- ============================================

-- Adicionar colunas faltantes à tabela suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN suppliers.legal_name IS 'Razão social do fornecedor';
COMMENT ON COLUMN suppliers.tax_id IS 'CNPJ do fornecedor';
COMMENT ON COLUMN suppliers.website IS 'Website do fornecedor';
COMMENT ON COLUMN suppliers.payment_terms IS 'Condições de pagamento (ex: 30/60/90 dias)';
COMMENT ON COLUMN suppliers.lead_time_days IS 'Prazo de entrega em dias';
COMMENT ON COLUMN suppliers.minimum_order_value IS 'Valor mínimo de pedido';
COMMENT ON COLUMN suppliers.rating IS 'Avaliação do fornecedor (1-5 estrelas)';

-- Criar índice para busca por tax_id
CREATE INDEX IF NOT EXISTS suppliers_tax_id_idx ON suppliers(tax_id);

-- Criar índice para busca por legal_name
CREATE INDEX IF NOT EXISTS suppliers_legal_name_idx ON suppliers(legal_name);

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migração 002 executada com sucesso: Colunas adicionadas à tabela suppliers';
END $$;
