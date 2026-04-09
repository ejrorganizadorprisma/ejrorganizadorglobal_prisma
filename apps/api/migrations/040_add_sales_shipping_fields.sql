-- Migration: Campos de logística e frete nas vendas
--
-- Adiciona informações de transporte/entrega às vendas. Estes campos são
-- preenchidos por quem fatura (não pelo vendedor que criou o pedido).

DO $$ BEGIN
  CREATE TYPE "ShippingMethod" AS ENUM ('PICKUP', 'DELIVERY', 'CARRIER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_method   "ShippingMethod";
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_cost     INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS carrier_name      TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tracking_code     TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_address  JSONB;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_status   "DeliveryStatus";
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivered_at      TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_notes    TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_delivery_status ON sales(delivery_status) WHERE delivery_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_tracking_code   ON sales(tracking_code)   WHERE tracking_code   IS NOT NULL;
