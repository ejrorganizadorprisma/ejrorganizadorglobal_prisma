-- Add CI and RUC columns to suppliers table (Paraguay document types)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ci varchar(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ruc varchar(50);
