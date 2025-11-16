-- ============================================
-- CREATE USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active");

-- Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own data" ON "users";
CREATE POLICY "Users can view their own data"
  ON "users" FOR SELECT
  USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Service role can manage users" ON "users";
CREATE POLICY "Service role can manage users"
  ON "users" FOR ALL
  USING (true);
