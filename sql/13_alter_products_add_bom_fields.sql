-- ============================================
-- ALTER PRODUCTS TABLE - Add BOM fields
-- ============================================
-- Adiciona campos para controle de produtos compostos

-- Adicionar coluna is_assembly (produto montado a partir de peças)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'is_assembly'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "is_assembly" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna is_part (é uma peça componente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'is_part'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "is_part" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna assembly_cost (custo de montagem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'assembly_cost'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "assembly_cost" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS "products_is_assembly_idx" ON "products"("is_assembly");
CREATE INDEX IF NOT EXISTS "products_is_part_idx" ON "products"("is_part");
