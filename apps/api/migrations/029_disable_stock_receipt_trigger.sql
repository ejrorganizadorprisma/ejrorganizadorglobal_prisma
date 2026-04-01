-- Remove o trigger que atualiza estoque automaticamente ao alterar quantity_accepted
-- em goods_receipt_items. O estoque já é atualizado explicitamente no código da aplicação
-- via update_product_stock() em approveReceipt(), causando duplicação (estoque dobrado).

DROP TRIGGER IF EXISTS trg_update_stock_on_receipt ON goods_receipt_items;
DROP FUNCTION IF EXISTS update_stock_on_receipt();
