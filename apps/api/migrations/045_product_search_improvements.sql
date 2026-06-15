-- 045: Melhorias na busca de produtos (módulo de Orçamento de Compras)
-- Objetivo: permitir busca por código de barras e acelerar buscas ILIKE.
-- Idempotente: pode rodar várias vezes sem efeito colateral.

-- Código de barras (EAN/GTIN). Campo opcional, texto livre.
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);

-- Extensão de trigramas para acelerar ILIKE '%termo%'.
-- Envolvida em bloco para não quebrar a migração caso o usuário do banco
-- não tenha privilégio para criar extensões (ex.: ambientes gerenciados).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indisponivel (%). Indices de busca usarao apenas btree.', SQLERRM;
END $$;

-- Índices btree para igualdade/prefixo (sempre disponíveis).
CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_factory_code
  ON products (factory_code) WHERE factory_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_manufacturer
  ON products (manufacturer) WHERE manufacturer IS NOT NULL;

-- Índices GIN trigram para busca parcial rápida (somente se pg_trgm existir).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_products_name_trgm
      ON products USING gin (name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_products_manufacturer_trgm
      ON products USING gin (manufacturer gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_products_factory_code_trgm
      ON products USING gin (factory_code gin_trgm_ops);
  END IF;
END $$;

-- Acelera o filtro por fornecedor/indústria (product_suppliers.supplier_id).
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier
  ON product_suppliers (supplier_id);
