-- ============================================
-- CREATE SERVICE_PARTS TABLE
-- ============================================
-- Peças utilizadas em ordens de serviço

CREATE TABLE IF NOT EXISTS "service_parts" (
  "id" TEXT NOT NULL,
  "service_order_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,  -- peça usada (referencia products)
  "quantity" INTEGER NOT NULL,
  "unit_cost" INTEGER NOT NULL,  -- centavos (custo unitário no momento do uso)
  "total_cost" INTEGER NOT NULL, -- centavos (quantity * unit_cost)
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "service_parts_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_parts_service_order_id_fkey'
    ) THEN
        ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_service_order_id_fkey"
            FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_parts_product_id_fkey'
    ) THEN
        ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "service_parts_service_order_id_idx" ON "service_parts"("service_order_id");
CREATE INDEX IF NOT EXISTS "service_parts_product_id_idx" ON "service_parts"("product_id");

-- Enable RLS
ALTER TABLE "service_parts" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view service parts" ON "service_parts";
CREATE POLICY "Authenticated users can view service parts"
  ON "service_parts" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage service parts" ON "service_parts";
CREATE POLICY "Service role can manage service parts"
  ON "service_parts" FOR ALL
  USING (true);

-- Grant permissions
GRANT ALL ON "service_parts" TO authenticated;
GRANT ALL ON "service_parts" TO service_role;
