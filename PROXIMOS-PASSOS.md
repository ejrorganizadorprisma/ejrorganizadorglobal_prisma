# 🎯 Próximos Passos - ERP de Manufatura

**Status Atual**: Backend e Frontend CRIADOS ✅
**Servers**: API (porta 3000) e Web (porta 5173) RODANDO ✅

---

## 📋 Checklist Geral

### ✅ 1. Executar Migrations SQL
**Status**: ⏳ PENDENTE (você precisa fazer)

Acesse o **Supabase SQL Editor** e execute **NA ORDEM**:

```sql
-- 1. Migration 002 - Base BOM
-- Cole o conteúdo de: sql/migrations/002_base_bom.sql

-- 2. Migration 003 - Stock Reservations
-- Cole o conteúdo de: sql/migrations/003_stock_reservations.sql

-- 3. Migration 004 - BOM Expansion
-- Cole o conteúdo de: sql/migrations/004_bom_expansion.sql

-- 4. Migration 005 - Purchase Management
-- Cole o conteúdo de: sql/migrations/005_purchase_management.sql

-- 5. Migration 006 - Production Orders
-- Cole o conteúdo de: sql/migrations/006_production_orders.sql
```

**Link do Supabase**: https://supabase.com/dashboard/project/_/sql

---

### ⏳ 2. Adicionar Rotas no Frontend
**Status**: PENDENTE

**Arquivo**: `/home/nmaldaner/projetos/estoque/apps/web/src/App.tsx`

Adicione as seguintes rotas:

```tsx
// Imports
import StockReservationsPage from './pages/StockReservationsPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierFormPage from './pages/SupplierFormPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage';
import GoodsReceiptsPage from './pages/GoodsReceiptsPage';
import GoodsReceiptFormPage from './pages/GoodsReceiptFormPage';
import ProductionOrdersPage from './pages/ProductionOrdersPage';
import ProductionOrderFormPage from './pages/ProductionOrderFormPage';
import ProductionOrderDetailPage from './pages/ProductionOrderDetailPage';

// No Router (dentro do <Routes>):

{/* Reservas de Estoque */}
<Route path="/stock-reservations" element={<StockReservationsPage />} />

{/* Fornecedores */}
<Route path="/suppliers" element={<SuppliersPage />} />
<Route path="/suppliers/new" element={<SupplierFormPage />} />
<Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />

{/* Ordens de Compra */}
<Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
<Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
<Route path="/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />

{/* Recebimentos de Mercadorias */}
<Route path="/goods-receipts" element={<GoodsReceiptsPage />} />
<Route path="/goods-receipts/new" element={<GoodsReceiptFormPage />} />

{/* Ordens de Produção */}
<Route path="/production-orders" element={<ProductionOrdersPage />} />
<Route path="/production-orders/new" element={<ProductionOrderFormPage />} />
<Route path="/production-orders/:id" element={<ProductionOrderDetailPage />} />
```

---

### ⏳ 3. Adicionar Menu de Navegação
**Status**: PENDENTE

Adicione os novos módulos no menu lateral/principal do sistema:

```tsx
// Exemplo de como adicionar no menu

{/* Seção: Compras */}
<MenuSection title="Compras">
  <MenuItem
    to="/suppliers"
    icon={<Users />}
    label="Fornecedores"
  />
  <MenuItem
    to="/purchase-orders"
    icon={<ShoppingCart />}
    label="Ordens de Compra"
  />
  <MenuItem
    to="/goods-receipts"
    icon={<Package />}
    label="Recebimentos"
  />
</MenuSection>

{/* Seção: Produção */}
<MenuSection title="Produção">
  <MenuItem
    to="/production-orders"
    icon={<Factory />}
    label="Ordens de Produção"
  />
  <MenuItem
    to="/stock-reservations"
    icon={<Lock />}
    label="Reservas de Estoque"
  />
</MenuSection>
```

**Nota**: Adapte ao formato do seu menu existente.

---

### ⏳ 4. Testar Cada Módulo
**Status**: PENDENTE (fazer após steps 1-3)

#### 4A. Testar Fornecedores
1. Acesse `/suppliers`
2. Clique em "Novo Fornecedor"
3. Preencha os dados básicos
4. Salve e edite para adicionar endereços e contatos
5. Verifique se os dados foram salvos corretamente

#### 4B. Testar Compras
1. Crie uma Ordem de Compra
2. Adicione itens (produtos + quantidades)
3. Envie para fornecedor
4. Confirme a ordem
5. Crie um Recebimento de Mercadoria
6. Faça inspeção de qualidade
7. Aprove o recebimento
8. **Verifique se o estoque foi atualizado**

#### 4C. Testar Produção
1. Crie um produto do tipo ASSEMBLED
2. Adicione componentes ao BOM
3. Crie uma Ordem de Produção
4. Planeje a ordem
5. Libere (deve reservar componentes)
6. Inicie produção
7. Faça apontamento (consumir materiais)
8. Complete a ordem
9. **Verifique se o produto final foi adicionado ao estoque**
10. **Verifique se os componentes foram consumidos**

#### 4D. Testar Reservas
1. Acesse `/stock-reservations`
2. Crie uma reserva manual
3. Verifique que o estoque disponível diminuiu
4. Consuma a reserva
5. Verifique que o estoque disponível voltou ao normal

---

## 🔧 Troubleshooting

### Problema: Erro "relation does not exist"
**Causa**: Migrations SQL não foram executadas
**Solução**: Execute as migrations no Supabase SQL Editor (Step 1)

### Problema: Endpoint 404
**Causa**: Rotas do backend não registradas
**Solução**: As rotas já foram criadas, verifique se o servidor API está rodando

### Problema: Página não carrega
**Causa**: Rotas do frontend não adicionadas
**Solução**: Complete o Step 2 (adicionar rotas no App.tsx)

### Problema: Estoque não atualiza
**Causa**: Triggers SQL não foram criados
**Solução**: Verifique se executou todas as migrations (especialmente 005 e 006)

---

## 📊 Fluxos para Testar

### Fluxo Completo de Compra
```
1. Cadastrar Fornecedor
   ↓
2. Criar Ordem de Compra
   - Selecionar fornecedor
   - Adicionar produtos
   ↓
3. Enviar OC para fornecedor
   ↓
4. Confirmar recebimento pelo fornecedor
   ↓
5. Criar Recebimento de Mercadoria
   - Vincular à OC
   - Inspecionar qualidade
   ↓
6. Aprovar Recebimento
   ↓
✅ Estoque atualizado automaticamente!
```

### Fluxo Completo de Produção
```
1. Criar Produto ASSEMBLED
   ↓
2. Adicionar BOM (componentes necessários)
   ↓
3. Criar Ordem de Produção
   - Selecionar produto
   - Definir quantidade
   ↓
4. Liberar Ordem
   ✅ Reserva componentes automaticamente
   ↓
5. Iniciar Produção
   ↓
6. Fazer Apontamentos
   - Registrar quantidade produzida
   - Registrar refugo (se houver)
   ✅ Consome componentes do estoque
   ↓
7. Completar Produção
   ✅ Adiciona produtos finais ao estoque
   ✅ Libera reservas não utilizadas
   ↓
✅ Custos calculados automaticamente!
```

---

## 📚 Endpoints da API

### Stock Reservations
```
GET    /api/v1/stock-reservations
POST   /api/v1/stock-reservations
GET    /api/v1/stock-reservations/:id
PATCH  /api/v1/stock-reservations/:id
DELETE /api/v1/stock-reservations/:id
POST   /api/v1/stock-reservations/:id/consume
POST   /api/v1/stock-reservations/:id/cancel
```

### Suppliers
```
GET    /api/v1/suppliers
POST   /api/v1/suppliers
GET    /api/v1/suppliers/:id
PATCH  /api/v1/suppliers/:id
DELETE /api/v1/suppliers/:id
GET    /api/v1/suppliers/:id/addresses
POST   /api/v1/suppliers/:id/addresses
GET    /api/v1/suppliers/:id/contacts
POST   /api/v1/suppliers/:id/contacts
```

### Purchase Orders
```
GET    /api/v1/purchase-orders
POST   /api/v1/purchase-orders
GET    /api/v1/purchase-orders/:id
PATCH  /api/v1/purchase-orders/:id
DELETE /api/v1/purchase-orders/:id
POST   /api/v1/purchase-orders/:id/send
POST   /api/v1/purchase-orders/:id/confirm
POST   /api/v1/purchase-orders/:id/cancel
```

### Goods Receipts
```
GET    /api/v1/goods-receipts
POST   /api/v1/goods-receipts
GET    /api/v1/goods-receipts/:id
PATCH  /api/v1/goods-receipts/:id
DELETE /api/v1/goods-receipts/:id
POST   /api/v1/goods-receipts/:id/approve
POST   /api/v1/goods-receipts/:id/reject
```

### Production Orders
```
GET    /api/v1/production-orders
POST   /api/v1/production-orders
GET    /api/v1/production-orders/:id
PATCH  /api/v1/production-orders/:id
DELETE /api/v1/production-orders/:id
POST   /api/v1/production-orders/:id/release
POST   /api/v1/production-orders/:id/start
POST   /api/v1/production-orders/:id/pause
POST   /api/v1/production-orders/:id/resume
POST   /api/v1/production-orders/:id/complete
POST   /api/v1/production-orders/:id/cancel
```

---

## 🎓 Recursos Adicionais

### Documentação Completa
- `IMPLEMENTATION-STATUS.md` - Status detalhado de tudo que foi implementado
- `MANUFACTURING-IMPLEMENTATION.md` - Guia completo das migrations SQL

### Verificar Status dos Servers
```bash
# API rodando em: http://localhost:3000
# Web rodando em: http://localhost:5173

# Ver logs da API
cd /home/nmaldaner/projetos/estoque/apps/api
pnpm dev

# Ver logs do Web
cd /home/nmaldaner/projetos/estoque/apps/web
pnpm dev
```

---

## ✅ Ordem Recomendada de Implementação

1. **PRIMEIRO**: Executar Migrations SQL (Step 1) ⚠️ **CRÍTICO**
2. **SEGUNDO**: Adicionar Rotas no Frontend (Step 2)
3. **TERCEIRO**: Adicionar Menu de Navegação (Step 3)
4. **QUARTO**: Testar cada módulo (Step 4)

---

## 🎉 Resultado Final

Após completar todos os passos, você terá:

✅ Sistema completo de Fornecedores
✅ Sistema de Ordens de Compra
✅ Recebimento de Mercadorias com QC
✅ Reservas de Estoque
✅ Ordens de Produção completas
✅ Consumo automático de materiais
✅ Cálculo de custos de produção
✅ Rastreabilidade completa

**Um ERP de manufatura profissional e completo!** 🚀

---

**Boa implementação!**
