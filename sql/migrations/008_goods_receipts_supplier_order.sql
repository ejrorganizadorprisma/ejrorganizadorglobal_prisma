-- Migration: Adicionar suporte a Supplier Orders no Goods Receipts
-- Data: 2025-12-10
-- Descrição: Permite vincular recebimentos (goods_receipts) aos pedidos do fornecedor (supplier_orders)
--            ao invés de apenas às ordens de compra (purchase_orders)

-- Adicionar coluna supplier_order_id na tabela goods_receipts
ALTER TABLE goods_receipts
ADD COLUMN IF NOT EXISTS supplier_order_id TEXT REFERENCES supplier_orders(id) ON DELETE SET NULL;

-- Adicionar índice para a nova coluna
CREATE INDEX IF NOT EXISTS idx_goods_receipts_supplier_order ON goods_receipts(supplier_order_id);

-- Adicionar coluna supplier_order_item_id na tabela goods_receipt_items
ALTER TABLE goods_receipt_items
ADD COLUMN IF NOT EXISTS supplier_order_item_id TEXT REFERENCES supplier_order_items(id) ON DELETE SET NULL;

-- Adicionar índice para a nova coluna
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_supplier_order_item ON goods_receipt_items(supplier_order_item_id);

-- Comentários explicativos
COMMENT ON COLUMN goods_receipts.supplier_order_id IS 'Referência ao pedido do fornecedor (supplier_order) associado a este recebimento';
COMMENT ON COLUMN goods_receipt_items.supplier_order_item_id IS 'Referência ao item do pedido do fornecedor (supplier_order_item) associado a este item de recebimento';
