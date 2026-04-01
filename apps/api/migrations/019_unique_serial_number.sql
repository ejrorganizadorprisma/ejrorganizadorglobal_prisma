-- ==============================================
-- EJR Organizador - Unique Serial Number Constraint
-- Garante que serial_number nunca se repita
-- ==============================================

-- Adicionar constraint UNIQUE no serial_number
-- Isso impede inserção de IDs duplicadas no banco de dados
ALTER TABLE production_units
DROP CONSTRAINT IF EXISTS production_units_serial_number_unique;

ALTER TABLE production_units
ADD CONSTRAINT production_units_serial_number_unique UNIQUE (serial_number);

-- Criar índice para buscas rápidas por serial_number
CREATE INDEX IF NOT EXISTS idx_production_units_serial_number
ON production_units(serial_number);
