-- Migration 043: Pedidos Phase 2
--
-- Mudanças:
--   1) Adiciona status 'PARTIALLY_CONVERTED' ao enum SalesOrderStatus
--      (faturamento parcial: pedido vira saldo após conversão de subset/qty menor)
--   2) Cria tabela `sales_order_conversions` (histórico de cada faturamento parcial)
--   3) Adiciona colunas approved_at / approved_by em sales_orders (rastreio aprovação)
--   4) Cria tabela `device_push_tokens` para Expo Push Notifications
--
-- Idempotente: usa IF NOT EXISTS / ADD VALUE IF NOT EXISTS / DO blocks com guards.

-- ─────────────────────────────────────────────────────────────────
-- 1) PARTIALLY_CONVERTED no enum
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_CONVERTED';
EXCEPTION WHEN others THEN null; END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2) Histórico de faturamentos parciais (uma linha por conversão)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_order_conversions (
  id              TEXT PRIMARY KEY,
  sales_order_id  TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sale_id         TEXT NOT NULL REFERENCES sales(id),
  items_snapshot  JSONB NOT NULL,
  converted_at    TIMESTAMPTZ DEFAULT NOW(),
  converted_by    TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_soc_order ON sales_order_conversions(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_soc_sale  ON sales_order_conversions(sale_id);

-- ─────────────────────────────────────────────────────────────────
-- 3) Aprovação manual de pedido (PENDING → APPROVED)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);

-- ─────────────────────────────────────────────────────────────────
-- 4) Push notification tokens (Expo Push API)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_token    TEXT NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  device_name   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expo_token)
);

CREATE INDEX IF NOT EXISTS idx_dpt_user  ON device_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_dpt_token ON device_push_tokens(expo_token);
