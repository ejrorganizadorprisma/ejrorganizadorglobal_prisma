-- 046: Histórico de alterações do Orçamento de Compras (Demanda 3)
-- Registra usuário, data/hora, ação, campo alterado, valor anterior e novo.
-- Idempotente.

CREATE TABLE IF NOT EXISTS purchase_budget_history (
  id          TEXT PRIMARY KEY,
  budget_id   TEXT NOT NULL REFERENCES purchase_budgets(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,   -- BUDGET_UPDATE | ITEM_ADD | ITEM_UPDATE | ITEM_DELETE | QUOTE_ADD | QUOTE_UPDATE | QUOTE_DELETE | QUOTE_SELECT | STATUS_CHANGE
  field       TEXT,            -- campo alterado (quantity, unit_price, supplier_id, status, ...)
  old_value   TEXT,
  new_value   TEXT,
  description TEXT,            -- texto legível para exibição
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pb_history_budget
  ON purchase_budget_history (budget_id, created_at DESC);

-- Ordenação de itens (para reordenar). Itens existentes herdam a ordem de criação.
ALTER TABLE purchase_budget_items ADD COLUMN IF NOT EXISTS sort_order INTEGER;
