-- Migration: Customer responsible_user_id, approval_status, soft delete
-- Date: 2026-04-07
-- Purpose:
--   1. Each customer can be assigned to a responsible salesperson (responsible_user_id)
--   2. Customers created by mobile salespeople need admin approval before being usable
--   3. Soft delete so that mobile sync can detect deletions

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS responsible_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- approval_status valid values: 'PENDING', 'APPROVED', 'REJECTED'
ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_approval_status_check;
ALTER TABLE customers
  ADD CONSTRAINT customers_approval_status_check
  CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS idx_customers_responsible_user_id
  ON customers(responsible_user_id) WHERE responsible_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_approval_status
  ON customers(approval_status);

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at
  ON customers(deleted_at) WHERE deleted_at IS NOT NULL;

-- All existing customers default to APPROVED + approved_at NOW()
UPDATE customers
  SET approved_at = COALESCE(approved_at, created_at)
  WHERE approval_status = 'APPROVED' AND approved_at IS NULL;
