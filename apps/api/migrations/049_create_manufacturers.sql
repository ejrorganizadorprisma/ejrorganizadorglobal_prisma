-- 049: Cadastro de Indústrias (tabela manufacturers) + FK em products e suppliers
-- UI usa o termo "Indústria"; tabela/colunas permanecem "manufacturer" por retrocompatibilidade
-- (colunas products.manufacturer / suppliers.manufacturer e endpoints já existentes).
-- Idempotente: pode rodar várias vezes (o runner executa todos os .sql sempre).

-- 1) Tabela de indústrias
CREATE TABLE IF NOT EXISTS manufacturers (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code        TEXT,
  name        TEXT NOT NULL,
  legal_name  TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nome único case-insensitive (impede "Plasbohn" e "plasbohn" duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturers_name_lower ON manufacturers (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturers_code ON manufacturers (code) WHERE code IS NOT NULL;

-- 2) FKs em products e suppliers (texto antigo mantido como denormalização)
ALTER TABLE products  ADD COLUMN IF NOT EXISTS manufacturer_id TEXT REFERENCES manufacturers(id) ON DELETE SET NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS manufacturer_id TEXT REFERENCES manufacturers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_id  ON products (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_manufacturer_id ON suppliers (manufacturer_id);

-- 3) Corrige divergência de digitação conhecida ANTES de consolidar
UPDATE suppliers SET manufacturer = 'ROPER PLAST' WHERE manufacturer = 'ROPER PLAS';

-- 4) Seed: nomes distintos (case-insensitive) de products + suppliers
INSERT INTO manufacturers (name)
SELECT name FROM (
  SELECT DISTINCT ON (lower(trim(manufacturer))) trim(manufacturer) AS name
  FROM (
    SELECT manufacturer FROM products  WHERE manufacturer IS NOT NULL AND trim(manufacturer) <> ''
    UNION ALL
    SELECT manufacturer FROM suppliers WHERE manufacturer IS NOT NULL AND trim(manufacturer) <> ''
  ) u
  ORDER BY lower(trim(manufacturer)), trim(manufacturer)
) dedup
WHERE NOT EXISTS (
  SELECT 1 FROM manufacturers m WHERE lower(m.name) = lower(dedup.name)
);

-- 5) Gera códigos IND-XXXX para indústrias ainda sem código
WITH numbered AS (
  SELECT id,
         'IND-' || lpad((ROW_NUMBER() OVER (ORDER BY created_at, name))::text, 4, '0') AS new_code
  FROM manufacturers
  WHERE code IS NULL
)
UPDATE manufacturers m
SET code = n.new_code
FROM numbered n
WHERE m.id = n.id;

-- 6) Vincula FKs por nome (case-insensitive)
UPDATE products p
SET manufacturer_id = m.id
FROM manufacturers m
WHERE p.manufacturer_id IS NULL
  AND p.manufacturer IS NOT NULL
  AND lower(trim(p.manufacturer)) = lower(m.name);

UPDATE suppliers s
SET manufacturer_id = m.id
FROM manufacturers m
WHERE s.manufacturer_id IS NULL
  AND s.manufacturer IS NOT NULL
  AND lower(trim(s.manufacturer)) = lower(m.name);
