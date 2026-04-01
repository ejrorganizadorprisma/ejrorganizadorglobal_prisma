-- Migration: Create system_settings table
-- Description: Configurações globais do sistema (país, moeda, língua, taxas de câmbio)

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Configurações de localização
  country VARCHAR(2) NOT NULL DEFAULT 'BR' CHECK (country IN ('BR', 'PY')),
  default_currency VARCHAR(3) NOT NULL DEFAULT 'BRL' CHECK (default_currency IN ('BRL', 'PYG', 'USD')),
  language VARCHAR(10) NOT NULL DEFAULT 'pt-BR' CHECK (language IN ('pt-BR', 'es-PY')),

  -- Taxas de câmbio (quanto vale 1 Real em outras moedas)
  exchange_rate_brl_to_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.20,
  exchange_rate_brl_to_pyg DECIMAL(10, 2) NOT NULL DEFAULT 1450.00,

  -- Moedas habilitadas (array de códigos)
  enabled_currencies TEXT[] NOT NULL DEFAULT ARRAY['BRL', 'PYG', 'USD'],

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice na coluna country
CREATE INDEX IF NOT EXISTS idx_system_settings_country ON system_settings(country);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Inserir configuração padrão (Brasil)
INSERT INTO system_settings (
  country,
  default_currency,
  language,
  exchange_rate_brl_to_usd,
  exchange_rate_brl_to_pyg,
  enabled_currencies
) VALUES (
  'BR',
  'BRL',
  'pt-BR',
  0.20,
  1450.00,
  ARRAY['BRL', 'PYG', 'USD']
) ON CONFLICT DO NOTHING;

-- Comentários nas colunas
COMMENT ON TABLE system_settings IS 'Configurações globais do sistema';
COMMENT ON COLUMN system_settings.country IS 'País principal de operação (BR=Brasil, PY=Paraguay)';
COMMENT ON COLUMN system_settings.default_currency IS 'Moeda padrão do sistema';
COMMENT ON COLUMN system_settings.language IS 'Idioma padrão do sistema';
COMMENT ON COLUMN system_settings.exchange_rate_brl_to_usd IS 'Taxa de câmbio: 1 Real = X Dólares';
COMMENT ON COLUMN system_settings.exchange_rate_brl_to_pyg IS 'Taxa de câmbio: 1 Real = X Guaranis';
COMMENT ON COLUMN system_settings.enabled_currencies IS 'Moedas habilitadas no sistema';
