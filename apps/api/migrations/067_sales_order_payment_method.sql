-- 067: forma de pagamento no Pedido de Venda
--
-- O vendedor escolhe a forma ao registrar o pedido (entre as aceitas no
-- cadastro do cliente); o administrativo pode ajustar no "Confirmar
-- Recebimento"; a tela de Faturar usa essa forma como padrão.
-- NULL = pedido antigo / sem forma informada (Faturar cai na 1ª aceita).

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT;
