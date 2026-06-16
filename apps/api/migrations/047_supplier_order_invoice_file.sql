-- 047: Anexo da Nota Fiscal no pedido (PDF ou imagem)
-- Armazena a URL/caminho do arquivo e o nome original. Idempotente.

ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS invoice_file_url TEXT;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS invoice_file_name TEXT;
