-- ============================================
-- CREATE PRODUCT_PARTS TABLE (BOM - Bill of Materials)
-- ============================================
-- Relacionamento N:N entre produtos e suas peças componentes

CREATE TABLE IF NOT EXISTS "product_parts" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,  -- produto principal (assembly)
  "part_id" TEXT NOT NULL,     -- peça componente
  "quantity" INTEGER NOT NULL DEFAULT 1,  -- quantidade necessária
  "is_optional" BOOLEAN NOT NULL DEFAULT FALSE,  -- peça opcional?
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_parts_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_parts_product_id_fkey'
    ) THEN
        ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_parts_part_id_fkey'
    ) THEN
        ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_part_id_fkey"
            FOREIGN KEY ("part_id") REFERENCES "products"("id") ON DELETE RESTRICT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "product_parts_product_id_idx" ON "product_parts"("product_id");
CREATE INDEX IF NOT EXISTS "product_parts_part_id_idx" ON "product_parts"("part_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_parts_unique_idx" ON "product_parts"("product_id", "part_id");

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_product_parts_updated_at ON "product_parts";
CREATE TRIGGER update_product_parts_updated_at
  BEFORE UPDATE ON "product_parts"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE "product_parts" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view product parts" ON "product_parts";
CREATE POLICY "Authenticated users can view product parts"
  ON "product_parts" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage product parts" ON "product_parts";
CREATE POLICY "Service role can manage product parts"
  ON "product_parts" FOR ALL
  USING (true);

-- Grant permissions
GRANT ALL ON "product_parts" TO authenticated;
GRANT ALL ON "product_parts" TO service_role;
