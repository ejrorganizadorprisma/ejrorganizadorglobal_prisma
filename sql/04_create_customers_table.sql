-- ============================================
-- CREATE CUSTOMERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "customers_document_key" ON "customers"("document");
CREATE INDEX IF NOT EXISTS "customers_document_idx" ON "customers"("document");
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");
CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers"("name");

-- Enable RLS
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON "customers";
CREATE POLICY "Authenticated users can view customers"
  ON "customers" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage customers" ON "customers";
CREATE POLICY "Service role can manage customers"
  ON "customers" FOR ALL
  USING (true);
