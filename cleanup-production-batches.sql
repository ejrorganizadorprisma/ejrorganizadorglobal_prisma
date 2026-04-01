-- ==============================================
-- EJR Organizador - Limpeza de Lotes de Produção (TESTES)
-- Execute este script no Supabase SQL Editor
-- ==============================================

-- 1. Deletar histórico de liberação de componentes
DELETE FROM component_releases;

-- 2. Deletar testes de unidades
DELETE FROM unit_tests;

-- 3. Deletar componentes das unidades
DELETE FROM unit_components;

-- 4. Deletar unidades de produção
DELETE FROM production_units;

-- 5. Deletar histórico de produção
DELETE FROM production_history;

-- 6. Deletar lotes de produção
DELETE FROM production_batches;

-- Verificar que tudo foi limpo
SELECT 'production_batches' as tabela, COUNT(*) as registros FROM production_batches
UNION ALL
SELECT 'production_units', COUNT(*) FROM production_units
UNION ALL
SELECT 'unit_components', COUNT(*) FROM unit_components
UNION ALL
SELECT 'unit_tests', COUNT(*) FROM unit_tests
UNION ALL
SELECT 'production_history', COUNT(*) FROM production_history
UNION ALL
SELECT 'component_releases', COUNT(*) FROM component_releases;
