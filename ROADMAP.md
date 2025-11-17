# Roadmap de Implementação - Sistema de Estoque EJR

## Status Atual

### ✅ CONCLUÍDO

#### 1. CRUD de Fornecedores
- Backend completo (API, Service, Repository, Controller)
- Frontend completo (Lista, Formulário, Validações)
- Schema validado com Zod
- Integração com PostgreSQL

#### 2. Schema Completo de Fornecedores
- Tabela suppliers no banco de dados
- Tipos TypeScript compartilhados
- Validações de CNPJ/CPF
- Campos de endereço e contato

#### Melhorias Implementadas (fora do roadmap original)
- ✅ Produtos podem ter preço de custo zero
- ✅ Sistema de upload de imagem com Supabase Storage
- ✅ Geração automática de código de produto (PROD-XXXX)
- ✅ Suporte a múltiplas URLs de imagem
- ✅ Validação permite preço >= 0 (em vez de > 0)
- ✅ URL de API configurável por ambiente (.env)
- ✅ Orçamento permite unitPrice = 0

---

### ⏸️ PENDENTE (Itens 3-13)

#### 3. Relacionamento Produto-Fornecedor
**Objetivo:** Permitir que produtos sejam associados a fornecedores
**Tarefas:**
- [ ] Criar tabela intermediária `product_suppliers`
- [ ] Adicionar campo `preferredSupplierId` em produtos
- [ ] API para vincular/desvincular fornecedores
- [ ] Interface para selecionar fornecedores no formulário de produto
- [ ] Exibir fornecedores na lista de produtos

#### 4. Sistema de Composição de Produtos
**Objetivo:** Produtos montados a partir de componentes (BOMs)
**Tarefas:**
- [ ] Implementar relacionamento many-to-many produto-componentes
- [ ] CRUD de product_parts (componentes de montagem)
- [ ] Cálculo automático de custo de montagem
- [ ] Interface para adicionar/remover componentes
- [ ] Validação de estoque de componentes

#### 5. CRUD de Clientes
**Objetivo:** Gerenciar cadastro de clientes
**Tarefas:**
- [ ] Schema de clientes (similar a fornecedores)
- [ ] Backend completo (API, Service, Repository, Controller)
- [ ] Frontend completo (Lista, Formulário)
- [ ] Validação de CPF/CNPJ
- [ ] Histórico de compras do cliente

#### 6. Sistema de Orçamentos
**Objetivo:** Criar e gerenciar orçamentos para clientes
**Tarefas:**
- [ ] Backend completo de quotes
- [ ] Frontend para criar orçamento
- [ ] Adicionar/remover itens do orçamento
- [ ] Cálculo automático de subtotal/desconto/total
- [ ] Estados: DRAFT, SENT, APPROVED, REJECTED, EXPIRED, CONVERTED
- [ ] Geração de PDF do orçamento
- [ ] Conversão de orçamento aprovado em pedido

#### 7. Gestão de Pedidos (Orders)
**Objetivo:** Controlar pedidos de venda
**Tarefas:**
- [ ] Schema de pedidos
- [ ] Backend completo (API, Service, Repository)
- [ ] Frontend de listagem e detalhes
- [ ] Estados: PENDING, CONFIRMED, IN_PRODUCTION, READY, DELIVERED, CANCELLED
- [ ] Integração com estoque (baixa automática)
- [ ] Histórico de status do pedido

#### 8. Ordem de Serviço
**Objetivo:** Gerenciar consertos e serviços técnicos
**Tarefas:**
- [ ] Backend completo de service orders
- [ ] Frontend para criar/editar OS
- [ ] Diagnóstico e serviço realizado
- [ ] Peças utilizadas na OS
- [ ] Cálculo de mão de obra + peças
- [ ] Estados: OPEN, AWAITING_PARTS, IN_SERVICE, AWAITING_APPROVAL, COMPLETED, CANCELLED
- [ ] Gestão de garantia

#### 9. Controle de Estoque Avançado
**Objetivo:** Movimentações e ajustes de estoque
**Tarefas:**
- [ ] Tabela de movimentações (stock_movements)
- [ ] Tipos: PURCHASE, SALE, ADJUSTMENT, TRANSFER, ASSEMBLY, DISASSEMBLY
- [ ] Histórico completo de movimentações
- [ ] Relatório de estoque por período
- [ ] Alertas de estoque baixo
- [ ] Inventário físico

#### 10. Dashboard e Relatórios
**Objetivo:** Visualização de métricas e KPIs
**Tarefas:**
- [ ] Dashboard principal com cards de resumo
- [ ] Gráfico de vendas por período
- [ ] Produtos mais vendidos
- [ ] Clientes top
- [ ] Estoque crítico
- [ ] Faturamento mensal
- [ ] Orçamentos em aberto

#### 11. Sistema de Notificações
**Objetivo:** Alertas e lembretes automáticos
**Tarefas:**
- [ ] Backend de notificações
- [ ] Tipos: STOCK_LOW, QUOTE_EXPIRING, ORDER_STATUS, etc.
- [ ] Centro de notificações no frontend
- [ ] Notificações por email (opcional)
- [ ] Marcar como lida/não lida

#### 12. Gestão de Usuários e Permissões
**Objetivo:** Controle de acesso baseado em roles
**Tarefas:**
- [ ] Roles: ADMIN, MANAGER, TECHNICIAN, SALESPERSON
- [ ] Middleware de autorização por role
- [ ] Frontend: proteger rotas por permissão
- [ ] CRUD de usuários (apenas ADMIN)
- [ ] Alteração de senha
- [ ] Log de auditoria

#### 13. Melhorias de UX/UI
**Objetivo:** Polimento e experiência do usuário
**Tarefas:**
- [ ] Feedback visual em todas as ações
- [ ] Loading states
- [ ] Confirmações de ações destrutivas
- [ ] Filtros e ordenação em todas as listagens
- [ ] Paginação consistente
- [ ] Responsividade mobile
- [ ] Temas claro/escuro (opcional)
- [ ] Atalhos de teclado

---

## Ações Pendentes

### ⚠️ Configuração Manual Necessária

1. **Políticas do Supabase Storage**
   - Acessar: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new
   - Executar os comandos SQL do arquivo: `/home/nmaldaner/projetos/estoque/apps/api/setup-storage-policies.cjs`
   - Políticas necessárias: INSERT (authenticated), SELECT (public), DELETE (authenticated)

---

## Padrões Estabelecidos

### Entrada de Valores Monetários
- **Formato:** Centavos (inteiros)
- **Entrada:** Direta, sem formatação (exemplo: 1500 = R$ 15,00)
- **Validação:** Permite zero (`>= 0`) - TODOS os campos de preço no sistema
- **Tipo de input:** `type="number"`
- **Sem máscaras** de moeda durante digitação
- **Campos padronizados:**
  - Produtos: `costPrice`, `salePrice`, `assemblyCost`
  - Orçamentos: `unitPrice`, `discount`
  - Ordens de Serviço: `laborCost`, `partsCost`, `totalCost`
  - Service Parts: `unitCost`, `totalCost`
- **Exceção:** Campos de quantidade (`quantity`) devem ser `> 0` (não aceita zero)

### Estrutura de Arquivos
```
apps/
  api/
    src/
      controllers/  # Recebe requests, chama services
      services/     # Lógica de negócio, validações
      repositories/ # Acesso ao banco de dados
      routes/       # Definição de rotas
      middleware/   # Auth, error handling
  web/
    src/
      pages/        # Páginas principais
      components/   # Componentes reutilizáveis
      services/     # Chamadas à API
packages/
  shared-types/   # Tipos e schemas compartilhados
```

### Stack Técnica
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + TypeScript + Vite
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Validação:** Zod
- **Autenticação:** JWT

---

## Como Usar Este Roadmap

Para retomar o desenvolvimento, diga:
- "Vamos implementar o item 3" (ou qualquer número)
- "Continuar com o roadmap"
- "Fazer o próximo item da lista"

Eu irei:
1. Criar todo list detalhada para o item
2. Implementar backend completo
3. Implementar frontend completo
4. Testar integração
5. Marcar como concluído

---

**Última atualização:** 2025-11-16
**Próximo item sugerido:** Item 3 - Relacionamento Produto-Fornecedor
