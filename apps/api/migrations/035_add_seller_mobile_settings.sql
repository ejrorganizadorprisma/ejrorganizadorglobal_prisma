-- Migration: Add per-seller mobile app authorization columns to users
-- Description: Cada vendedor agora tem autorização individual para o app mobile

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_app_authorized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_app_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS mobile_app_permissions JSONB DEFAULT '{"customers":true,"quotes":true,"sales":true,"products":true}',
  ADD COLUMN IF NOT EXISTS mobile_app_last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mobile_app_last_sync TIMESTAMPTZ;
