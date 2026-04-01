-- Muda unit_price de integer para numeric(15,4) em purchase_budget_quotes.
-- Necessário para evitar perda de precisão na conversão ida-e-volta
-- quando a moeda do orçamento é PYG ou USD (centavos BRL inteiros
-- não têm resolução suficiente para representar todos os valores PYG).

ALTER TABLE purchase_budget_quotes ALTER COLUMN unit_price TYPE numeric(15,4);
