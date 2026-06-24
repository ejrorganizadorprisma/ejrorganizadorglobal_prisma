-- 054: Dados estruturados da Nota Fiscal no pedido (supplier_orders)
-- Permite lançar a NF (número, data, valor) já na edição do pedido, antes do
-- recebimento. Esses dados pré-preenchem o modal de recebimento e aparecem no
-- card da página de Recebimentos. Idempotente.
-- invoice_amount em centavos de BRL (integer), igual a goods_receipts.invoice_amount.

ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS invoice_amount INTEGER;
