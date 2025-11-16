# Fase 3B - Ordens de Compra e Recebimento - IMPLEMENTADO

## Resumo da Implementação

A Fase 3B foi implementada com sucesso, incluindo todo o sistema de ordens de compra e recebimento de mercadorias.

## Arquivos Criados

### Repositories
1. **`/home/nmaldaner/projetos/estoque/apps/api/src/repositories/purchase-orders.repository.ts`**
   - Interface `PurchaseOrder` e `PurchaseOrderItem`
   - Geração automática de `order_number` (formato: PO202501XXXX)
   - Cálculo automático de totais (subtotal, taxas, total)
   - Métodos CRUD completos
   - `getItems(orderId)` - Busca itens da ordem
   - `addItem(orderId, item)` - Adiciona item à ordem
   - `updateItem(itemId, data)` - Atualiza item
   - `deleteItem(itemId)` - Remove item
   - `updateOrderStatus(orderId, status)` - Atualiza status
   - Recálculo automático de totais ao modificar itens

2. **`/home/nmaldaner/projetos/estoque/apps/api/src/repositories/goods-receipts.repository.ts`**
   - Interface `GoodsReceipt` e `GoodsReceiptItem`
   - Geração automática de `receipt_number` (formato: GR202501XXXX)
   - Métodos CRUD completos
   - `getItems(receiptId)` - Busca itens do recebimento
   - `addItem(receiptId, item)` - Adiciona item
   - `updateItem(itemId, data)` - Atualiza item
   - `deleteItem(itemId)` - Remove item
   - `approveItem(itemId, data)` - Aprova item com controle de qualidade
   - `approveReceipt(receiptId, approvedBy)` - Aprova recebimento (atualiza estoque via trigger)
   - Atualização automática de status de qualidade
   - Atualização automática de status da ordem de compra

### Services
3. **`/home/nmaldaner/projetos/estoque/apps/api/src/services/purchase-orders.service.ts`**
   - Validações completas de criação e atualização
   - Validação de itens (quantidade, preço, taxas)
   - Validação de transições de status
   - Cálculo automático de totais
   - Métodos de ação: `sendOrder`, `confirmOrder`, `cancelOrder`, `approveOrder`
   - Relatórios: `getOrdersBySupplier`, `getPendingOrders`, `getOrdersWithPendingDelivery`

4. **`/home/nmaldaner/projetos/estoque/apps/api/src/services/goods-receipts.service.ts`**
   - Validações completas de recebimento
   - Validação contra ordem de compra (produtos, quantidades, preços)
   - Controle de qualidade de itens
   - Validação de transições de status
   - Métodos: `inspectItem`, `approveReceipt`, `rejectReceipt`
   - Relatórios: `getReceiptsBySupplier`, `getPendingInspections`, `getReceiptsByPurchaseOrder`
   - Verifica se quantidades recebidas não excedem quantidades pedidas

### Controllers
5. **`/home/nmaldaner/projetos/estoque/apps/api/src/controllers/purchase-orders.controller.ts`**
   - CRUD completo
   - Ações: send, confirm, cancel, approve
   - Gerenciamento de itens
   - Relatórios

6. **`/home/nmaldaner/projetos/estoque/apps/api/src/controllers/goods-receipts.controller.ts`**
   - CRUD completo
   - Controle de qualidade: inspect, approve, reject
   - Gerenciamento de itens
   - Relatórios

### Routes
7. **`/home/nmaldaner/projetos/estoque/apps/api/src/routes/purchase-orders.routes.ts`**
8. **`/home/nmaldaner/projetos/estoque/apps/api/src/routes/goods-receipts.routes.ts`**
9. **Atualizado: `/home/nmaldaner/projetos/estoque/apps/api/src/routes/index.ts`**

## API Endpoints

### Purchase Orders (Ordens de Compra)

#### CRUD Básico
- `GET /api/v1/purchase-orders` - Listar ordens (paginação, filtros)
- `GET /api/v1/purchase-orders/:id` - Buscar por ID
- `GET /api/v1/purchase-orders/number/:orderNumber` - Buscar por número
- `POST /api/v1/purchase-orders` - Criar ordem
- `PATCH /api/v1/purchase-orders/:id` - Atualizar ordem
- `DELETE /api/v1/purchase-orders/:id` - Deletar ordem

#### Ações
- `POST /api/v1/purchase-orders/:id/send` - Enviar ordem ao fornecedor
- `POST /api/v1/purchase-orders/:id/confirm` - Confirmar ordem
- `POST /api/v1/purchase-orders/:id/cancel` - Cancelar ordem
- `POST /api/v1/purchase-orders/:id/approve` - Aprovar ordem
- `PATCH /api/v1/purchase-orders/:id/status` - Atualizar status

#### Itens
- `GET /api/v1/purchase-orders/:id/items` - Listar itens
- `POST /api/v1/purchase-orders/:id/items` - Adicionar item
- `PATCH /api/v1/purchase-orders/items/:itemId` - Atualizar item
- `DELETE /api/v1/purchase-orders/items/:itemId` - Remover item

#### Relatórios
- `GET /api/v1/purchase-orders/pending` - Ordens pendentes
- `GET /api/v1/purchase-orders/pending-delivery` - Entregas atrasadas
- `GET /api/v1/purchase-orders/supplier/:supplierId` - Por fornecedor

### Goods Receipts (Recebimentos)

#### CRUD Básico
- `GET /api/v1/goods-receipts` - Listar recebimentos
- `GET /api/v1/goods-receipts/:id` - Buscar por ID
- `GET /api/v1/goods-receipts/number/:receiptNumber` - Buscar por número
- `POST /api/v1/goods-receipts` - Criar recebimento
- `PATCH /api/v1/goods-receipts/:id` - Atualizar recebimento
- `DELETE /api/v1/goods-receipts/:id` - Deletar recebimento

#### Controle de Qualidade
- `POST /api/v1/goods-receipts/:id/approve` - Aprovar recebimento (atualiza estoque)
- `POST /api/v1/goods-receipts/:id/reject` - Rejeitar recebimento
- `POST /api/v1/goods-receipts/items/:itemId/inspect` - Inspecionar item
- `PATCH /api/v1/goods-receipts/:id/status` - Atualizar status

#### Itens
- `GET /api/v1/goods-receipts/:id/items` - Listar itens
- `POST /api/v1/goods-receipts/:id/items` - Adicionar item
- `PATCH /api/v1/goods-receipts/items/:itemId` - Atualizar item
- `DELETE /api/v1/goods-receipts/items/:itemId` - Remover item

#### Relatórios
- `GET /api/v1/goods-receipts/pending-inspections` - Pendentes de inspeção
- `GET /api/v1/goods-receipts/supplier/:supplierId` - Por fornecedor
- `GET /api/v1/goods-receipts/purchase-order/:purchaseOrderId` - Por ordem de compra

## Funcionalidades Implementadas

### Purchase Orders
1. **Geração automática de número** - Formato PO202501XXXX
2. **Cálculo automático de totais** - Subtotal, impostos, descontos
3. **Gestão de itens** - Adicionar, editar, remover
4. **Controle de status** - DRAFT → SENT → CONFIRMED → PARTIAL → RECEIVED
5. **Validações** - Transições de status, datas, quantidades
6. **Recálculo automático** - Ao modificar itens

### Goods Receipts
1. **Geração automática de número** - Formato GR202501XXXX
2. **Controle de qualidade** - Aceito, rejeitado, quarentena
3. **Validação contra ordem** - Produtos, quantidades, preços
4. **Atualização de estoque** - Via trigger ao aprovar
5. **Rastreabilidade** - Lote, validade
6. **Status de qualidade** - PENDING → PASSED/FAILED/PARTIAL

## Integração com Database

### Triggers Automáticos (já existentes na migration)
1. **`update_stock_on_receipt`** - Atualiza estoque ao aceitar itens
2. **`update_po_item_received_qty`** - Atualiza quantidade recebida na ordem

### Atualização de Status
- **Purchase Order**: Atualizado automaticamente baseado nas quantidades recebidas
  - PARTIAL: Quando alguns itens foram recebidos
  - RECEIVED: Quando todos os itens foram recebidos

- **Goods Receipt**: Status de qualidade atualizado baseado nos itens
  - PENDING: Alguns itens não inspecionados
  - PASSED: Todos aprovados
  - FAILED: Todos rejeitados
  - PARTIAL: Mix de aprovados/rejeitados

## Validações Implementadas

### Purchase Orders
- Fornecedor obrigatório
- Pelo menos 1 item
- Quantidade > 0
- Preço >= 0
- Taxa de imposto 0-100%
- Desconto 0-100%
- Data de entrega >= data da ordem
- Transições de status válidas
- Apenas DRAFT e CANCELLED podem ser deletados

### Goods Receipts
- Fornecedor obrigatório
- Pelo menos 1 item
- Quantidade >= 0
- Validação contra ordem de compra (se existir)
- Quantidade recebida <= quantidade pedida
- Produtos devem corresponder
- Todos itens inspecionados antes de aprovar
- Motivo obrigatório ao rejeitar
- Não permite modificar após aprovação

## Fluxo de Trabalho

### 1. Criar Ordem de Compra
```
POST /api/v1/purchase-orders
{
  "supplierId": "...",
  "expectedDeliveryDate": "2025-02-01",
  "items": [
    {
      "productId": "...",
      "quantity": 10,
      "unitPrice": 5000,
      "taxRate": 10
    }
  ]
}
```

### 2. Enviar Ordem ao Fornecedor
```
POST /api/v1/purchase-orders/:id/send
```

### 3. Receber Mercadorias
```
POST /api/v1/goods-receipts
{
  "purchaseOrderId": "...",
  "supplierId": "...",
  "invoiceNumber": "NF-12345",
  "items": [
    {
      "purchaseOrderItemId": "...",
      "productId": "...",
      "quantityReceived": 10,
      "lotNumber": "LOTE-001"
    }
  ]
}
```

### 4. Inspecionar Itens
```
POST /api/v1/goods-receipts/items/:itemId/inspect
{
  "quantityAccepted": 9,
  "quantityRejected": 1,
  "qualityStatus": "APPROVED",
  "rejectionReason": "1 item danificado"
}
```

### 5. Aprovar Recebimento
```
POST /api/v1/goods-receipts/:id/approve
{
  "approvedBy": "user123"
}
```
**Resultado**: Estoque atualizado automaticamente via trigger

## Próximos Passos

1. **Frontend**: Criar interfaces para gerenciar ordens e recebimentos
2. **Relatórios**: Adicionar relatórios de compras e recebimentos
3. **Notificações**: Alertas de entregas atrasadas
4. **Dashboard**: KPIs de compras e recebimentos
5. **Integração**: Conectar com sistema de pagamentos

## Observações

- Todas as rotas requerem autenticação
- Valores monetários em centavos (ex: 5000 = R$ 50,00)
- Datas em formato ISO 8601
- Suporte a paginação em todas as listagens
- Tratamento de erros completo
- Logs de auditoria via created_by, approved_by, inspected_by
