-- 066: faturamento com ou sem Nota Fiscal
--
-- system_settings.invoice_without_nf_enabled: o admin do sistema habilita a
--   opção "Faturar sem Nota Fiscal" na tela de faturamento (padrão: desligada,
--   comportamento atual = NF obrigatória).
-- sales.invoiced_without_nf: marca a venda faturada sem NF. Nesses casos
--   nf_number fica NULL, então a sugestão do próximo número de NF
--   (sales.repository.getLastNfNumber, que ignora NULL) não avança.

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS invoice_without_nf_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoiced_without_nf BOOLEAN NOT NULL DEFAULT FALSE;
