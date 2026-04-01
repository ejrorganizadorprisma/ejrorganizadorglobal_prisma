-- ============================================
-- CREATE PRODUCT LOCATION SYSTEM
-- Migration 007: Sistema de Localização de Produtos
-- ============================================

-- Tabela de Espaços (ex: Depósito 1, Depósito 2, etc)
CREATE TABLE IF NOT EXISTS "storage_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_spaces_pkey" PRIMARY KEY ("id")
);

-- Tabela de Prateleiras (ex: 1A, 1B, 2A, etc)
CREATE TABLE IF NOT EXISTS "storage_shelves" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_shelves_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "storage_shelves_space_fkey" FOREIGN KEY ("space_id")
        REFERENCES "storage_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela de Seções (ex: 1, 2, 3, 4, etc)
CREATE TABLE IF NOT EXISTS "storage_sections" (
    "id" TEXT NOT NULL,
    "shelf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_sections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "storage_sections_shelf_fkey" FOREIGN KEY ("shelf_id")
        REFERENCES "storage_shelves"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Adicionar campos de localização na tabela products
ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "space_id" TEXT,
    ADD COLUMN IF NOT EXISTS "shelf_id" TEXT,
    ADD COLUMN IF NOT EXISTS "section_id" TEXT;

-- Adicionar foreign keys
ALTER TABLE "products"
    ADD CONSTRAINT "products_space_fkey" FOREIGN KEY ("space_id")
        REFERENCES "storage_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
    ADD CONSTRAINT "products_shelf_fkey" FOREIGN KEY ("shelf_id")
        REFERENCES "storage_shelves"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
    ADD CONSTRAINT "products_section_fkey" FOREIGN KEY ("section_id")
        REFERENCES "storage_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS "storage_spaces_name_idx" ON "storage_spaces"("name");
CREATE INDEX IF NOT EXISTS "storage_shelves_space_id_idx" ON "storage_shelves"("space_id");
CREATE INDEX IF NOT EXISTS "storage_shelves_name_idx" ON "storage_shelves"("name");
CREATE INDEX IF NOT EXISTS "storage_sections_shelf_id_idx" ON "storage_sections"("shelf_id");
CREATE INDEX IF NOT EXISTS "storage_sections_name_idx" ON "storage_sections"("name");
CREATE INDEX IF NOT EXISTS "products_space_id_idx" ON "products"("space_id");
CREATE INDEX IF NOT EXISTS "products_shelf_id_idx" ON "products"("shelf_id");
CREATE INDEX IF NOT EXISTS "products_section_id_idx" ON "products"("section_id");

-- Enable RLS nas novas tabelas
ALTER TABLE "storage_spaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage_shelves" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage_sections" ENABLE ROW LEVEL SECURITY;

-- RLS Policies para storage_spaces
DROP POLICY IF EXISTS "Anyone can view storage spaces" ON "storage_spaces";
CREATE POLICY "Anyone can view storage spaces"
  ON "storage_spaces" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage storage spaces" ON "storage_spaces";
CREATE POLICY "Service role can manage storage spaces"
  ON "storage_spaces" FOR ALL
  USING (true);

-- RLS Policies para storage_shelves
DROP POLICY IF EXISTS "Anyone can view storage shelves" ON "storage_shelves";
CREATE POLICY "Anyone can view storage shelves"
  ON "storage_shelves" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage storage shelves" ON "storage_shelves";
CREATE POLICY "Service role can manage storage shelves"
  ON "storage_shelves" FOR ALL
  USING (true);

-- RLS Policies para storage_sections
DROP POLICY IF EXISTS "Anyone can view storage sections" ON "storage_sections";
CREATE POLICY "Anyone can view storage sections"
  ON "storage_sections" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage storage sections" ON "storage_sections";
CREATE POLICY "Service role can manage storage sections"
  ON "storage_sections" FOR ALL
  USING (true);

-- Dados iniciais de exemplo (opcional - pode ser removido se não quiser dados de exemplo)
INSERT INTO "storage_spaces" ("id", "name", "description") VALUES
  ('space-1', 'Depósito 1', 'Depósito principal'),
  ('space-2', 'Depósito 2', 'Depósito secundário')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "storage_shelves" ("id", "space_id", "name", "description") VALUES
  ('shelf-1a', 'space-1', '1A', 'Prateleira 1A do Depósito 1'),
  ('shelf-1b', 'space-1', '1B', 'Prateleira 1B do Depósito 1'),
  ('shelf-2a', 'space-2', '2A', 'Prateleira 2A do Depósito 2')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "storage_sections" ("id", "shelf_id", "name", "description") VALUES
  ('section-1a-1', 'shelf-1a', '1', 'Seção 1 da Prateleira 1A'),
  ('section-1a-2', 'shelf-1a', '2', 'Seção 2 da Prateleira 1A'),
  ('section-1a-3', 'shelf-1a', '3', 'Seção 3 da Prateleira 1A'),
  ('section-1a-4', 'shelf-1a', '4', 'Seção 4 da Prateleira 1A')
ON CONFLICT ("id") DO NOTHING;
