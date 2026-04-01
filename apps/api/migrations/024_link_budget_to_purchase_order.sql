-- Migration: Vincular orçamentos de compra aos pedidos de compra
-- Data: 2026-03-28

-- Adiciona coluna para vincular o pedido ao orçamento de compra de origem
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS purchase_budget_id TEXT REFERENCES purchase_budgets(id) ON DELETE SET NULL;

-- Índice para busca rápida de pedidos por orçamento
CREATE INDEX IF NOT EXISTS idx_purchase_orders_budget_id ON purchase_orders(purchase_budget_id);
