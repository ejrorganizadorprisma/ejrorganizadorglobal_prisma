-- Migration: Add payment method authorization per customer
-- Default: only CASH (Efectivo) enabled
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS allowed_payment_methods TEXT[]
  DEFAULT ARRAY['CASH'];

-- Max credit days (only relevant when CREDIT_CARD is in allowed_payment_methods)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_max_days INTEGER DEFAULT NULL;
