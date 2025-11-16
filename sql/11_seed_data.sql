-- ============================================
-- SEED DATA
-- ============================================
-- Safe to run multiple times (uses INSERT ... ON CONFLICT)
-- ============================================

-- Insert admin user (only if not exists)
INSERT INTO "users" ("id", "email", "password_hash", "name", "role", "is_active", "updated_at")
VALUES (
  'mock-user-id',
  'admin@ejr.com',
  '$2a$10$EdOY.89C6aZNgEbZPf6NBOjQJL2ppwPk3ZuRtDgXhHGDwTbxCx.Da',
  'Administrador',
  'OWNER',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Insert sample products (only if not exists)
INSERT INTO "products" ("id", "code", "name", "category", "cost_price", "sale_price", "current_stock", "minimum_stock", "status", "updated_at")
VALUES
  ('prod-001', 'PROD-001', 'Produto Exemplo 1', 'Eletrônicos', 10000, 15000, 50, 10, 'ACTIVE', CURRENT_TIMESTAMP),
  ('prod-002', 'PROD-002', 'Produto Exemplo 2', 'Informática', 20000, 30000, 30, 5, 'ACTIVE', CURRENT_TIMESTAMP),
  ('prod-003', 'PROD-003', 'Produto Exemplo 3', 'Acessórios', 5000, 8000, 100, 20, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Insert sample customers (only if not exists)
INSERT INTO "customers" ("id", "type", "name", "document", "email", "phone", "updated_at")
VALUES
  ('cust-001', 'INDIVIDUAL', 'Cliente Exemplo 1', '123.456.789-00', 'cliente1@example.com', '(11) 98765-4321', CURRENT_TIMESTAMP),
  ('cust-002', 'BUSINESS', 'Empresa Exemplo LTDA', '12.345.678/0001-90', 'contato@empresaexemplo.com', '(11) 3456-7890', CURRENT_TIMESTAMP)
ON CONFLICT ("document") DO NOTHING;

-- Insert sample supplier (only if not exists)
INSERT INTO "suppliers" ("id", "name", "document", "email", "phone", "status")
VALUES
  ('supp-001', 'Fornecedor Exemplo', '98.765.432/0001-10', 'vendas@fornecedor.com', '(11) 2345-6789', 'ACTIVE')
ON CONFLICT ("document") DO NOTHING;
