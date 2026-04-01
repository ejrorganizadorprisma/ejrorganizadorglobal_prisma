# Arquitetura Técnica - Orçamento de Compra

**Versão:** 1.0
**Data:** 2026-03-28
**Autor:** Architect Winston (BMad Method)
**PRD:** docs/prd-orcamento-compra.md

---

## 1. Visão Geral da Arquitetura

### Stack (mantém padrão existente)
- **Backend:** Express + TypeScript + PostgreSQL (pg direto)
- **Frontend:** React 18 + TanStack Query + Tailwind CSS + React Router v6
- **Monorepo:** pnpm workspaces com shared-types

### Módulos Novos
- `purchase-budgets` - Orçamento de Compra (principal)
- `approval-delegations` - Delegações de aprovação

### Módulos Removidos (da interface)
- `purchase-requests` - Remover rotas, sidebar, permissões
- `purchase-orders` - Remover rotas, sidebar, permissões

---

## 2. Banco de Dados

### 2.1 Tabela: `purchase_budgets`

```sql
CREATE TABLE purchase_budgets (
  id TEXT PRIMARY KEY,
  budget_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  justification TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  department TEXT,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'PURCHASED', 'RECEIVED', 'CANCELLED')),
  total_amount INTEGER NOT NULL DEFAULT 0,

  -- Aprovação
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP(3),
  rejection_reason TEXT,

  -- Compra
  purchased_by TEXT REFERENCES users(id),
  purchased_at TIMESTAMP(3),
  invoice_number TEXT,
  final_amount INTEGER,

  -- Auditoria
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_budgets_status ON purchase_budgets(status);
CREATE INDEX idx_purchase_budgets_supplier ON purchase_budgets(supplier_id);
CREATE INDEX idx_purchase_budgets_created_by ON purchase_budgets(created_by);
CREATE INDEX idx_purchase_budgets_number ON purchase_budgets(budget_number);

CREATE TRIGGER update_purchase_budgets_updated_at
  BEFORE UPDATE ON purchase_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Tabela: `purchase_budget_items`

```sql
CREATE TABLE purchase_budget_items (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES purchase_budgets(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'UNIT',
  notes TEXT,
  selected_quote_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pb_items_budget ON purchase_budget_items(budget_id);
CREATE INDEX idx_pb_items_product ON purchase_budget_items(product_id);
```

### 2.3 Tabela: `purchase_budget_quotes`

```sql
CREATE TABLE purchase_budget_quotes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES purchase_budget_items(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  unit_price INTEGER NOT NULL,
  lead_time_days INTEGER,
  payment_terms TEXT,
  validity_date DATE,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pb_quotes_item ON purchase_budget_quotes(item_id);
CREATE INDEX idx_pb_quotes_supplier ON purchase_budget_quotes(supplier_id);
```

### 2.4 Tabela: `approval_delegations`

```sql
CREATE TABLE approval_delegations (
  id TEXT PRIMARY KEY,
  delegated_by TEXT NOT NULL REFERENCES users(id),
  delegated_to TEXT NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delegations_to ON approval_delegations(delegated_to);
CREATE INDEX idx_delegations_active ON approval_delegations(is_active, start_date, end_date);
```

### 2.5 Adaptação: `goods_receipts`

```sql
ALTER TABLE goods_receipts
ADD COLUMN IF NOT EXISTS purchase_budget_id TEXT REFERENCES purchase_budgets(id);

CREATE INDEX idx_gr_budget ON goods_receipts(purchase_budget_id);
```

### 2.6 Gerador de número automático

```sql
CREATE OR REPLACE FUNCTION generate_budget_number()
RETURNS TEXT AS $$
DECLARE
  seq_num INTEGER;
  year_month TEXT;
  budget_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYMM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(budget_number FROM 10) AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM purchase_budgets
  WHERE budget_number LIKE 'ORC-' || year_month || '-%';

  budget_num := 'ORC-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN budget_num;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. API - Endpoints

### 3.1 Purchase Budgets

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/purchase-budgets` | Listar orçamentos (paginado + filtros) | authenticate |
| GET | `/purchase-budgets/:id` | Detalhe do orçamento com itens e cotações | authenticate |
| POST | `/purchase-budgets` | Criar orçamento (DRAFT) | authenticate |
| PUT | `/purchase-budgets/:id` | Atualizar orçamento (só DRAFT) | authenticate |
| DELETE | `/purchase-budgets/:id` | Excluir orçamento | authorize(OWNER) |
| POST | `/purchase-budgets/:id/submit` | Enviar para aprovação (DRAFT→PENDING) | authenticate |
| POST | `/purchase-budgets/:id/approve` | Aprovar (PENDING→APPROVED→ORDERED) | authenticate* |
| POST | `/purchase-budgets/:id/reject` | Rejeitar (PENDING→REJECTED) | authenticate* |
| POST | `/purchase-budgets/:id/reopen` | Reabrir (REJECTED→DRAFT) | authenticate |
| POST | `/purchase-budgets/:id/purchase` | Marcar comprado (ORDERED→PURCHASED) | authenticate |
| POST | `/purchase-budgets/:id/cancel` | Cancelar orçamento | authenticate |

*authenticate = valida se é admin OU delegado ativo

### 3.2 Budget Items

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/purchase-budgets/:id/items` | Listar itens do orçamento |
| POST | `/purchase-budgets/:id/items` | Adicionar item |
| PUT | `/purchase-budgets/items/:itemId` | Atualizar item |
| DELETE | `/purchase-budgets/items/:itemId` | Remover item |

### 3.3 Budget Quotes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/purchase-budgets/items/:itemId/quotes` | Listar cotações do item |
| POST | `/purchase-budgets/items/:itemId/quotes` | Adicionar cotação |
| PUT | `/purchase-budgets/quotes/:quoteId` | Atualizar cotação |
| DELETE | `/purchase-budgets/quotes/:quoteId` | Remover cotação |
| POST | `/purchase-budgets/items/:itemId/select-quote/:quoteId` | Selecionar cotação vencedora |

### 3.4 Approval Delegations

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/approval-delegations` | Listar delegações | authorize(OWNER) |
| POST | `/approval-delegations` | Criar delegação | authorize(OWNER) |
| DELETE | `/approval-delegations/:id` | Revogar delegação | authorize(OWNER) |
| GET | `/approval-delegations/active` | Delegações ativas (para verificação) |

---

## 4. Backend - Estrutura de Arquivos

```
apps/api/src/
├── repositories/
│   ├── purchase-budgets.repository.ts    # CRUD + queries
│   └── approval-delegations.repository.ts
├── services/
│   ├── purchase-budgets.service.ts       # Regras de negócio
│   └── approval-delegations.service.ts
├── controllers/
│   ├── purchase-budgets.controller.ts    # HTTP handlers
│   └── approval-delegations.controller.ts
├── routes/
│   ├── purchase-budgets.routes.ts        # Rotas Express
│   └── approval-delegations.routes.ts
└── migrations/
    └── 024_create_purchase_budgets.sql   # Migration única
```

---

## 5. Frontend - Estrutura de Arquivos

```
apps/web/src/
├── hooks/
│   ├── usePurchaseBudgets.ts             # React Query hooks
│   └── useApprovalDelegations.ts
├── pages/
│   ├── PurchaseBudgetsPage.tsx           # Lista com filtros
│   ├── PurchaseBudgetFormPage.tsx        # Criar/Editar
│   ├── PurchaseBudgetDetailPage.tsx      # Detalhe + ações
│   └── ApprovalDelegationsPage.tsx       # Gerenciar delegações
└── components/ (se necessário)
    └── QuoteComparisonTable.tsx          # Tabela comparativa
```

---

## 6. Frontend - Telas

### 6.1 Lista `/purchase-budgets`
- Filtros: status, prioridade, fornecedor, período
- Colunas: N., Título, Fornecedor, Total, Status, Prioridade, Data, Criador
- Badge de pendentes para aprovadores
- Ações contextuais por status

### 6.2 Formulário `/purchase-budgets/new` e `/:id/edit`
- **Seção 1:** Dados gerais (título, descrição, justificativa, prioridade, departamento)
- **Seção 2:** Itens (tabela editável com busca de produtos)
- **Seção 3:** Cotações por item (expansível, adicionar N fornecedores)
- **Seção 4:** Seleção de fornecedor + resumo de totais
- Botões: Salvar Rascunho | Enviar para Aprovação

### 6.3 Detalhe `/purchase-budgets/:id`
- Dados do orçamento (somente leitura)
- Itens com cotações (tabela comparativa visual)
- Histórico de status (timeline)
- Botões de ação conforme status:
  - DRAFT: Editar, Enviar, Cancelar
  - PENDING: Aprovar, Rejeitar (se aprovador)
  - ORDERED: Marcar Comprado
  - PURCHASED: Criar Recebimento (link para Goods Receipts)

### 6.4 Delegações `/purchase-budgets/delegations`
- Lista de delegações com status (ativa/expirada/revogada)
- Formulário: usuário + data início + data fim
- Botão revogar

---

## 7. Shared Types

```typescript
// packages/shared-types/src/models/purchase-budget.ts

export type PurchaseBudgetStatus =
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'ORDERED' | 'PURCHASED' | 'RECEIVED' | 'CANCELLED';

export type BudgetPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface PurchaseBudget {
  id: string;
  budgetNumber: string;
  title: string;
  description?: string;
  justification?: string;
  priority: BudgetPriority;
  department?: string;
  supplierId?: string;
  supplierName?: string;
  status: PurchaseBudgetStatus;
  totalAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  purchasedBy?: string;
  purchasedAt?: string;
  invoiceNumber?: string;
  finalAmount?: number;
  createdBy: string;
  createdByUser?: { name: string; email: string };
  items?: PurchaseBudgetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBudgetItem {
  id: string;
  budgetId: string;
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  notes?: string;
  selectedQuoteId?: string;
  quotes?: PurchaseBudgetQuote[];
  createdAt: string;
}

export interface PurchaseBudgetQuote {
  id: string;
  itemId: string;
  supplierId: string;
  supplierName?: string;
  unitPrice: number;
  leadTimeDays?: number;
  paymentTerms?: string;
  validityDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ApprovalDelegation {
  id: string;
  delegatedBy: string;
  delegatedTo: string;
  delegatedToUser?: { name: string; email: string };
  startDate: string;
  endDate: string;
  isActive: boolean;
  revokedAt?: string;
  createdAt: string;
}

export interface CreatePurchaseBudgetDTO {
  title: string;
  description?: string;
  justification?: string;
  priority?: BudgetPriority;
  department?: string;
  items?: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }>;
}

export interface UpdatePurchaseBudgetDTO {
  title?: string;
  description?: string;
  justification?: string;
  priority?: BudgetPriority;
  department?: string;
  supplierId?: string;
}

export interface PurchaseBudgetFilters {
  page?: number;
  limit?: number;
  status?: PurchaseBudgetStatus;
  priority?: BudgetPriority;
  supplierId?: string;
  createdBy?: string;
  search?: string;
}
```

---

## 8. Permissões

### Nova página no sistema de permissões:

```json
{
  "page": "purchase_budgets",
  "actions": ["view", "create", "edit", "delete", "approve", "purchase"]
}
```

### Remoção:
- Remover `purchase_requests` das permissões
- Remover `purchase_orders` das permissões

---

## 9. Sidebar - Navegação

### Adicionar:
```
Compras (ícone: ShoppingCart)
  ├── Orçamentos    → /purchase-budgets
  ├── Novo Orçamento → /purchase-budgets/new
  └── Delegações     → /purchase-budgets/delegations  (só admin)
```

### Remover:
- Menu "Requisições de Compra"
- Menu "Ordens de Compra"

---

## 10. Notificações

| Evento | Destinatário | Tipo | Mensagem |
|--------|-------------|------|----------|
| Orçamento enviado p/ aprovação | Admins + delegados ativos | INFO | "Novo orçamento #{number} aguardando aprovação" |
| Orçamento aprovado | Criador | SUCCESS | "Seu orçamento #{number} foi aprovado" |
| Orçamento rejeitado | Criador | WARNING | "Seu orçamento #{number} foi rejeitado: {motivo}" |
| Compra realizada | Equipe estoque (STOCK) | INFO | "Compra #{number} realizada, aguardando recebimento" |
| Delegação criada | Delegado | INFO | "Você recebeu permissão para aprovar orçamentos" |
| Delegação revogada | Delegado | WARNING | "Sua delegação de aprovação foi revogada" |

---

## 11. Transições de Estado - Validações

```
DRAFT:
  → PENDING:    Todos itens devem ter >= 1 cotação, fornecedor definido
  → CANCELLED:  Sempre permitido

PENDING:
  → APPROVED:   Apenas admin OU delegado ativo
  → REJECTED:   Apenas admin OU delegado ativo (requer motivo)
  → CANCELLED:  Apenas criador ou admin

APPROVED (auto → ORDERED):
  (aprovação gera ORDERED automaticamente)

REJECTED:
  → DRAFT:      Apenas criador (reabrir para ajustes)
  → CANCELLED:  Sempre permitido

ORDERED:
  → PURCHASED:  Requer NF/recibo + data compra
  → CANCELLED:  Apenas admin

PURCHASED:
  → RECEIVED:   Via Goods Receipt (automático quando GR aprovado)
  → CANCELLED:  Não permitido

RECEIVED:
  (estado final)

CANCELLED:
  (estado final)
```

---

## 12. Ordem de Implementação

### Fase 1 - Backend Core
1. Migration SQL (tabelas + função + índices)
2. Shared types
3. Repository purchase-budgets
4. Service purchase-budgets
5. Controller purchase-budgets
6. Routes purchase-budgets

### Fase 2 - Backend Delegações + Integração
7. Repository approval-delegations
8. Service/Controller/Routes approval-delegations
9. Adaptar Goods Receipts (campo purchase_budget_id)
10. Notificações

### Fase 3 - Frontend
11. Hook usePurchaseBudgets
12. Hook useApprovalDelegations
13. PurchaseBudgetsPage (lista)
14. PurchaseBudgetFormPage (criar/editar + cotações)
15. PurchaseBudgetDetailPage (detalhe + ações)
16. ApprovalDelegationsPage
17. QuoteComparisonTable (componente)

### Fase 4 - Integração e Limpeza
18. Registrar rotas no App.tsx
19. Atualizar Sidebar
20. Atualizar permissões (JSON)
21. Remover Purchase Requests da interface
22. Remover Purchase Orders da interface
