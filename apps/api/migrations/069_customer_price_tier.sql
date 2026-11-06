-- 069: Tabela de preço por cliente
--
-- customers.price_tier:
--   RETAIL    = Varejo (products.sale_price) — padrão
--   WHOLESALE = Atacado (products.wholesale_price; sem atacado → varejo)
--   SPECIAL   = Especial: varejo ± price_adjustment_pct (%), arredondado
--               (PYG para Gs. 100; BRL/USD para o centavo)
-- A regra fica em packages/shared-types/src/models/pricing.ts (web) e é
-- replicada no PDV (apps/api/src/services/pos.service.ts).
--
-- Carga inicial (decisão do usuário): clientes com RUC → Atacado.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS price_tier VARCHAR(10) NOT NULL DEFAULT 'RETAIL';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS price_adjustment_pct NUMERIC(6,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_price_tier_check') THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_price_tier_check CHECK (price_tier IN ('RETAIL', 'WHOLESALE', 'SPECIAL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_price_adjustment_pct_check') THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_price_adjustment_pct_check CHECK (price_adjustment_pct IS NULL OR price_adjustment_pct BETWEEN -90 AND 300);
  END IF;
END $$;

UPDATE customers
   SET price_tier = 'WHOLESALE', updated_at = NOW()
 WHERE COALESCE(TRIM(ruc), '') <> ''
   AND price_tier = 'RETAIL'
   AND id <> 'cust-consumidor-final';
