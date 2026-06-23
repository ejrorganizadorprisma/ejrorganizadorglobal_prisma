-- 050: Pedido Mínimo (R$) no Orçamento de Compras
-- Auto-preenchido a partir do fornecedor selecionado, editável e persistido no orçamento.
-- Valor em centavos (padrão do projeto). Idempotente.

ALTER TABLE purchase_budgets ADD COLUMN IF NOT EXISTS minimum_order_value INTEGER DEFAULT 0;
