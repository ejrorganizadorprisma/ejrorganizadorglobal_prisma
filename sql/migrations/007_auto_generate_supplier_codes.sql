-- Migration 007: Auto-generate supplier codes with sequential numbers
-- This migration creates a sequence and trigger to automatically generate
-- sequential codes for suppliers in the format: FORN-0001, FORN-0002, etc.

-- Create sequence for supplier codes
CREATE SEQUENCE IF NOT EXISTS suppliers_code_seq START WITH 1 INCREMENT BY 1;

-- Create function to auto-generate supplier code
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate code if not provided or empty
  IF NEW.document IS NULL OR NEW.document = '' THEN
    NEW.document := 'FORN-' || LPAD(nextval('suppliers_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate supplier code before insert
DROP TRIGGER IF EXISTS trigger_auto_generate_supplier_code ON suppliers;
CREATE TRIGGER trigger_auto_generate_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION generate_supplier_code();

-- Update existing suppliers that have empty or null document to have sequential codes
DO $$
DECLARE
  supplier_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR supplier_record IN
    SELECT id FROM suppliers WHERE document IS NULL OR document = ''
    ORDER BY created_at
  LOOP
    UPDATE suppliers
    SET document = 'FORN-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = supplier_record.id;
    counter := counter + 1;
  END LOOP;

  -- Set sequence to continue from where we left off
  IF counter > 1 THEN
    PERFORM setval('suppliers_code_seq', counter);
  END IF;
END $$;
