-- Migration: Add mobile app settings to system_settings
-- Description: Configurações do aplicativo celular (habilitação + chave de conexão)

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS mobile_app_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_app_api_key TEXT;

COMMENT ON COLUMN system_settings.mobile_app_enabled IS 'Habilitar/desabilitar acesso via aplicativo celular';
COMMENT ON COLUMN system_settings.mobile_app_api_key IS 'Chave de conexão (API Key) para autorizar o aplicativo celular';
