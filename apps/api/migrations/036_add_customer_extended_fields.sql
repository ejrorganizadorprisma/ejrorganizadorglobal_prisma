-- Migration: Add extended fields to customers table
-- Adds personal/contact data fields used by web/mobile customer forms.
--
-- New columns:
--   birth_date     - date of birth (individuals) or founding date (businesses)
--   notes          - free-text notes about the customer
--   rg             - Brazilian RG / general identification number
--   gender         - gender (free text, e.g. M/F/Other)
--   marital_status - marital status (free text)
--   profession     - profession / occupation
--   whatsapp       - WhatsApp number (may differ from main phone)
--   phone_alt      - alternative phone number
--   email_alt      - alternative email

ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_alt TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_alt TEXT;

-- Optional indexes for birthday campaigns and WhatsApp lookups
CREATE INDEX IF NOT EXISTS idx_customers_birth_date ON customers(birth_date) WHERE birth_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp) WHERE whatsapp IS NOT NULL;
