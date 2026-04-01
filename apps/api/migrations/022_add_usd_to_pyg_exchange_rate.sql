-- Migration: Add USD to PYG exchange rate
-- Description: Adds a new field to store the exchange rate from USD to PYG

-- Add the new column to system_settings table
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS exchange_rate_usd_to_pyg DECIMAL(10, 2) DEFAULT 7250.00;

-- Update existing records to have the default value
UPDATE system_settings
SET exchange_rate_usd_to_pyg = 7250.00
WHERE exchange_rate_usd_to_pyg IS NULL;

-- Add comment to the column
COMMENT ON COLUMN system_settings.exchange_rate_usd_to_pyg IS 'Exchange rate from 1 USD to Paraguayan Guarani (PYG)';
