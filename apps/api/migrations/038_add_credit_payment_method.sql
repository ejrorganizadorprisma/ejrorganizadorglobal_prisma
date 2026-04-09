-- Adiciona CREDIT como valor separado de CREDIT_CARD no enum PaymentMethod.
-- CREDIT  = Crédito (crediário/fiado — pagamento a prazo com creditMaxDays)
-- CREDIT_CARD = Cartão de Crédito (pagamento por cartão, processado pelo banco)
--
-- Até v1.4.1 os dois conceitos eram conflitados: CREDIT_CARD era exibido
-- como "Crédito" no formulário de cliente mas como "Cartão de Crédito" na
-- venda. Esta migration separa os dois.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREDIT';
