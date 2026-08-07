-- 062: preços de compra com precisão decimal (compra em Guarani/Dólar)
--
-- Todo valor de compras é gravado em CENTAVOS DE BRL. Quando o orçamento é
-- digitado em outra moeda, a conversão pelo câmbio produz frações de centavo:
--   Gs. 100 / 1204,82 = R$ 0,0830  →  8,3000 centavos
-- purchase_budget_quotes.unit_price já é numeric(15,4) e guarda isso corretamente,
-- mas ao transformar o orçamento em pedido o valor caía em colunas INTEGER e o
-- Postgres rejeitava: `invalid input syntax for type integer: "16.6"`.
--
-- Arredondar para inteiro não serve: 8,3 → 8 é 3,6% de erro no preço unitário,
-- que vira uma diferença enorme no total de uma compra em Guarani. Por isso as
-- colunas passam a numeric(15,4), como já era no orçamento de origem.
--
-- Os totais dos CABEÇALHOS (purchase_orders/supplier_orders .subtotal,
-- .total_amount) continuam INTEGER — lá o arredondamento é de menos de 1 centavo
-- sobre a soma e o código já arredonda antes de gravar.

ALTER TABLE purchase_order_items
  ALTER COLUMN unit_price  TYPE numeric(15,4),
  ALTER COLUMN total_price TYPE numeric(15,4);

ALTER TABLE supplier_order_items
  ALTER COLUMN unit_price  TYPE numeric(15,4),
  ALTER COLUMN total_price TYPE numeric(15,4);

-- Recebimento guarda o preço praticado no item recebido — mesma precisão
ALTER TABLE goods_receipt_items
  ALTER COLUMN unit_price TYPE numeric(15,4);

COMMENT ON COLUMN purchase_order_items.unit_price  IS 'Centavos de BRL (numeric p/ conversão de câmbio de orçamentos em PYG/USD)';
COMMENT ON COLUMN purchase_order_items.total_price IS 'Centavos de BRL (quantity * unit_price)';
COMMENT ON COLUMN supplier_order_items.unit_price  IS 'Centavos de BRL (numeric p/ conversão de câmbio)';
COMMENT ON COLUMN supplier_order_items.total_price IS 'Centavos de BRL (quantity * unit_price)';
COMMENT ON COLUMN goods_receipt_items.unit_price   IS 'Centavos de BRL (preço praticado no recebimento)';
