-- Migration: 016_disable_batch_trigger
-- Description: Disable the create_batch_units trigger that causes conflicts
-- The unit creation is now handled in the API code
-- Date: 2024-12-10

-- Desabilitar o trigger que causa conflito
DROP TRIGGER IF EXISTS trigger_create_batch_units ON production_batches;

-- Manter a função para referência, mas ela não será mais usada automaticamente
-- A criação de unidades agora é feita via API no método createUnitsManually

COMMENT ON FUNCTION create_batch_units() IS 'DEPRECATED: Unit creation is now handled by the API to avoid trigger conflicts with Supabase';
