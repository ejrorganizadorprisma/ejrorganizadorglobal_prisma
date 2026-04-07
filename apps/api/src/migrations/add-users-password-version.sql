-- Migration: Add password_version column to users
-- Date: 2026-04-07
-- Purpose: users.service.ts increments password_version when a password is
-- changed, to allow future invalidation of old JWTs. The column was never
-- added to the schema, causing PATCH /users/:id to 500 whenever a password
-- was updated. Add the column with a sane default and backfill existing rows.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;
