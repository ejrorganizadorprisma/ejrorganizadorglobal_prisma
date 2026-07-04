-- 055: Fluxo de chão de fábrica — Separação no Estoque → Conferência →
--      Faturamento (NF) → Expedição → Transportadora/Coleta.
--
-- Adiciona:
--   • status de fila/trava de separação no enum SalesOrderStatus
--   • trava de responsável + justificativa de falta em sales_orders/items
--   • histórico de eventos de separação (avaliar funcionários)
--   • código de funcionário em users (identificação em computador compartilhado)
--   • método de identificação do chão em system_settings
--   • cadastro de transportadoras (carriers)
--   • dimensão de fulfillment + NF de saída + volumes/atados + coleta em sales
--
-- Idempotente. NF de saída é apenas REGISTRO (integração fiscal PY virá depois).

-- ─────────────────────────────────────────────────────────────────
-- 1) Novos status do Pedido (fila e trava de separação)
--    (PG 12+: ADD VALUE roda em transação se o valor não for usado nela)
-- ─────────────────────────────────────────────────────────────────
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_SEPARATION';
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'SEPARATING';

-- ─────────────────────────────────────────────────────────────────
-- 2) Trava de responsável pela separação + liberação
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS separation_claimed_by     TEXT REFERENCES users(id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS separation_claimed_at     TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS released_for_separation_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS released_by               TEXT REFERENCES users(id);

-- Justificativa de falta por item (obrigatória quando MISSING/PARTIAL)
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS separation_note TEXT;

-- ─────────────────────────────────────────────────────────────────
-- 3) Histórico de eventos de separação (para avaliação de funcionários)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS separation_events (
  id              TEXT PRIMARY KEY,
  sales_order_id  TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  user_id         TEXT REFERENCES users(id),        -- responsável (logado ou resolvido por código)
  action          TEXT NOT NULL,                    -- CLAIMED | POSTPONED | COMPLETED | CONFERRED | RELEASED
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_separation_events_order ON separation_events(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_separation_events_user  ON separation_events(user_id);

-- ─────────────────────────────────────────────────────────────────
-- 4) Código de funcionário (identificação em computador compartilhado)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code
  ON users(employee_code) WHERE employee_code IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 5) Método de identificação do chão de fábrica (Separação + Expedição)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS floor_identification_method TEXT DEFAULT 'LOGGED_USER';

-- ─────────────────────────────────────────────────────────────────
-- 6) Cadastro de Transportadoras
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carriers (
  id            TEXT PRIMARY KEY,
  code          TEXT UNIQUE,
  name          TEXT NOT NULL,
  document      TEXT,           -- CNPJ / RUC
  phone         TEXT,
  email         TEXT,
  contact_name  TEXT,
  city          TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | INACTIVE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);

DROP TRIGGER IF EXISTS update_carriers_updated_at ON carriers;
CREATE TRIGGER update_carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────
-- 7) Fulfillment / NF de saída / Expedição / Coleta nas Vendas
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "FulfillmentStatus" AS ENUM ('CONFERRED', 'IN_EXPEDITION', 'AWAITING_CARRIER', 'COLLECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS fulfillment_status "FulfillmentStatus";

-- Nota Fiscal de saída (apenas registro; extensível para integração PY)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nf_number     TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nf_date       DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nf_amount     INTEGER;   -- centavos
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nf_file_url   TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nf_file_name  TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoiced_at   TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoiced_by   TEXT REFERENCES users(id);

-- Expedição
ALTER TABLE sales ADD COLUMN IF NOT EXISTS carrier_id             TEXT REFERENCES carriers(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS carrier_scheduled_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS volumes_count          INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS bundles_count          INTEGER;   -- atados
ALTER TABLE sales ADD COLUMN IF NOT EXISTS expedition_notes       TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS expedition_conferred_by TEXT REFERENCES users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS expedition_conferred_at TIMESTAMPTZ;

-- Coleta pela transportadora
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collected_at               TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collected_by               TEXT REFERENCES users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collection_driver_name     TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collection_carrier_volumes INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collection_receipt_url     TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collection_receipt_name    TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_fulfillment_status ON sales(fulfillment_status) WHERE fulfillment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_carrier_id ON sales(carrier_id) WHERE carrier_id IS NOT NULL;
