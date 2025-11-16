-- ============================================
-- CREATE SUPPLIERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "document" VARCHAR(20) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(20),
  "address" TEXT,
  "city" VARCHAR(100),
  "state" VARCHAR(2),
  "postal_code" VARCHAR(10),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_document_key" ON "suppliers"("document");
CREATE INDEX IF NOT EXISTS "suppliers_name_idx" ON "suppliers"("name");
CREATE INDEX IF NOT EXISTS "suppliers_document_idx" ON "suppliers"("document");
CREATE INDEX IF NOT EXISTS "suppliers_status_idx" ON "suppliers"("status");

-- Enable RLS
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON "suppliers";
CREATE POLICY "Authenticated users can view suppliers"
  ON "suppliers" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage suppliers" ON "suppliers";
CREATE POLICY "Service role can manage suppliers"
  ON "suppliers" FOR ALL
  USING (true);
