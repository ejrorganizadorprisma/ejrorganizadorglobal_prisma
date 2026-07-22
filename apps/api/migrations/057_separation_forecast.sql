-- Previsão de Separação: data estimada para o pedido ser encaminhado à separação.
-- Usada na lista de pedidos para priorizar (destacar quando a data chega/vence)
-- e ordenar por prioridade.
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS separation_forecast_date DATE;

-- Índice parcial: só interessa quando há previsão definida (ordenação/priorização).
CREATE INDEX IF NOT EXISTS idx_sales_orders_sep_forecast
  ON sales_orders (separation_forecast_date)
  WHERE separation_forecast_date IS NOT NULL;
