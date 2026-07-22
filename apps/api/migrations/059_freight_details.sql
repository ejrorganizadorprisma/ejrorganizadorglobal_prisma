-- Detalhes do frete registrados na Coleta (além da transportadora/valor/rastreio
-- que já existem em sales): modalidade CIF/FOB e previsão de entrega ao cliente.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS freight_mode TEXT;       -- 'CIF' (remetente paga) | 'FOB' (destinatário paga)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_forecast DATE;  -- previsão de entrega ao cliente
