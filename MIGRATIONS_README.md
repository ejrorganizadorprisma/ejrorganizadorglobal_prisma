# Database Migrations - EJR Organizador

## Arquivos de Migração

- `supabase-migrations.sql` - Migração completa para criar tabelas e funções faltantes

## Como Executar as Migrações

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole o conteúdo de `supabase-migrations.sql`
6. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

```bash
# Certifique-se de ter o Supabase CLI instalado
npm install -g supabase

# Execute a migração
supabase db push --db-url "sua-connection-string"
```

### Opção 3: Via psql

```bash
# Conecte ao banco de dados
psql "sua-connection-string"

# Execute a migração
\i supabase-migrations.sql
```

## O Que Será Criado

### Tabelas

1. **notifications** - Sistema de notificações para usuários
   - Notificações de estoque baixo
   - Notificações de orçamentos pendentes
   - Notificações de vendas completadas

2. **suppliers** - Gerenciamento de fornecedores
   - Informações de contato
   - Documentos (CNPJ/CPF)
   - Status ativo/inativo

3. **inventory_movements** - Histórico de movimentações de estoque
   - Entrada/Saída
   - Ajustes
   - Vendas e compras
   - Referências a vendas/orçamentos

### Funções (RPC)

1. **update_product_stock** - Atualiza estoque de forma atômica
   - Previne condições de corrida
   - Cria registro de movimentação automaticamente
   - Gera notificação de estoque baixo quando necessário
   - Parâmetros:
     - `p_product_id` (UUID) - ID do produto
     - `p_quantity` (INTEGER) - Quantidade a adicionar/remover (negativo para remoção)
     - `p_user_id` (UUID) - ID do usuário que fez a alteração
     - `p_type` (VARCHAR) - Tipo de movimentação (IN, OUT, SALE, etc.)
     - `p_reason` (TEXT) - Motivo da movimentação
     - `p_reference_id` (UUID) - ID de referência (venda, compra, etc.)
     - `p_reference_type` (VARCHAR) - Tipo de referência (SALE, QUOTE, etc.)

2. **get_inventory_summary** - Retorna resumo do inventário
   - Total de produtos
   - Valor total do estoque
   - Quantidade de produtos com estoque baixo
   - Quantidade de produtos sem estoque

### Recursos de Segurança

- **Row Level Security (RLS)** habilitado em todas as tabelas
- Políticas de acesso baseadas em roles
- Triggers para atualização automática de timestamps
- Índices para performance

## Verificação Pós-Migração

Execute estas queries para verificar se tudo foi criado corretamente:

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'suppliers', 'inventory_movements');

-- Verificar funções
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_product_stock', 'get_inventory_summary');

-- Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'suppliers', 'inventory_movements');
```

## Rollback (Caso necessário)

Para reverter as mudanças:

```sql
-- Remover funções
DROP FUNCTION IF EXISTS update_product_stock;
DROP FUNCTION IF EXISTS get_inventory_summary;

-- Remover tabelas (CUIDADO: isso apagará todos os dados!)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
```

## Próximos Passos

Após executar as migrações:

1. ✅ Tabelas criadas
2. ✅ Funções RPC criadas
3. ✅ Repositórios atualizados para usar as funções
4. 🔄 Testar endpoints da API
5. 🔄 Implementar frontend para novas funcionalidades

## Suporte

Se encontrar problemas durante a migração, verifique:

1. Permissões do usuário no banco de dados
2. Conexão com o Supabase
3. Logs de erro no Supabase Dashboard
4. Se as tabelas `users` e `products` já existem (são dependências)
