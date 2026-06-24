-- 053: Rastreamento de logística do pedido (supplier_order_tracking)
-- O admin lança atualizações de "onde a mercadoria está" ao editar o pedido.
-- Cada atualização guarda localidade, data e observação. O histórico fica
-- preservado (timeline); a última atualização aparece no tooltip da lista.
-- Idempotente.

CREATE TABLE IF NOT EXISTS supplier_order_tracking (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_order_id TEXT NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  location          TEXT NOT NULL,
  notes             TEXT,
  tracking_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ordenação eficiente do histórico (mais recente primeiro) por pedido
CREATE INDEX IF NOT EXISTS idx_sot_order_date
  ON supplier_order_tracking (supplier_order_id, tracking_date DESC, created_at DESC);
