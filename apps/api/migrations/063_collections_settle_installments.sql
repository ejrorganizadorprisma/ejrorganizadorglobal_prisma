-- 063: cobrança do vendedor dá baixa na parcela da venda
--
-- Antes, `collections` (o vendedor recebe do cliente em campo) e `sale_payments`
-- (as parcelas da venda) viviam separados: o cliente pagava, a cobrança era
-- aprovada e depositada, mas a parcela continuava PENDENTE — o cliente seguia
-- aparecendo como inadimplente e o mesmo dinheiro era contado duas vezes no caixa
-- (uma como `collections DEPOSITED`, outra quando alguém baixava a parcela na mão).
--
-- Agora aprovar a cobrança abate as parcelas em aberto da venda, da mais antiga
-- para a mais nova. Cada abatimento fica registrado em `collection_allocations`
-- para que rejeitar/estornar a cobrança desfaça exatamente o que ela fez.

-- Quanto da parcela já foi quitado. Permite cobrança que cobre só parte da
-- parcela (ou que sobra e escorre para a próxima).
ALTER TABLE sale_payments
  ADD COLUMN IF NOT EXISTS paid_amount integer NOT NULL DEFAULT 0;

-- Parcelas já quitadas antes desta migration: paid_amount = amount
UPDATE sale_payments SET paid_amount = amount WHERE status = 'PAID' AND paid_amount = 0;

COMMENT ON COLUMN sale_payments.paid_amount IS 'Valor já quitado da parcela (baixa manual ou via cobrança). status=PAID quando alcança amount.';

-- Rastro de cada abatimento feito por uma cobrança
CREATE TABLE IF NOT EXISTS collection_allocations (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  collection_id   text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  sale_payment_id text NOT NULL REFERENCES sale_payments(id) ON DELETE CASCADE,
  amount          integer NOT NULL CHECK (amount > 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_allocations_collection ON collection_allocations(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_allocations_payment    ON collection_allocations(sale_payment_id);

COMMENT ON TABLE collection_allocations IS 'Quanto de cada cobrança foi aplicado em cada parcela — base do estorno.';
