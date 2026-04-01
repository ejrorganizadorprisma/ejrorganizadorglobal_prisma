ALTER TABLE purchase_budgets ADD COLUMN IF NOT EXISTS manufacturers JSONB DEFAULT '[]'::jsonb;
