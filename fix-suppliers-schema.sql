-- Adicionar colunas faltantes na tabela suppliers
-- Executar este script para corrigir o schema da tabela suppliers

-- 1. Adicionar coluna code (código auto-gerado)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- 2. Adicionar coluna legal_name (razão social)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);

-- 3. Adicionar coluna tax_id (CNPJ/CPF)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);

-- 4. Adicionar coluna website
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- 5. Adicionar coluna payment_terms
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- 6. Adicionar coluna lead_time_days
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- 7. Adicionar coluna minimum_order_value
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(15,2) DEFAULT 0;

-- 8. Adicionar coluna rating
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 9. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id ON suppliers(tax_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(rating);

-- 10. Gerar códigos para fornecedores existentes que não têm código
DO $$
DECLARE
    supplier_record RECORD;
    new_code VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    FOR supplier_record IN
        SELECT id FROM suppliers WHERE code IS NULL OR code = ''
    LOOP
        -- Gerar código único no formato FORN-XXXX
        LOOP
            new_code := 'FORN-' || LPAD(counter::TEXT, 4, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM suppliers WHERE code = new_code);
            counter := counter + 1;
        END LOOP;

        -- Atualizar fornecedor com o novo código
        UPDATE suppliers SET code = new_code WHERE id = supplier_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- 11. Tornar a coluna code obrigatória após preencher valores
ALTER TABLE suppliers
ALTER COLUMN code SET NOT NULL;

-- 12. Atualizar o status check constraint para incluir BLOCKED
ALTER TABLE suppliers
DROP CONSTRAINT IF EXISTS suppliers_status_check;

ALTER TABLE suppliers
ADD CONSTRAINT suppliers_status_check
CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED'));

COMMIT;
