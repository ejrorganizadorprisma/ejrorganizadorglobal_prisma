# Instruções para Atualizar App.tsx

Devido à complexidade da atualização, aqui estão as instruções para você atualizar manualmente o arquivo `App.tsx`:

## 1. Envolver TODAS as rotas existentes com `<MainLayout>`

Todas as rotas protegidas (exceto `/login`) devem estar dentro do `<MainLayout>`. Exemplo:

**Antes:**
```tsx
<Route
  path="/products"
  element={
    <ProtectedRoute>
      <ProductsPage />
    </ProtectedRoute>
  }
/>
```

**Depois:**
```tsx
<Route
  path="/products"
  element={
    <ProtectedRoute>
      <MainLayout>
        <ProductsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

## 2. Adicionar as novas rotas de manufatura

Adicione estas rotas ANTES da rota `<Route path="/" element={<Navigate to="/dashboard" />} />`:

```tsx
{/* Stock Reservations */}
<Route
  path="/stock-reservations"
  element={
    <ProtectedRoute>
      <MainLayout>
        <StockReservationsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>

{/* Purchase Orders */}
<Route
  path="/purchase-orders"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseOrdersPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/purchase-orders/new"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseOrderFormPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/purchase-orders/:id/edit"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseOrderFormPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>

{/* Goods Receipts */}
<Route
  path="/goods-receipts"
  element={
    <ProtectedRoute>
      <MainLayout>
        <GoodsReceiptsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/goods-receipts/new"
  element={
    <ProtectedRoute>
      <MainLayout>
        <GoodsReceiptFormPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>

{/* Production Orders */}
<Route
  path="/production-orders"
  element={
    <ProtectedRoute>
      <MainLayout>
        <ProductionOrdersPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/production-orders/new"
  element={
    <ProtectedRoute>
      <MainLayout>
        <ProductionOrderFormPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/production-orders/:id"
  element={
    <ProtectedRoute>
      <MainLayout>
        <ProductionOrderDetailPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

## 3. Resultado Final

Após as mudanças, o App.tsx terá:
- ✅ Sidebar visível em todas as páginas (exceto login)
- ✅ Menu de navegação lateral com todos os módulos
- ✅ Acesso fácil a todos os módulos do sistema
- ✅ Novas rotas de manufatura funcionando

## 4. Teste

Após atualizar, acesse:
- http://localhost:5173/dashboard - Deve mostrar o sidebar
- http://localhost:5173/manufacturing - Dashboard de Manufatura
- http://localhost:5173/purchase-orders - Ordens de Compra
- http://localhost:5173/production-orders - Ordens de Produção
- http://localhost:5173/stock-reservations - Reservas

---

**Ou se preferir, posso criar o arquivo App.tsx completo para você copiar e colar.**
