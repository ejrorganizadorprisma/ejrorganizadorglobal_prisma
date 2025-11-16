# Database Migration Scripts

Esta pasta contém todos os scripts SQL para criar e gerenciar o banco de dados do EJR Organizador.

## 📋 Ordem de Execução

Execute os scripts **NA ORDEM** no SQL Editor do Supabase:

### Opção 1: Instalação Completa (Banco Novo)

Execute todos os scripts em ordem:

1. `01_create_types.sql` - Cria os tipos ENUM
2. `02_create_users_table.sql` - Cria tabela de usuários
3. `03_create_products_table.sql` - Cria tabela de produtos
4. `04_create_customers_table.sql` - Cria tabela de clientes
5. `05_create_quotes_tables.sql` - Cria tabelas de orçamentos
6. `06_create_suppliers_table.sql` - Cria tabela de fornecedores
7. `07_create_notifications_table.sql` - Cria tabela de notificações
8. `08_create_inventory_movements_table.sql` - Cria tabela de movimentações
9. `09_create_functions.sql` - Cria funções SQL
10. `10_create_triggers.sql` - Cria triggers
11. `11_seed_data.sql` - Popula dados de exemplo

### Opção 2: Banco com Dados Existentes

Todos os scripts são **idempotentes** (podem ser executados múltiplas vezes sem erro).
Execute apenas os scripts das tabelas/funções que estão faltando.

### Opção 3: Começar do Zero (⚠️ CUIDADO!)

Se você quer **APAGAR TUDO** e começar do zero:

1. `00_drop_all_tables.sql` - ⚠️ APAGA TODAS AS TABELAS E DADOS
2. Execute todos os scripts de 01 a 11 em ordem

## 🔐 Credenciais do Admin

Após executar os scripts, você pode fazer login com:

- **Email:** admin@ejr.com
- **Senha:** admin123

## 🏗️ Estrutura do Banco

### Tabelas Principais
- `users` - Usuários do sistema
- `products` - Produtos do estoque
- `customers` - Clientes
- `quotes` + `quote_items` - Orçamentos
- `suppliers` - Fornecedores
- `notifications` - Notificações
- `inventory_movements` - Movimentações de estoque

### Funções RPC
- `update_product_stock()` - Atualiza estoque de produto
- `get_inventory_summary()` - Retorna resumo do inventário

### Tipos ENUM
- `UserRole` - Papéis de usuário (OWNER, DIRECTOR, MANAGER, etc.)
- `ProductStatus` - Status de produto (ACTIVE, INACTIVE, DISCONTINUED)
- `CustomerType` - Tipo de cliente (INDIVIDUAL, BUSINESS)
- `QuoteStatus` - Status de orçamento (DRAFT, SENT, APPROVED, etc.)

## 🔒 Segurança

Todos os scripts incluem:
- Row Level Security (RLS) habilitado
- Políticas de acesso configuradas
- Validações com CHECK constraints
- Índices para performance

## 📝 Notas

- Todos os IDs são do tipo TEXT (não UUID)
- Os scripts usam `CREATE IF NOT EXISTS` para serem seguros
- Foreign keys são criadas com verificação de existência
- Timestamps usam `CURRENT_TIMESTAMP` ou `NOW()`
