-- Migration 042: Hardening de Pedidos de Venda
--
-- Mudanças:
--   1) Adiciona status temporário 'CONVERTING' ao enum SalesOrderStatus
--      (lock otimista usado em convertToSale para impedir corrida de faturamento)
--   2) Cria SEQUENCE sales_orders_seq para geração de order_number sem race condition
--   3) Adiciona CHECK constraints em sales_order_items (quantity > 0, prices >= 0)
--   4) Adiciona índice composto (status, created_at DESC) para listagens
--
-- Observações:
--   - SEQUENCE é GLOBAL crescente. Formato PED-YYYY-NNNN é mantido, mas a numeração
--     NÃO reinicia por ano (decisão consciente — garantir unicidade simples).
--   - O START WITH é calculado dinamicamente a partir do maior número existente +1.
--   - ALTER TYPE ADD VALUE IF NOT EXISTS é idempotente em PG 12+.

-- ─────────────────────────────────────────────────────────────────
-- 1) Adicionar 'CONVERTING' ao enum (lock otimista)
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'CONVERTING';
EXCEPTION WHEN others THEN null; END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2) Criar SEQUENCE para order_number
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  next_num INT;
BEGIN
  -- Pega o maior NNNN entre TODOS os PED-XXXX-NNNN existentes (qualquer ano)
  SELECT COALESCE(MAX(CAST(split_part(order_number, '-', 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM sales_orders
   WHERE order_number LIKE 'PED-%-%'
     AND split_part(order_number, '-', 3) ~ '^[0-9]+$';

  IF next_num IS NULL OR next_num < 1 THEN
    next_num := 1;
  END IF;

  -- Cria a sequence se não existe; se já existe, pula sem mexer no estado atual
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'sales_orders_seq'
  ) THEN
    EXECUTE format('CREATE SEQUENCE sales_orders_seq START WITH %s MINVALUE 1', next_num);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3) CHECK constraints em sales_order_items
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_qty_chk'
  ) THEN
    ALTER TABLE sales_order_items
      ADD CONSTRAINT sales_order_items_qty_chk CHECK (quantity > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_price_chk'
  ) THEN
    ALTER TABLE sales_order_items
      ADD CONSTRAINT sales_order_items_price_chk CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_discount_chk'
  ) THEN
    ALTER TABLE sales_order_items
      ADD CONSTRAINT sales_order_items_discount_chk CHECK (discount >= 0);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 4) Índice composto para listagens por status ordenadas por data
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_created
  ON sales_orders(status, created_at DESC);
