-- Pedido de Pendência (backorder): quando um pedido é faturado apenas com a
-- quantidade separada, o saldo que faltou vira um NOVO pedido de venda ligado
-- ao pedido de origem. Esse vínculo permite exibir "Pedido de Venda | Pendência"
-- e mostrar o número do pedido de origem.
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS pending_origin_order_id TEXT
  REFERENCES sales_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_pending_origin
  ON sales_orders (pending_origin_order_id)
  WHERE pending_origin_order_id IS NOT NULL;
