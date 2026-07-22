-- Moeda em que o frete será pago (escolhida na coleta). O valor continua em
-- sales.shipping_cost, agora no formato da moeda escolhida (PYG inteiro; BRL/USD
-- em centavos). freight_currency guarda qual moeda para exibir corretamente.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS freight_currency TEXT; -- 'BRL' | 'PYG' | 'USD'
