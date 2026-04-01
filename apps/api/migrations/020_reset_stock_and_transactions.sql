-- Script para limpar dados transacionais e zerar estoque dos produtos
-- CUIDADO: Este script apaga dados transacionais permanentemente!

-- Desabilitar triggers temporariamente se necessário
-- SET session_replication_role = replica;

-- 1. Limpar tabelas de produção (ordem importa por causa das FKs)
DELETE FROM unit_tests;
DELETE FROM unit_components;
DELETE FROM production_units;
DELETE FROM production_history;
DELETE FROM component_releases;
DELETE FROM production_batches;
DELETE FROM production_material_consumption;
DELETE FROM production_reportings;
DELETE FROM production_operations;
DELETE FROM production_orders;

-- 2. Limpar tabelas de recebimento de mercadorias
DELETE FROM goods_receipt_items;
DELETE FROM goods_receipts;

-- 3. Limpar tabelas de pedidos ao fornecedor
DELETE FROM supplier_order_items;
DELETE FROM supplier_orders;

-- 4. Limpar tabelas de compras
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM purchase_request_items;
DELETE FROM purchase_requests;

-- 5. Limpar tabelas de vendas
DELETE FROM sale_payments;
DELETE FROM sale_items;
DELETE FROM sales;

-- 6. Limpar tabelas de orçamentos
DELETE FROM quote_items;
DELETE FROM quotes;

-- 7. Limpar tabelas de ordens de serviço
DELETE FROM service_parts;
DELETE FROM service_orders;

-- 8. Limpar tabelas de estoque/inventário
DELETE FROM stock_adjustment_history;
DELETE FROM stock_reservations;
DELETE FROM inventory_movements;

-- 9. Limpar notificações
DELETE FROM notifications;

-- 10. Zerar estoque de todos os produtos
UPDATE products SET current_stock = 0;

-- Reabilitar triggers
-- SET session_replication_role = DEFAULT;

-- Mensagem de confirmação
SELECT 'Limpeza concluída! Todos os estoques foram zerados.' as resultado;
