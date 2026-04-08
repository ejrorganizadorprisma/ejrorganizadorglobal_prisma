-- Migration: Add extended fields to users table for richer seller profiles
-- Personal data
ALTER TABLE users ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_alt TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Commercial data (primarily for SALESPERSON role)
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_target INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT;

-- Contractual data
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_document ON users(document) WHERE document IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region) WHERE region IS NOT NULL;
