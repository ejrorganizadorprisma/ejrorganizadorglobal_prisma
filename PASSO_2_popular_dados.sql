-- ============================================
-- PASSO 2: POPULAR DADOS INICIAIS
-- ============================================
-- Execute este SQL no SQL Editor do Supabase APÓS executar o PASSO 1
-- URL: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new
-- ============================================

-- Ativar extensão pgcrypto para hash de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Inserir Usuários
-- Senhas: admin123, director123, manager123
INSERT INTO "users" ("id", "email", "password_hash", "name", "role", "is_active", "created_at", "updated_at") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'owner@ejr.com', crypt('admin123', gen_salt('bf')), 'Dono da Empresa', 'OWNER', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'director@ejr.com', crypt('director123', gen_salt('bf')), 'Diretor', 'DIRECTOR', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'manager@ejr.com', crypt('manager123', gen_salt('bf')), 'Gerente', 'MANAGER', true, NOW(), NOW());

-- Inserir Produtos
INSERT INTO "products" ("id", "code", "name", "category", "manufacturer", "cost_price", "sale_price", "current_stock", "minimum_stock", "warranty_months", "created_at", "updated_at") VALUES
('650e8400-e29b-41d4-a716-446655440001', 'PROD-001', 'Notebook Dell Inspiron 15', 'Informática', 'Dell', 250000, 350000, 10, 3, 12, NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440002', 'PROD-002', 'Mouse Logitech MX Master 3', 'Periféricos', 'Logitech', 35000, 49900, 25, 5, 24, NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440003', 'PROD-003', 'Teclado Mecânico Keychron K2', 'Periféricos', 'Keychron', 45000, 65000, 15, 5, 12, NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440004', 'PROD-004', 'Monitor LG 27" 4K', 'Monitores', 'LG', 150000, 220000, 5, 2, 36, NOW(), NOW());

-- Inserir Clientes
INSERT INTO "customers" ("id", "type", "name", "document", "email", "phone", "created_at", "updated_at") VALUES
('750e8400-e29b-41d4-a716-446655440001', 'INDIVIDUAL', 'João Silva', '12345678901', 'joao.silva@email.com', '(11) 98765-4321', NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440002', 'BUSINESS', 'Tech Solutions LTDA', '12345678000199', 'contato@techsolutions.com', '(11) 3456-7890', NOW(), NOW());

-- Mensagem de sucesso
SELECT
    'Dados inseridos com sucesso!' as status,
    (SELECT COUNT(*) FROM users) as total_usuarios,
    (SELECT COUNT(*) FROM products) as total_produtos,
    (SELECT COUNT(*) FROM customers) as total_clientes;
