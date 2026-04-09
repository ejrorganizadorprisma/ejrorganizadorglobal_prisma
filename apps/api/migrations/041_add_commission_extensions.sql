-- Migration: Extensões do sistema de comissão
--
-- Modelo atual: seller_commission_configs tem commission_on_sales e
-- commission_on_collections (percentuais fixos por vendedor). Mantemos isso
-- intacto e adicionamos 2 recursos:
--
-- 1. Comissão sobre venda POR PRODUTO
--    Quando commission_by_product = true no cadastro do vendedor, a comissão
--    sobre venda é calculada por item usando products.commission_rate em vez
--    do percentual fixo commission_on_sales. Se qualquer produto da venda não
--    tiver commission_rate definido, o faturamento é bloqueado (regra de
--    negócio: força admin a configurar todos os produtos relevantes).
--
-- 2. Rastreabilidade do modo de cálculo em cada lançamento
--    commission_entries.calculation_mode armazena qual regra foi aplicada no
--    momento da criação, para histórico e relatórios consistentes mesmo que
--    a configuração do vendedor mude depois.

-- (1) Flag por vendedor
ALTER TABLE seller_commission_configs
  ADD COLUMN IF NOT EXISTS commission_by_product BOOLEAN NOT NULL DEFAULT false;

-- (2) Percentual por produto (opcional)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);

-- (3) Modo de cálculo registrado em cada lançamento
-- Valores possíveis: 'SALE_FIXED' | 'SALE_BY_PRODUCT' | 'COLLECTION'
ALTER TABLE commission_entries
  ADD COLUMN IF NOT EXISTS calculation_mode VARCHAR(20);

-- Backfill: lançamentos antigos ficam marcados conforme seu source_type
UPDATE commission_entries
   SET calculation_mode = CASE
     WHEN source_type = 'SALE'       THEN 'SALE_FIXED'
     WHEN source_type = 'COLLECTION' THEN 'COLLECTION'
     ELSE calculation_mode
   END
 WHERE calculation_mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_commission_entries_calculation_mode
  ON commission_entries(calculation_mode)
  WHERE calculation_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_commission_rate
  ON products(commission_rate)
  WHERE commission_rate IS NOT NULL;
