-- ============================================
-- CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL CHECK (type IN ('LOW_STOCK', 'QUOTE_PENDING', 'SALE_COMPLETED', 'INFO')),
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Foreign Key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- Enable RLS
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON "notifications";
CREATE POLICY "Users can view their own notifications"
  ON "notifications" FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON "notifications";
CREATE POLICY "Users can update their own notifications"
  ON "notifications" FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role can manage notifications" ON "notifications";
CREATE POLICY "Service role can manage notifications"
  ON "notifications" FOR ALL
  USING (true);
