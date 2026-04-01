-- Migration 010: Create document settings table for PDF customization
-- This table stores company profile configurations for generating professional documents

CREATE TABLE IF NOT EXISTS document_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Profile Information
  profile_name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,

  -- Company Branding
  company_logo TEXT, -- Base64 encoded image or URL
  company_name VARCHAR(255),

  -- Footer Information
  footer_text TEXT,
  footer_address TEXT,
  footer_phone VARCHAR(50),
  footer_email VARCHAR(255),
  footer_website VARCHAR(255),

  -- Signature Settings
  signature_image TEXT, -- Base64 encoded signature image or URL
  signature_name VARCHAR(255),
  signature_role VARCHAR(100),

  -- Quote Defaults
  default_quote_validity_days INTEGER DEFAULT 30,

  -- Additional Customization
  primary_color VARCHAR(7) DEFAULT '#2563eb', -- Hex color for branding
  secondary_color VARCHAR(7) DEFAULT '#1e40af',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- Constraints
  CONSTRAINT valid_hex_color_primary CHECK (primary_color ~* '^#[0-9A-F]{6}$'),
  CONSTRAINT valid_hex_color_secondary CHECK (secondary_color ~* '^#[0-9A-F]{6}$'),
  CONSTRAINT positive_validity_days CHECK (default_quote_validity_days > 0)
);

-- Index for faster lookup of default profile
CREATE INDEX idx_document_settings_default ON document_settings(is_default) WHERE is_default = true;

-- Trigger to ensure only one default profile
CREATE OR REPLACE FUNCTION ensure_single_default_document_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other defaults
    UPDATE document_settings
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_document_settings
  BEFORE INSERT OR UPDATE ON document_settings
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_document_settings();

-- Update updated_at timestamp automatically
CREATE TRIGGER update_document_settings_updated_at
  BEFORE UPDATE ON document_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a default configuration
INSERT INTO document_settings (
  profile_name,
  is_default,
  company_name,
  footer_text,
  signature_role,
  default_quote_validity_days,
  primary_color,
  secondary_color
) VALUES (
  'Configuração Padrão',
  true,
  'EJR ORGANIZADOR',
  'Obrigado pela preferência!',
  'Diretor',
  30,
  '#2563eb',
  '#1e40af'
);
