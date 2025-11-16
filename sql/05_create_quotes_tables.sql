-- ============================================
-- CREATE QUOTES AND QUOTE_ITEMS TABLES
-- ============================================

-- Quotes table
CREATE TABLE IF NOT EXISTS "quotes" (
    "id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "responsible_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- Quote items table
CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- Indexes for quotes
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_quote_number_key" ON "quotes"("quote_number");
CREATE INDEX IF NOT EXISTS "quotes_customer_id_idx" ON "quotes"("customer_id");
CREATE INDEX IF NOT EXISTS "quotes_quote_number_idx" ON "quotes"("quote_number");
CREATE INDEX IF NOT EXISTS "quotes_status_idx" ON "quotes"("status");
CREATE INDEX IF NOT EXISTS "quotes_responsible_user_id_idx" ON "quotes"("responsible_user_id");

-- Indexes for quote_items
CREATE INDEX IF NOT EXISTS "quote_items_quote_id_idx" ON "quote_items"("quote_id");
CREATE INDEX IF NOT EXISTS "quote_items_product_id_idx" ON "quote_items"("product_id");

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quotes_customer_id_fkey'
    ) THEN
        ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quotes_responsible_user_id_fkey'
    ) THEN
        ALTER TABLE "quotes" ADD CONSTRAINT "quotes_responsible_user_id_fkey"
            FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_quote_id_fkey'
    ) THEN
        ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey"
            FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_product_id_fkey'
    ) THEN
        ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_items" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON "quotes";
CREATE POLICY "Authenticated users can view quotes"
  ON "quotes" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage quotes" ON "quotes";
CREATE POLICY "Service role can manage quotes"
  ON "quotes" FOR ALL
  USING (true);

-- RLS Policies for quote_items
DROP POLICY IF EXISTS "Authenticated users can view quote items" ON "quote_items";
CREATE POLICY "Authenticated users can view quote items"
  ON "quote_items" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage quote items" ON "quote_items";
CREATE POLICY "Service role can manage quote items"
  ON "quote_items" FOR ALL
  USING (true);
