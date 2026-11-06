-- 068: PDV / Caixa (venda de balcão estilo supermercado)
--
-- * Papel novo CASHIER (Operador de Caixa) — só acessa o PDV.
-- * pos_sessions: turno de caixa (abertura com fundo de troco → fechamento com
--   conferência do dinheiro contado x esperado).
-- * pos_movements: sangria (WITHDRAWAL) e suprimento (SUPPLY) durante o turno.
-- * sales.pos_session_id: venda feita no PDV (já paga, sem separação/expedição).
-- * Cliente fixo "Consumidor Final" (id cust-consumidor-final) para vendas sem
--   identificação; aceita qualquer forma de pagamento.
-- * Página 'pos' na matriz de permissões (OWNER/DIRECTOR/MANAGER + CASHIER).
--
-- Valores monetários no formato da moeda padrão (PYG inteiro; BRL/USD centavos),
-- igual a sales/sale_payments.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CASHIER';

CREATE TABLE IF NOT EXISTS pos_sessions (
  id               TEXT PRIMARY KEY,
  session_number   SERIAL,
  operator_id      TEXT NOT NULL REFERENCES users(id),
  status           VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opening_amount   BIGINT NOT NULL DEFAULT 0,
  closed_at        TIMESTAMPTZ,
  closed_by        TEXT REFERENCES users(id),
  expected_cash    BIGINT,
  counted_cash     BIGINT,
  cash_difference  BIGINT,
  summary          JSONB,          -- totais por forma de pagamento no fechamento
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Um único caixa aberto por operador.
CREATE UNIQUE INDEX IF NOT EXISTS pos_sessions_one_open_per_operator
  ON pos_sessions (operator_id) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS pos_sessions_opened_at_idx ON pos_sessions (opened_at DESC);

CREATE TABLE IF NOT EXISTS pos_movements (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES pos_sessions(id) ON DELETE CASCADE,
  type        VARCHAR(12) NOT NULL CHECK (type IN ('SUPPLY', 'WITHDRAWAL')),
  amount      BIGINT NOT NULL CHECK (amount > 0),
  reason      TEXT,
  created_by  TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pos_movements_session_idx ON pos_movements (session_id);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS pos_session_id TEXT REFERENCES pos_sessions(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS pos_change_amount BIGINT; -- troco devolvido
CREATE INDEX IF NOT EXISTS sales_pos_session_idx ON sales (pos_session_id) WHERE pos_session_id IS NOT NULL;

INSERT INTO customers (id, type, name, approval_status, created_at, updated_at)
VALUES ('cust-consumidor-final', 'INDIVIDUAL', 'Consumidor Final', 'APPROVED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Permissões: página 'pos' para OWNER/DIRECTOR/MANAGER e papel CASHIER só com 'pos'.
UPDATE permissions_config
SET config = jsonb_set(
      config::jsonb,
      '{permissions}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN role_entry->>'role' IN ('OWNER', 'DIRECTOR', 'MANAGER')
             AND NOT (role_entry->'pages' ? 'pos')
              THEN jsonb_set(role_entry, '{pages}', (role_entry->'pages') || '"pos"'::jsonb)
            ELSE role_entry
          END
        )
        FROM jsonb_array_elements(config::jsonb->'permissions') AS role_entry
      )
    ),
    updated_at = NOW()
WHERE id = (SELECT id FROM permissions_config ORDER BY updated_at DESC LIMIT 1);

UPDATE permissions_config
SET config = jsonb_set(
      config::jsonb,
      '{permissions}',
      (config::jsonb->'permissions') || '[{"role": "CASHIER", "pages": ["pos"]}]'::jsonb
    ),
    updated_at = NOW()
WHERE id = (SELECT id FROM permissions_config ORDER BY updated_at DESC LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(config::jsonb->'permissions') r WHERE r->>'role' = 'CASHIER'
  );
