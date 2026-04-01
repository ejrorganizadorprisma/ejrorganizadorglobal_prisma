-- Migration 025: Add payment installments to purchase budgets
ALTER TABLE purchase_budgets
ADD COLUMN IF NOT EXISTS payment_installments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_method TEXT;
