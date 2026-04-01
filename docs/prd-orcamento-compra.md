# PRD - Orçamento de Compra

**Versão:** 1.0
**Data:** 2026-03-28
**Autor:** Analyst Mary (BMad Method)
**Status:** Aprovado para desenvolvimento

---

## 1. Visão Geral

### 1.1 Objetivo
Criar o módulo **Orçamento de Compra** para o EJR Organizador, centralizando todo o fluxo de aquisição de produtos para alimentar o estoque. O módulo substitui os atuais Purchase Requests e Purchase Orders por um fluxo único e mais robusto, com suporte a cotações de fornecedores, comparação de preços e workflow de aprovação.

### 1.2 Problema
O sistema atual possui dois módulos separados (Requisições de Compra e Ordens de Compra) com fluxo fragmentado. Não há funcionalidade de cotação/comparação entre fornecedores, dificultando a tomada de decisão de compra.

### 1.3 Solução
Um módulo unificado com:
- Criação de orçamentos com cotações de múltiplos fornecedores
- Comparação de preços lado a lado
- Workflow de aprovação com delegação
- Conversão automática em Pedido (autorização interna)
- Integração com Recebimento (Goods Receipts) existente

---

## 2. Módulos Afetados

### 2.1 Removidos
- **Purchase Requests** (`/purchase-requests`) - substituído pelo Orçamento de Compra
- **Purchase Orders** (`/purchase-orders`) - substituído pelo Pedido (pós-aprovação)

### 2.2 Mantidos (com adaptação)
- **Goods Receipts** (`/goods-receipts`) - vincula ao novo Pedido em vez de PO
- **Suppliers** (`/suppliers`) - sem alteração, usado nas cotações
- **Permissions** - novas permissões para o módulo

### 2.3 Novo
- **Orçamento de Compra** (`/purchase-budgets`) - módulo completo

---

## 3. Fluxo de Negócio

### 3.1 Diagrama de Estados

```
┌─────────────┐
│   RASCUNHO  │  (criação, edição livre)
│   (DRAFT)   │
└──────┬──────┘
       │ Enviar para aprovação
       ▼
┌─────────────┐
│  PENDENTE   │  (aguardando aprovador)
│  (PENDING)  │
└──────┬──────┘
       │
  ┌────┴────┐
  ▼         ▼
┌──────┐  ┌──────────┐
│APROV.│  │REJEITADO │  (aprovador rejeita com motivo)
│(APPR)│  │(REJECTED)│
└──┬───┘  └────┬─────┘
   │           │ Pode reabrir como DRAFT
   ▼           ▼
┌─────────────┐
│   PEDIDO    │  (autorização interna gerada)
│  (ORDERED)  │
└──────┬──────┘
       │ Alguém realiza a compra
       ▼
┌─────────────┐
│  COMPRADO   │  (compra realizada externamente)
│ (PURCHASED) │
└──────┬──────┘
       │ Mercadoria chega
       ▼
┌─────────────┐
│  RECEBIDO   │  (vinculado ao Goods Receipt)
│ (RECEIVED)  │
└─────────────┘

Em qualquer momento (exceto RECEBIDO):
┌─────────────┐
│ CANCELADO   │
│(CANCELLED)  │
└─────────────┘
```

### 3.2 Fluxo Detalhado

1. **Criação do Orçamento (DRAFT)**
   - Usuário com permissão cria um orçamento
   - Adiciona itens (produtos do catálogo ou itens manuais)
   - Para cada item, pode adicionar cotações de diferentes fornecedores
   - Compara preços e seleciona o fornecedor preferido por item
   - Define fornecedor principal do orçamento
   - Regra: **um orçamento = um fornecedor final**

2. **Cotação de Fornecedores**
   - Para cada item, o usuário pode registrar cotações de N fornecedores
   - Campos por cotação: fornecedor, preço unitário, prazo de entrega, condições, validade
   - Visualização comparativa lado a lado
   - Seleção do melhor fornecedor por item
   - Ao final, o sistema valida que todos os itens selecionados são do mesmo fornecedor
   - Ou: o usuário define o fornecedor do orçamento e filtra cotações

3. **Envio para Aprovação (PENDING)**
   - Usuário submete o orçamento
   - Não pode mais editar (somente leitura)
   - Aprovador recebe notificação

4. **Aprovação (APPROVED)**
   - Admin ou delegado revisa o orçamento
   - Pode aprovar ou rejeitar (com justificativa)
   - Se aprovado, gera automaticamente um **Pedido** (autorização interna)
   - Se rejeitado, pode ser reaberto como DRAFT para ajustes

5. **Pedido / Autorização Interna (ORDERED)**
   - Registro interno de que a compra está autorizada
   - Número de pedido gerado automaticamente
   - Quem está autorizado pode realizar a compra externamente

6. **Comprado (PURCHASED)**
   - Alguém marca manualmente que a compra foi realizada
   - Registra: data da compra, NF/recibo, quem comprou
   - Aguarda recebimento da mercadoria

7. **Recebimento (RECEIVED)**
   - Vincula ao módulo Goods Receipts existente
   - Quando o recebimento é aprovado, estoque atualizado
   - Status final do orçamento

---

## 4. Requisitos Funcionais

### 4.1 Orçamento de Compra

#### RF-01: Criação de Orçamento
- Número automático: `ORC-AAMM-XXXX` (ano, mês, sequencial)
- Campos: título, descrição, justificativa, prioridade, departamento
- Lista de itens com: produto, quantidade, unidade, observações
- Fornecedor do orçamento (definido após cotação)
- Data limite para cotação

#### RF-02: Cotação de Fornecedores
- Para cada item, registrar cotações de múltiplos fornecedores
- Campos da cotação: fornecedor, preço unitário, prazo entrega (dias), condições de pagamento, validade da cotação, observações
- Comparação visual lado a lado (tabela comparativa)
- Seleção do fornecedor vencedor por item
- Cálculo automático do total por fornecedor

#### RF-03: Envio para Aprovação
- Validação: todos os itens devem ter pelo menos uma cotação
- Validação: fornecedor do orçamento deve estar definido
- Bloqueia edição após envio
- Gera notificação para aprovadores

#### RF-04: Aprovação / Rejeição
- Admin ou delegado pode aprovar/rejeitar
- Rejeição exige justificativa
- Aprovação gera Pedido automaticamente
- Rejeição permite reabrir como DRAFT

#### RF-05: Registro de Compra
- Marcar orçamento/pedido como "comprado"
- Campos: data da compra, número NF/recibo, quem realizou, valor final pago
- Permite diferença entre valor orçado e valor pago

#### RF-06: Vínculo com Recebimento
- Pedido comprado pode gerar um Goods Receipt
- Goods Receipt atualiza status para RECEIVED
- Estoque atualizado automaticamente (fluxo existente)

### 4.2 Permissões

#### RF-07: Permissões Granulares
- **Página:** `purchase_budgets`
- **Ações:**
  - `view` - Visualizar orçamentos
  - `create` - Criar novos orçamentos
  - `edit` - Editar orçamentos em DRAFT
  - `delete` - Excluir orçamentos
  - `approve` - Aprovar/rejeitar orçamentos
  - `purchase` - Marcar como comprado

#### RF-08: Delegação de Aprovação
- Admin pode delegar poder de aprovação a qualquer usuário ativo
- Delegação é temporária (com data de início e fim)
- Lista de delegações ativas visível para o admin
- Delegado recebe notificações de orçamentos pendentes
- Admin pode revogar delegação a qualquer momento

### 4.3 Notificações

#### RF-09: Notificações Automáticas
- Orçamento enviado para aprovação → notifica aprovadores
- Orçamento aprovado → notifica criador
- Orçamento rejeitado → notifica criador (com motivo)
- Pedido marcado como comprado → notifica equipe de estoque
- Delegação criada/revogada → notifica delegado

---

## 5. Requisitos Não-Funcionais

### RNF-01: Performance
- Listagem de orçamentos com paginação (10/25/50 por página)
- Comparação de cotações deve carregar em < 2s

### RNF-02: Responsividade
- Todas as telas devem funcionar em desktop e tablet
- Tabela comparativa de cotações com scroll horizontal em telas menores

### RNF-03: Auditoria
- Registrar quem criou, enviou, aprovou/rejeitou, comprou
- Timestamps em todas as transições de estado
- Histórico de alterações

### RNF-04: Integridade
- Não permitir deletar orçamentos em status PURCHASED ou RECEIVED
- Não permitir editar orçamentos após envio para aprovação
- Validar que fornecedor está ativo antes de aprovar

---

## 6. Telas / Páginas

### 6.1 Lista de Orçamentos (`/purchase-budgets`)
- Filtros: status, prioridade, fornecedor, período, criador
- Colunas: número, título, fornecedor, total, status, prioridade, data, criador
- Ações rápidas: ver, editar (se DRAFT), aprovar (se PENDING)
- Badge com contagem de pendentes para aprovadores

### 6.2 Formulário de Orçamento (`/purchase-budgets/new` e `/purchase-budgets/:id/edit`)
- Dados gerais: título, descrição, justificativa, prioridade, departamento
- Lista de itens com busca de produto
- Seção de cotações por item (expandível)
- Seleção de fornecedor
- Resumo com totais
- Botões: Salvar Rascunho, Enviar para Aprovação

### 6.3 Detalhe do Orçamento (`/purchase-budgets/:id`)
- Visualização completa do orçamento
- Tabela comparativa de cotações
- Histórico de status
- Ações contextuais por status:
  - DRAFT: Editar, Enviar, Cancelar
  - PENDING: Aprovar, Rejeitar (se aprovador)
  - APPROVED/ORDERED: Marcar como Comprado
  - PURCHASED: Criar Recebimento

### 6.4 Delegações de Aprovação (`/purchase-budgets/delegations`)
- Lista de delegações ativas/expiradas
- Formulário: selecionar usuário, data início, data fim
- Botão revogar

---

## 7. Integrações

### 7.1 Fornecedores (Suppliers)
- Busca de fornecedores na cotação
- Usa preços de `product_suppliers` como sugestão

### 7.2 Produtos (Products)
- Busca de produtos nos itens do orçamento
- Exibe estoque atual para contexto

### 7.3 Recebimento (Goods Receipts)
- Pedido comprado pode gerar Goods Receipt
- Campo `purchase_budget_id` no goods_receipts
- Fluxo de recebimento e atualização de estoque mantido

### 7.4 Notificações
- Usa sistema de notificações existente
- Novos tipos de notificação para o módulo

---

## 8. Migração / Remoção

### 8.1 Módulos a Remover
- **Purchase Requests**: remover rotas, páginas, sidebar, permissões
- **Purchase Orders**: remover rotas, páginas, sidebar, permissões

### 8.2 Dados Existentes
- Manter tabelas antigas no banco (não deletar dados históricos)
- Remover apenas o acesso via interface e API
- Documentar que dados antigos estão nas tabelas `purchase_requests` e `purchase_orders`

### 8.3 Goods Receipts
- Adicionar campo `purchase_budget_id` como alternativa a `purchase_order_id`
- Manter compatibilidade com recebimentos antigos vinculados a POs

---

## 9. Critérios de Aceitação

- [ ] Usuário com permissão pode criar orçamento com itens
- [ ] Pode adicionar cotações de múltiplos fornecedores por item
- [ ] Comparação visual de cotações funciona
- [ ] Envio para aprovação bloqueia edição
- [ ] Admin pode aprovar/rejeitar com justificativa
- [ ] Aprovação gera pedido (autorização interna)
- [ ] Admin pode delegar aprovação temporariamente
- [ ] Delegado recebe notificações e pode aprovar
- [ ] Pode marcar pedido como "comprado"
- [ ] Pedido comprado pode gerar Goods Receipt
- [ ] Recebimento aprovado atualiza estoque
- [ ] Permissões granulares funcionam por ação
- [ ] Purchase Requests e Purchase Orders removidos da interface
- [ ] Notificações disparadas em cada transição
