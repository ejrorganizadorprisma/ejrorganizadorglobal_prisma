-- 048: Workflow completo do Pedido de Venda (Demanda 9)
-- Adiciona os status intermediários e de entrega + campos de separação/entrega.
-- Idempotente.

-- Novos status no enum (PG 12+: ADD VALUE pode rodar em transação se não usado nela)
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'SEPARATED';
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'TO_DELIVER';
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Conferência de separação por item
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS quantity_separated INTEGER;
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS separation_status TEXT; -- OK | MISSING | PARTIAL

-- Rastreabilidade do workflow no pedido
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS received_at  TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS received_by  TEXT REFERENCES users(id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS separated_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS separated_by TEXT REFERENCES users(id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivery_type TEXT;          -- CUSTOMER | CARRIER
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS carrier_name  TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivered_by  TEXT REFERENCES users(id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ;
