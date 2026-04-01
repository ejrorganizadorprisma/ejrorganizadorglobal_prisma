-- Migration: Add password_version to users table
-- Description: Adds password_version field to enable token invalidation on password change

-- Add password_version column with default value 1
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN users.password_version IS 'Incremented when password changes to invalidate old JWT tokens';
