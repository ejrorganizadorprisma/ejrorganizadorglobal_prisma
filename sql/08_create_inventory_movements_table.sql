-- ============================================
-- CREATE INVENTORY_MOVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'RETURN')),
  "quantity" INTEGER NOT NULL,
  "previous_stock" INTEGER NOT NULL DEFAULT 0,
  "new_stock" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "reference_id" TEXT,
  "reference_type" VARCHAR(50),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_product_id_fkey'
    ) THEN
        ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_user_id_fkey'
    ) THEN
        ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_user_id_idx" ON "inventory_movements"("user_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_type_idx" ON "inventory_movements"("type");
CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx" ON "inventory_movements"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "inventory_movements_reference_idx" ON "inventory_movements"("reference_id", "reference_type");

-- Enable RLS
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON "inventory_movements";
CREATE POLICY "Authenticated users can view inventory movements"
  ON "inventory_movements" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage inventory movements" ON "inventory_movements";
CREATE POLICY "Service role can manage inventory movements"
  ON "inventory_movements" FOR ALL
  USING (true);
