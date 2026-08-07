-- 065: página 'financial' na matriz de permissões
--
-- O menu Financeiro (caixa, contas a pagar/receber, devedores, despesas) usava
-- a página 'sales' como permissão. Resultado: o vendedor via os itens no menu e
-- só descobria que não podia entrar quando a API respondia 403.
--
-- Agora existe a página própria 'financial'. Ela é concedida aos papéis que já
-- tinham acesso de fato (a API sempre exigiu OWNER/DIRECTOR/MANAGER), para que
-- ninguém perca acesso ao aplicar esta migration.

UPDATE permissions_config
SET config = jsonb_set(
      config::jsonb,
      '{permissions}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN role_entry->>'role' IN ('OWNER', 'DIRECTOR', 'MANAGER')
             AND NOT (role_entry->'pages' ? 'financial')
              THEN jsonb_set(role_entry, '{pages}', (role_entry->'pages') || '"financial"'::jsonb)
            ELSE role_entry
          END
        )
        FROM jsonb_array_elements(config::jsonb->'permissions') AS role_entry
      )
    ),
    updated_at = NOW()
WHERE config::jsonb ? 'permissions';
