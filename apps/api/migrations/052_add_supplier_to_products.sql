-- 052: Fornecedor do produto (fornecedor principal) no cadastro de produto
-- Select único no formulário. O "Código Fornecedor" (factory_code) é o código que
-- esse fornecedor usa para o produto no catálogo dele. Idempotente.

ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products (supplier_id);
