-- ============================================
-- CREATE PRODUCTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT,
    "cost_price" INTEGER NOT NULL,
    "sale_price" INTEGER NOT NULL,
    "technical_description" TEXT,
    "commercial_description" TEXT,
    "warranty_months" INTEGER NOT NULL DEFAULT 0,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "minimum_stock" INTEGER NOT NULL DEFAULT 5,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "products_code_key" ON "products"("code");
CREATE INDEX IF NOT EXISTS "products_code_idx" ON "products"("code");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products"("name");

-- Enable RLS
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view active products" ON "products";
CREATE POLICY "Anyone can view active products"
  ON "products" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage products" ON "products";
CREATE POLICY "Service role can manage products"
  ON "products" FOR ALL
  USING (true);
