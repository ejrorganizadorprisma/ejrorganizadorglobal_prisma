-- Add CI and RUC fields for Paraguay customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ci VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ruc VARCHAR(20);

-- Make document column nullable (PY customers may not have CPF/CNPJ)
ALTER TABLE customers ALTER COLUMN document DROP NOT NULL;

-- Remove the unique constraint on document (since PY customers won't always have it)
-- and create a partial unique index instead
DROP INDEX IF EXISTS customers_document_key;
CREATE UNIQUE INDEX IF NOT EXISTS customers_document_unique ON customers(document) WHERE document IS NOT NULL AND document != '';

-- Create indexes for CI and RUC
CREATE INDEX IF NOT EXISTS idx_customers_ci ON customers(ci) WHERE ci IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_ruc ON customers(ruc) WHERE ruc IS NOT NULL;
